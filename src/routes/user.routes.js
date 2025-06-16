import express from "express";

const router = express.Router();
// import { verifyJWT } from "../middleware/auth.middleware";
import { loginUser } from "../controller/user/user.controller.js";

router.post("/login", loginUser);
export default router