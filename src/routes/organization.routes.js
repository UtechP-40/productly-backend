import { Router } from "express";
import {
    registerController,
    joinOrganization,
    inviteToOrganization,
    verifyInvite
} from "../controller/organization/index.js"; // Add .js extension and specify index.js

const router = Router();

router.post("/register", registerController);
router.post("/join", joinOrganization);
router.post("/invite", inviteToOrganization);
router.post("/verify-invite", verifyInvite);

export default router;