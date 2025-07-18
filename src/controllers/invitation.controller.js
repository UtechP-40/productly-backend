import invitationService from "../services/invitation.service.js";
import authService from "../services/auth.service.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

/**
 * Invitation Controller
 * Handles invitation-related API endpoints
 */
class InvitationController {
  /**
   * Create a new invitation
   * @route POST /api/v1/invitations
   * @description Creates a new user invitation and sends an email
   * @access Private (requires authentication)
   */
  createInvitation = asyncHandler(async (req, res) => {
    const { email, organizationId, roleId, message } = req.body;

    if (!email || !organizationId || !roleId) {
      throw new ApiError(400, "Email, organization ID, and role ID are required");
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new ApiError(400, "Invalid email format");
    }

    const metadata = {
      userAgent: req.deviceInfo?.userAgent,
      ipAddress: req.deviceInfo?.ip,
      invitationSource: req.body.source || "ADMIN_PANEL",
      customMessage: message || null
    };

    const invitation = await invitationService.createInvitation(
      {
        email,
        organizationId,
        roleId,
        invitedById: req.user.id
      },
      metadata
    );

    return res.status(201).json(
      new ApiResponse(201, invitation, "Invitation created and email sent successfully")
    );
  });

  /**
   * Get all invitations for an organization
   * @route GET /api/v1/invitations/organization/:organizationId
   * @description Retrieves all invitations for a specific organization with filtering options
   * @access Private (requires authentication)
   */
  getOrganizationInvitations = asyncHandler(async (req, res) => {
    const { organizationId } = req.params;
    const { status, page, limit, sortBy, sortOrder } = req.query;

    // Validate organization ID
    if (!organizationId) {
      throw new ApiError(400, "Organization ID is required");
    }

    // Check if user has access to this organization
    // This would typically be handled by middleware, but adding an extra check here
    if (req.user.organization.toString() !== organizationId) {
      throw new ApiError(403, "You don't have permission to access invitations for this organization");
    }

    const result = await invitationService.getOrganizationInvitations(
      organizationId,
      {
        status,
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 50,
        sortBy: sortBy || 'createdAt',
        sortOrder: sortOrder || 'desc'
      }
    );

    return res.status(200).json(
      new ApiResponse(200, result, "Invitations retrieved successfully")
    );
  });

  /**
   * Get invitation by ID
   * @route GET /api/v1/invitations/:id
   * @description Retrieves a specific invitation by ID
   * @access Private (requires authentication)
   */
  getInvitationById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!id) {
      throw new ApiError(400, "Invitation ID is required");
    }

    const invitation = await invitationService.getInvitationById(id);

    // Check if user has access to this invitation
    if (req.user.organization.toString() !== invitation.organization._id.toString()) {
      throw new ApiError(403, "You don't have permission to access this invitation");
    }

    return res.status(200).json(
      new ApiResponse(200, invitation, "Invitation retrieved successfully")
    );
  });

  /**
   * Resend invitation
   * @route POST /api/v1/invitations/:id/resend
   * @description Resends an invitation email for a pending invitation
   * @access Private (requires authentication)
   */
  resendInvitation = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { customMessage } = req.body;

    if (!id) {
      throw new ApiError(400, "Invitation ID is required");
    }

    // Get the invitation first to check permissions
    const existingInvitation = await invitationService.getInvitationById(id);
    
    // Check if user has access to this invitation
    if (req.user.organization.toString() !== existingInvitation.organization._id.toString()) {
      throw new ApiError(403, "You don't have permission to resend this invitation");
    }

    // Add custom message if provided
    const metadata = customMessage ? { customMessage } : {};
    
    const invitation = await invitationService.resendInvitation(id, req.user.id);

    return res.status(200).json(
      new ApiResponse(200, invitation, "Invitation resent successfully")
    );
  });

  /**
   * Revoke invitation
   * @route POST /api/v1/invitations/:id/revoke
   * @description Revokes a pending invitation
   * @access Private (requires authentication)
   */
  revokeInvitation = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;

    if (!id) {
      throw new ApiError(400, "Invitation ID is required");
    }

    // Get the invitation first to check permissions
    const existingInvitation = await invitationService.getInvitationById(id);
    
    // Check if user has access to this invitation
    if (req.user.organization.toString() !== existingInvitation.organization._id.toString()) {
      throw new ApiError(403, "You don't have permission to revoke this invitation");
    }

    const invitation = await invitationService.revokeInvitation(id, req.user.id);

    return res.status(200).json(
      new ApiResponse(200, invitation, "Invitation revoked successfully")
    );
  });

  /**
   * Verify invitation token
   * @route GET /api/v1/invitations/verify/:token
   * @description Verifies an invitation token and returns invitation details
   * @access Public
   */
  verifyInvitation = asyncHandler(async (req, res) => {
    const { token } = req.params;

    if (!token) {
      throw new ApiError(400, "Invitation token is required");
    }

    const invitation = await invitationService.verifyInvitationToken(token);

    // Return limited information for security
    const safeInvitation = {
      email: invitation.email,
      organization: {
        name: invitation.organization.name,
        _id: invitation.organization._id
      },
      role: {
        name: invitation.role.name,
        _id: invitation.role._id
      },
      expiresAt: invitation.expiresAt,
      status: invitation.status
    };

    return res.status(200).json(
      new ApiResponse(200, safeInvitation, "Invitation verified successfully")
    );
  });

  /**
   * Bulk create invitations
   * @route POST /api/v1/invitations/bulk
   * @description Creates multiple invitations at once
   * @access Private (requires authentication)
   */
  bulkCreateInvitations = asyncHandler(async (req, res) => {
    const { invitations, organizationId } = req.body;

    if (!Array.isArray(invitations) || invitations.length === 0) {
      throw new ApiError(400, "Valid invitations array is required");
    }

    if (!organizationId) {
      throw new ApiError(400, "Organization ID is required");
    }

    // Check if user has access to this organization
    if (req.user.organization.toString() !== organizationId) {
      throw new ApiError(403, "You don't have permission to create invitations for this organization");
    }

    const results = {
      successful: [],
      failed: []
    };

    // Process each invitation
    for (const invitation of invitations) {
      try {
        const { email, roleId, message } = invitation;
        
        if (!email || !roleId) {
          results.failed.push({
            email: email || 'Unknown',
            error: 'Missing required fields'
          });
          continue;
        }

        const metadata = {
          userAgent: req.deviceInfo?.userAgent,
          ipAddress: req.deviceInfo?.ip,
          invitationSource: 'BULK_INVITE',
          customMessage: message || null
        };

        const createdInvitation = await invitationService.createInvitation(
          {
            email,
            organizationId,
            roleId,
            invitedById: req.user.id
          },
          metadata
        );

        results.successful.push({
          email,
          invitationId: createdInvitation._id
        });
      } catch (error) {
        results.failed.push({
          email: invitation.email || 'Unknown',
          error: error.message || 'Unknown error'
        });
      }
    }

    return res.status(207).json(
      new ApiResponse(207, results, `Processed ${invitations.length} invitations: ${results.successful.length} successful, ${results.failed.length} failed`)
    );
  });

  /**
   * Check invitation status
   * @route GET /api/v1/invitations/status/:email
   * @description Checks if a user has a pending invitation
   * @access Private (requires authentication)
   */
  checkInvitationStatus = asyncHandler(async (req, res) => {
    const { email } = req.params;
    const { organizationId } = req.query;

    if (!email) {
      throw new ApiError(400, "Email is required");
    }

    if (!organizationId) {
      throw new ApiError(400, "Organization ID is required");
    }

    // Check if user has access to this organization
    if (req.user.organization.toString() !== organizationId) {
      throw new ApiError(403, "You don't have permission to check invitations for this organization");
    }

    // Find pending invitation for this email in the organization
    const invitation = await invitationService.findPendingInvitation(email, organizationId);

    if (!invitation) {
      return res.status(404).json(
        new ApiResponse(404, null, "No pending invitation found for this email")
      );
    }

    return res.status(200).json(
      new ApiResponse(200, {
        invitationId: invitation._id,
        status: invitation.status,
        expiresAt: invitation.expiresAt
      }, "Pending invitation found")
    );
  });
}

export default new InvitationController();