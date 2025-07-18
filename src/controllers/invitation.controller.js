import invitationService from "../services/invitation.service.js";
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
   */
  createInvitation = asyncHandler(async (req, res) => {
    const { email, organizationId, roleId } = req.body;

    if (!email || !organizationId || !roleId) {
      throw new ApiError(400, "Email, organization ID, and role ID are required");
    }

    const metadata = {
      userAgent: req.deviceInfo?.userAgent,
      ipAddress: req.deviceInfo?.ip,
      invitationSource: req.body.source || "ADMIN_PANEL"
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
      new ApiResponse(201, invitation, "Invitation created successfully")
    );
  });

  /**
   * Get all invitations for an organization
   */
  getOrganizationInvitations = asyncHandler(async (req, res) => {
    const { organizationId } = req.params;
    const { status, page, limit } = req.query;

    const result = await invitationService.getOrganizationInvitations(
      organizationId,
      {
        status,
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 50
      }
    );

    return res.status(200).json(
      new ApiResponse(200, result, "Invitations retrieved successfully")
    );
  });

  /**
   * Get invitation by ID
   */
  getInvitationById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const invitation = await invitationService.getInvitationById(id);

    return res.status(200).json(
      new ApiResponse(200, invitation, "Invitation retrieved successfully")
    );
  });

  /**
   * Resend invitation
   */
  resendInvitation = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const invitation = await invitationService.resendInvitation(id, req.user.id);

    return res.status(200).json(
      new ApiResponse(200, invitation, "Invitation resent successfully")
    );
  });

  /**
   * Revoke invitation
   */
  revokeInvitation = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const invitation = await invitationService.revokeInvitation(id, req.user.id);

    return res.status(200).json(
      new ApiResponse(200, invitation, "Invitation revoked successfully")
    );
  });

  /**
   * Verify invitation token
   */
  verifyInvitation = asyncHandler(async (req, res) => {
    const { token } = req.params;

    const invitation = await invitationService.verifyInvitationToken(token);

    return res.status(200).json(
      new ApiResponse(200, invitation, "Invitation verified successfully")
    );
  });
}

export default new InvitationController();