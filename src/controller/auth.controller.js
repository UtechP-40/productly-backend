import { User } from "../models/user.model.js";
import authService from "../services/auth.service.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";

/**
 * Set authentication cookies in the response
 * @param {Object} res - Express response object
 * @param {Object} tokens - Object containing tokens
 */
const setAuthCookies = (res, tokens) => {
  const { accessToken, refreshToken, sessionToken } = tokens;
  
  // Common cookie options
  const commonOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict"
  };
  
  // Set access token cookie (short-lived)
  res.cookie("accessToken", accessToken, {
    ...commonOptions,
    maxAge: 15 * 60 * 1000 // 15 minutes
  });
  
  // Set refresh token cookie (long-lived)
  res.cookie("refreshToken", refreshToken, {
    ...commonOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });
  
  // Set session token cookie (long-lived)
  res.cookie("sessionToken", sessionToken, {
    ...commonOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });
};

/**
 * Clear authentication cookies
 * @param {Object} res - Express response object
 */
const clearAuthCookies = (res) => {
  const commonOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict"
  };
  
  res.clearCookie("accessToken", commonOptions);
  res.clearCookie("refreshToken", commonOptions);
  res.clearCookie("sessionToken", commonOptions);
};

const authController = {
  /**
   * Login user with email and password
   * @route POST /api/v1/auth/login
   */
  login: asyncHandler(async (req, res) => {
    const { email, password, rememberMe } = req.body;
    
    // Validate request
    if (!email || !password) {
      throw new ApiError(400, "Email and password are required");
    }
    
    // Authenticate user
    const result = await authService.login(email, password, req.deviceInfo);
    
    // Set authentication cookies
    setAuthCookies(res, {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      sessionToken: result.sessionToken
    });
    
    // Return user data
    return res.status(200).json(
      new ApiResponse(200, {
        user: result.user,
        accessToken: result.accessToken
      }, "Login successful")
    );
  }),
  
  /**
   * Register a new user (for invited users)
   * @route POST /api/v1/auth/register
   */
  register: asyncHandler(async (req, res) => {
    const { firstName, lastName, password, invitationToken } = req.body;
    
    // Validate request
    if (!firstName || !lastName || !password || !invitationToken) {
      throw new ApiError(400, "First name, last name, password, and invitation token are required");
    }
    
    // Register user from invitation
    const result = await authService.registerFromInvitation(
      { firstName, lastName, password },
      invitationToken,
      req.deviceInfo
    );
    
    // Set authentication cookies
    setAuthCookies(res, {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      sessionToken: result.sessionToken
    });
    
    // Return user data
    return res.status(201).json(
      new ApiResponse(201, {
        user: result.user,
        accessToken: result.accessToken
      }, "Registration successful")
    );
  }),
  
  /**
   * Logout user
   * @route POST /api/v1/auth/logout
   */
  logout: asyncHandler(async (req, res) => {
    const sessionToken = req.cookies?.sessionToken;
    const allSessions = req.body?.allSessions === true;
    
    // Revoke session(s)
    await authService.logout(sessionToken, allSessions);
    
    // Clear cookies
    clearAuthCookies(res);
    
    return res.status(200).json(
      new ApiResponse(200, {}, "Logout successful")
    );
  }),
  
  /**
   * Refresh authentication tokens
   * @route POST /api/v1/auth/refresh-token
   */
  refreshToken: asyncHandler(async (req, res) => {
    const refreshToken = req.cookies?.refreshToken;
    
    if (!refreshToken) {
      throw new ApiError(401, "Refresh token is required");
    }
    
    // Refresh tokens
    const tokens = await authService.refreshTokens(refreshToken, req.deviceInfo);
    
    // Set new cookies
    setAuthCookies(res, tokens);
    
    return res.status(200).json(
      new ApiResponse(200, {
        accessToken: tokens.accessToken
      }, "Token refreshed successfully")
    );
  }),
  
  /**
   * Get current authenticated user
   * @route GET /api/v1/auth/me
   */
  getCurrentUser: asyncHandler(async (req, res) => {
    // User is already attached to req by verifyJWT middleware
    return res.status(200).json(
      new ApiResponse(200, {
        user: req.user
      }, "User retrieved successfully")
    );
  }),
  
  /**
   * Get all active sessions for the current user
   * @route GET /api/v1/auth/sessions
   */
  getUserSessions: asyncHandler(async (req, res) => {
    const sessions = await authService.getUserSessions(req.user._id);
    
    return res.status(200).json(
      new ApiResponse(200, {
        sessions,
        currentSessionId: req.session?._id
      }, "User sessions retrieved successfully")
    );
  }),
  
  /**
   * Revoke a specific session
   * @route DELETE /api/v1/auth/sessions/:sessionId
   */
  revokeSession: asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    
    // Revoke the session
    await authService.revokeSession(sessionId, req.user._id);
    
    return res.status(200).json(
      new ApiResponse(200, {}, "Session revoked successfully")
    );
  }),
  
  /**
   * Revoke all sessions except the current one
   * @route DELETE /api/v1/auth/sessions
   */
  revokeAllSessions: asyncHandler(async (req, res) => {
    // Get current session ID
    const currentSessionId = req.session?._id;
    
    // Revoke all other sessions
    await authService.revokeAllSessions(req.user._id, currentSessionId);
    
    return res.status(200).json(
      new ApiResponse(200, {}, "All other sessions revoked successfully")
    );
  })
};

export default authController;