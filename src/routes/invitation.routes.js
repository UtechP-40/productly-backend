import { Router } from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";
import invitationController from "../controllers/invitation.controller.js";

const router = Router();

// Public route for verifying invitation tokens (no auth required)
router.get("/verify/:token", invitationController.verifyInvitation);

// All other routes require authentication
router.use(verifyJWT);

// Create invitations
router.post("/", invitationController.createInvitation);
router.post("/bulk", invitationController.bulkCreateInvitations);

// Get invitations
router.get("/organization/:organizationId", invitationController.getOrganizationInvitations);
router.get("/status/:email", invitationController.checkInvitationStatus);
router.get("/:id", invitationController.getInvitationById);

// Manage invitations
router.post("/:id/resend", invitationController.resendInvitation);
router.post("/:id/revoke", invitationController.revokeInvitation);

export default router;