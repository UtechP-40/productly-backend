import { Router } from "express";

const router = Router();
import {registerController,joinOrganization,inviteToOrganization,verifyInvite} from "../controller/organization"

router.post("/register", registerController);
router.post("/join", joinOrganization);
router.post("/invite", inviteToOrganization);
router.post("/verify-invite", verifyInvite);

export default router;