import { Invitation } from "../models/invitation.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import emailService from "./email.service.js";
import crypto from "crypto";

/**
 * Invitation Service
 * Handles user invitation management, token generation, and email sending
 */
class InvitationService {
  /**
   * Create a new invitation
   * @param {Object} invitationData - Invitation data
   * @param {string} invitationData.email - Email of the invited user
   * @param {string} invitationData.organizationId - Organization ID
   * @param {string} invitationData.roleId - Role ID to assign
   * @param {string} invitationData.invitedById - User ID of the inviter
   * @param {Object} metadata - Additional metadata
   * @returns {Object} Created invitation
   */
  async createInvitation(invitationData, metadata = {}) {
    try {
      const { email, organizationId, roleId, invitedById } = invitationData;

      if (!email || !organizationId || !roleId || !invitedById) {
        throw new ApiError(400, "Missing required invitation fields");
      }

      // Check if user already exists with this email
      const existingUser = await User.findOne({ email, organization: organizationId });
      if (existingUser) {
        throw new ApiError(409, "User with this email already exists in the organization");
      }

      // Check for existing pending invitation
      const existingInvitation = await Invitation.findOne({
        email,
        organization: organizationId,
        status: "PENDING"
      });

      if (existingInvitation) {
        // If invitation exists but is about to expire, extend it
        if (existingInvitation.expiresAt < new Date(Date.now() + 24 * 60 * 60 * 1000)) {
          await existingInvitation.extendExpiry();
          return existingInvitation;
        }
        return existingInvitation;
      }

      // Create new invitation
      const invitation = new Invitation({
        email,
        organization: organizationId,
        role: roleId,
        invitedBy: invitedById,
        metadata: {
          ...metadata,
          invitationSource: metadata.invitationSource || "ADMIN_PANEL"
        }
      });

      await invitation.save();

      // Send invitation email
      await this.sendInvitationEmail(invitation);

      return invitation;
    } catch (error) {
      throw error.statusCode ? error : new ApiError(500, "Failed to create invitation", error);
    }
  }

  /**
   * Send invitation email
   * @param {Object} invitation - Invitation document
   * @returns {boolean} Success status
   */
  async sendInvitationEmail(invitation) {
    try {
      // Populate related fields if not already populated
      if (!invitation.organization.name) {
        await invitation.populate("organization role invitedBy");
      }

      const invitationLink = `${process.env.FRONTEND_URL}/auth/register?token=${invitation.token}`;
      
      const emailData = {
        to: invitation.email,
        subject: `Invitation to join ${invitation.organization.name}`,
        template: "invitation",
        context: {
          invitationLink,
          organizationName: invitation.organization.name,
          roleName: invitation.role.name,
          inviterName: `${invitation.invitedBy.firstName || ""} ${invitation.invitedBy.lastName || ""}`.trim(),
          expiryDate: invitation.expiresAt.toLocaleDateString(),
          token: invitation.token
        }
      };

      await emailService.sendEmail(emailData);
      return true;
    } catch (error) {
      console.error("Failed to send invitation email:", error);
      throw new ApiError(500, "Failed to send invitation email", error);
    }
  }

  /**
   * Verify invitation token
   * @param {string} token - Invitation token
   * @returns {Object} Verified invitation
   */
  async verifyInvitationToken(token) {
    try {
      if (!token) {
        throw new ApiError(400, "Invitation token is required");
      }

      const invitation = await Invitation.findValidByToken(token);

      if (!invitation) {
        throw new ApiError(404, "Invalid or expired invitation token");
      }

      return invitation;
    } catch (error) {
      throw error.statusCode ? error : new ApiError(500, "Failed to verify invitation token", error);
    }
  }

  /**
   * Accept invitation and create user
   * @param {string} token - Invitation token
   * @param {Object} userData - User data for registration
   * @returns {Object} Created user
   */
  async acceptInvitation(token, userData) {
    try {
      const invitation = await this.verifyInvitationToken(token);

      // Create user with invitation data
      const user = new User({
        email: invitation.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        password: userData.password,
        organization: invitation.organization._id,
        organizationRole: invitation.role._id,
        invitedBy: invitation.invitedBy._id,
        isActive: true
      });

      await user.save();

      // Mark invitation as accepted
      await invitation.accept();

      return user;
    } catch (error) {
      throw error.statusCode ? error : new ApiError(500, "Failed to accept invitation", error);
    }
  }

  /**
   * Resend invitation email
   * @param {string} invitationId - Invitation ID
   * @param {string} userId - User ID of the requester (for authorization)
   * @returns {Object} Updated invitation
   */
  async resendInvitation(invitationId, userId) {
    try {
      const invitation = await Invitation.findById(invitationId)
        .populate("organization role invitedBy");

      if (!invitation) {
        throw new ApiError(404, "Invitation not found");
      }

      // Check if user has permission to resend (either the inviter or admin)
      if (invitation.invitedBy.toString() !== userId.toString()) {
        // Additional permission check would go here
        // For now, we'll allow it if the user is from the same organization
      }

      if (invitation.status !== "PENDING") {
        throw new ApiError(400, `Cannot resend invitation with status: ${invitation.status}`);
      }

      // Extend expiry if needed
      if (invitation.expiresAt < new Date(Date.now() + 24 * 60 * 60 * 1000)) {
        await invitation.extendExpiry();
      }

      // Send invitation email
      await this.sendInvitationEmail(invitation);

      return invitation;
    } catch (error) {
      throw error.statusCode ? error : new ApiError(500, "Failed to resend invitation", error);
    }
  }

  /**
   * Revoke invitation
   * @param {string} invitationId - Invitation ID
   * @param {string} userId - User ID of the requester (for authorization)
   * @returns {Object} Updated invitation
   */
  async revokeInvitation(invitationId, userId) {
    try {
      const invitation = await Invitation.findById(invitationId);

      if (!invitation) {
        throw new ApiError(404, "Invitation not found");
      }

      // Check if user has permission to revoke
      if (invitation.invitedBy.toString() !== userId.toString()) {
        // Additional permission check would go here
        // For now, we'll allow it if the user is from the same organization
      }

      if (invitation.status !== "PENDING") {
        throw new ApiError(400, `Cannot revoke invitation with status: ${invitation.status}`);
      }

      // Revoke the invitation
      await invitation.revoke(userId);

      return invitation;
    } catch (error) {
      throw error.statusCode ? error : new ApiError(500, "Failed to revoke invitation", error);
    }
  }

  /**
   * Get invitations by organization
   * @param {string} organizationId - Organization ID
   * @param {Object} options - Query options
   * @returns {Array} List of invitations
   */
  async getOrganizationInvitations(organizationId, options = {}) {
    try {
      const { status, limit = 50, page = 1 } = options;
      
      const query = { organization: organizationId };
      if (status && status !== "all") {
        query.status = status.toUpperCase();
      }

      const skip = (page - 1) * limit;
      
      const invitations = await Invitation.find(query)
        .populate("role invitedBy", "name firstName lastName")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await Invitation.countDocuments(query);

      return {
        invitations,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      throw new ApiError(500, "Failed to retrieve organization invitations", error);
    }
  }

  /**
   * Clean up expired invitations
   * @returns {number} Number of invitations cleaned up
   */
  async cleanupExpiredInvitations() {
    try {
      const result = await Invitation.cleanupExpired();
      return result.modifiedCount || 0;
    } catch (error) {
      throw new ApiError(500, "Failed to clean up expired invitations", error);
    }
  }

  /**
   * Get invitation by ID
   * @param {string} invitationId - Invitation ID
   * @returns {Object} Invitation document
   */
  async getInvitationById(invitationId) {
    try {
      const invitation = await Invitation.findById(invitationId)
        .populate("organization role invitedBy");

      if (!invitation) {
        throw new ApiError(404, "Invitation not found");
      }

      return invitation;
    } catch (error) {
      throw error.statusCode ? error : new ApiError(500, "Failed to retrieve invitation", error);
    }
  }
}

export default new InvitationService();