import { Router } from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";
import invitationController from "../controllers/invitation.controller.js";

const router = Router();

// Public route for verifying invitation tokens (no auth required)
router.get("/verify/:token", invitationController.verifyInvitation);

// All other routes require authentication
router.use(verifyJWT);

// Create a new invitation
router.post("/", invitationController.createInvitation);

// Get all invitations for an organization
router.get("/organization/:organizationId", invitationController.getOrganizationInvitations);

// Get invitation by ID
router.get("/:id", invitationController.getInvitationById);

// Resend invitation
router.post("/:id/resend", invitationController.resendInvitation);

// Revoke invitation
router.post("/:id/revoke", invitationController.revokeInvitation);

export default router;