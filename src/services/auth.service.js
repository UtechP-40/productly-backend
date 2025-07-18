import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { User } from "../models/user.model.js";
import { Session } from "../models/session.model.js";
import { ApiError } from "../utils/ApiError.js";
import checkPasswordStrength from "../utils/checkPasswordStrength.js";
import invitationService from "./invitation.service.js";

/**
 * Authentication Service
 * Handles user authentication, session management, and security features
 */
class AuthService {
  /**
   * Generate JWT tokens for authentication
   * @param {Object} user - User document
   * @param {Object} deviceInfo - Information about the user's device
   * @returns {Object} Object containing access token, refresh token and session
   */
  async generateTokens(user, deviceInfo = {}) {
    try {
      // Generate JWT access token
      const accessToken = jwt.sign(
        {
          id: user._id,
          email: user.email,
          role: user.organizationRole
        },
        process.env.ACCESS_TOKEN_SECRATE,
        { expiresIn: process.env.ACCESS_TOKEN_EXPIRY || "15m" }
      );

      // Create a new session
      const session = new Session({
        userId: user._id,
        deviceInfo,
        loginMethod: deviceInfo.loginMethod || "PASSWORD"
      });

      // Save session to database
      await session.save();

      // Update user's last login time
      await User.findByIdAndUpdate(user._id, {
        lastLoginAt: new Date(),
        $push: {
          loginLogs: {
            device: deviceInfo.userAgent,
            ip: deviceInfo.ip,
            location: deviceInfo.location,
            time: new Date()
          }
        }
      });

      return {
        accessToken,
        refreshToken: session.refreshToken,
        sessionToken: session.sessionToken,
        session
      };
    } catch (error) {
      throw new ApiError(500, "Error generating authentication tokens", error);
    }
  }

  /**
   * Validate user credentials and authenticate
   * @param {string} email - User email
   * @param {string} password - User password
   * @param {Object} deviceInfo - Information about the user's device
   * @returns {Object} Object containing user and tokens
   */
  async login(email, password, deviceInfo = {}) {
    try {
      // Find user by email
      const user = await User.findOne({ email }).select("+password");

      if (!user) {
        throw new ApiError(401, "Invalid email or password");
      }

      // Check if user is active
      if (!user.isActive) {
        throw new ApiError(403, "Account is disabled. Please contact support.");
      }

      // Verify password
      const isPasswordValid = await user.isPasswordCorrect(password);
      if (!isPasswordValid) {
        throw new ApiError(401, "Invalid email or password");
      }

      // Generate tokens
      const tokens = await this.generateTokens(user, deviceInfo);

      // Return user and tokens (excluding password)
      const userWithoutPassword = user.toObject();
      delete userWithoutPassword.password;

      return {
        user: userWithoutPassword,
        ...tokens
      };
    } catch (error) {
      throw error.statusCode ? error : new ApiError(500, "Login failed", error);
    }
  }

  /**
   * Refresh authentication tokens using refresh token
   * @param {string} refreshToken - Refresh token
   * @param {Object} deviceInfo - Information about the user's device
   * @returns {Object} Object containing new tokens
   */
  async refreshTokens(refreshToken, deviceInfo = {}) {
    try {
      if (!refreshToken) {
        throw new ApiError(401, "Refresh token is required");
      }

      // Find session by refresh token
      const session = await Session.findByRefreshToken(refreshToken);

      if (!session || !session.isRefreshValid()) {
        throw new ApiError(401, "Invalid or expired refresh token");
      }

      // Get user from session
      const user = await User.findById(session.userId);

      if (!user || !user.isActive) {
        throw new ApiError(403, "User account is inactive or not found");
      }

      // Refresh the session with new tokens
      await session.refresh();

      // Generate new access token
      const accessToken = jwt.sign(
        {
          id: user._id,
          email: user.email,
          role: user.organizationRole
        },
        process.env.ACCESS_TOKEN_SECRATE,
        { expiresIn: process.env.ACCESS_TOKEN_EXPIRY || "15m" }
      );

      // Update device info if provided
      if (deviceInfo && Object.keys(deviceInfo).length > 0) {
        session.deviceInfo = {
          ...session.deviceInfo,
          ...deviceInfo
        };
        await session.save();
      }

      return {
        accessToken,
        refreshToken: session.refreshToken,
        sessionToken: session.sessionToken
      };
    } catch (error) {
      throw error.statusCode ? error : new ApiError(500, "Token refresh failed", error);
    }
  }

  /**
   * Validate a session token
   * @param {string} sessionToken - Session token
   * @returns {Object} Session object if valid
   */
  async validateSession(sessionToken) {
    try {
      if (!sessionToken) {
        throw new ApiError(401, "Session token is required");
      }

      // Find active session by token
      const session = await Session.findActiveByToken(sessionToken);

      if (!session || !session.isValid()) {
        throw new ApiError(401, "Invalid or expired session");
      }

      // Update last accessed time
      await session.updateLastAccessed();

      return session;
    } catch (error) {
      throw error.statusCode ? error : new ApiError(500, "Session validation failed", error);
    }
  }

  /**
   * Logout user by revoking their session
   * @param {string} sessionToken - Session token to revoke
   * @param {boolean} allSessions - Whether to revoke all sessions for the user
   * @returns {boolean} Success status
   */
  async logout(sessionToken, allSessions = false) {
    try {
      if (!sessionToken) {
        throw new ApiError(400, "Session token is required");
      }

      // Find session by token
      const session = await Session.findOne({ sessionToken, isActive: true });

      if (!session) {
        return true; // Session already inactive, consider logout successful
      }

      if (allSessions) {
        // Revoke all sessions for this user
        await Session.revokeAllForUser(session.userId);
      } else {
        // Revoke only this session
        await session.revoke();
      }

      return true;
    } catch (error) {
      throw error.statusCode ? error : new ApiError(500, "Logout failed", error);
    }
  }

  /**
   * Validate password strength
   * @param {string} password - Password to validate
   * @param {Object} options - Validation options
   * @returns {Object} Validation result
   */
  validatePasswordStrength(password, options = {}) {
    const result = checkPasswordStrength(password);

    // Default minimum score is 3 (0-4 scale, where 4 is strongest)
    const minScore = options.minScore || 3;

    if (result.score < minScore) {
      throw new ApiError(400, "Password is too weak", {
        score: result.score,
        feedback: result.feedback,
        requiredScore: minScore
      });
    }

    return result;
  }

  /**
   * Get all active sessions for a user
   * @param {string} userId - User ID
   * @returns {Array} List of active sessions
   */
  async getUserSessions(userId) {
    try {
      if (!userId) {
        throw new ApiError(400, "User ID is required");
      }

      const sessions = await Session.getActiveSessionsForUser(userId);
      return sessions;
    } catch (error) {
      throw error.statusCode ? error : new ApiError(500, "Failed to retrieve user sessions", error);
    }
  }

  /**
   * Revoke a specific session
   * @param {string} sessionId - Session ID to revoke
   * @param {string} userId - User ID (for authorization)
   * @returns {boolean} Success status
   */
  async revokeSession(sessionId, userId) {
    try {
      if (!sessionId || !userId) {
        throw new ApiError(400, "Session ID and User ID are required");
      }

      // Find session and verify ownership
      const session = await Session.findById(sessionId);

      if (!session) {
        throw new ApiError(404, "Session not found");
      }

      if (session.userId.toString() !== userId.toString()) {
        throw new ApiError(403, "Not authorized to revoke this session");
      }

      // Revoke the session
      await session.revoke();
      return true;
    } catch (error) {
      throw error.statusCode ? error : new ApiError(500, "Failed to revoke session", error);
    }
  }

  /**
   * Check if a device is new for this user
   * @param {string} userId - User ID
   * @param {Object} deviceInfo - Device information
   * @returns {boolean} Whether the device is new
   */
  async isNewDevice(userId, deviceInfo) {
    try {
      // Find sessions with matching device fingerprint
      const existingSessions = await Session.find({
        userId,
        'deviceInfo.userAgent': deviceInfo.userAgent,
        'deviceInfo.ip': deviceInfo.ip
      });

      return existingSessions.length === 0;
    } catch (error) {
      // Default to treating as new device on error
      console.error("Error checking device history:", error);
      return true;
    }
  }

  /**
   * Clean up expired sessions
   * @returns {number} Number of sessions cleaned up
   */
  async cleanupExpiredSessions() {
    try {
      const result = await Session.cleanupExpired();
      return result.modifiedCount || 0;
    } catch (error) {
      throw new ApiError(500, "Failed to clean up expired sessions", error);
    }
  }

  /**
   * Revoke all sessions for a user except the current one
   * @param {string} userId - User ID
   * @param {string} currentSessionId - Current session ID to exclude from revocation
   * @returns {boolean} Success status
   */
  async revokeAllSessions(userId, currentSessionId = null) {
    try {
      if (!userId) {
        throw new ApiError(400, "User ID is required");
      }

      // Revoke all sessions except the current one
      await Session.revokeAllForUser(userId, currentSessionId);
      return true;
    } catch (error) {
      throw error.statusCode ? error : new ApiError(500, "Failed to revoke sessions", error);
    }
  }

  /**
   * Register a new user from an invitation
   * @param {Object} userData - User registration data
   * @param {string} userData.firstName - User's first name
   * @param {string} userData.lastName - User's last name
   * @param {string} userData.password - User's password
   * @param {string} invitationToken - Invitation token
   * @param {Object} deviceInfo - Information about the user's device
   * @returns {Object} Object containing user and tokens
   */
  async registerFromInvitation(userData, invitationToken, deviceInfo = {}) {
    try {
      const { firstName, lastName, password } = userData;

      if (!firstName || !lastName || !password || !invitationToken) {
        throw new ApiError(400, "First name, last name, password, and invitation token are required");
      }

      // Validate password strength
      this.validatePasswordStrength(password);

      // Verify and accept invitation
      const user = await invitationService.acceptInvitation(invitationToken, {
        firstName,
        lastName,
        password
      });

      // Generate tokens for the new user
      const tokens = await this.generateTokens(user, {
        ...deviceInfo,
        loginMethod: "REGISTRATION"
      });

      // Return user and tokens (excluding password)
      const userWithoutPassword = user.toObject();
      delete userWithoutPassword.password;

      return {
        user: userWithoutPassword,
        ...tokens
      };
    } catch (error) {
      throw error.statusCode ? error : new ApiError(500, "Registration failed", error);
    }
  }
}

export default new AuthService();