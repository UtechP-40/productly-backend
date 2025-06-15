import { Router } from "express";
import {
    registerOrganization,
    joinOrganization,
    inviteToOrganization,
    verifyInvite
} from "../controller/organization/index.js"; // Add .js extension and specify index.js

const router = Router();

router.post("/register", registerOrganization);
router.post("/join", joinOrganization);
router.post("/invite", inviteToOrganization);
router.post("/verify-invite", verifyInvite);

export default router;