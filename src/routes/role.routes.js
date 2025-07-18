import express from "express";
import roleController from "../controllers/role.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { hasPermission } from "../middleware/rbac.middleware.js";

const router = express.Router();

// Apply JWT verification to all routes
router.use(verifyJWT);

// Role CRUD operations
router.post(
  "/",
  hasPermission("MANAGE_ROLES"),
  roleController.createRole
);

router.get(
  "/",
  hasPermission(["VIEW_ROLES", "MANAGE_ROLES"]),
  roleController.getRoles
);

router.get(
  "/:id",
  hasPermission(["VIEW_ROLES", "MANAGE_ROLES"]),
  roleController.getRole
);

router.put(
  "/:id",
  hasPermission("MANAGE_ROLES"),
  roleController.updateRole
);

router.delete(
  "/:id",
  hasPermission("MANAGE_ROLES"),
  roleController.deleteRole
);

// Permission management
router.post(
  "/:id/permissions",
  hasPermission("MANAGE_ROLES"),
  roleController.assignPermissions
);

router.delete(
  "/:id/permissions",
  hasPermission("MANAGE_ROLES"),
  roleController.removePermissions
);

// Permission matrix for UI
router.get(
  "/permissions/matrix",
  hasPermission(["VIEW_ROLES", "MANAGE_ROLES"]),
  roleController.getPermissionMatrix
);

// Check permission conflicts
router.post(
  "/permissions/conflicts",
  hasPermission(["VIEW_ROLES", "MANAGE_ROLES"]),
  roleController.checkPermissionConflicts
);

// Role templates
router.post(
  "/from-template",
  hasPermission("MANAGE_ROLES"),
  roleController.createRoleFromTemplate
);

// Role hierarchy
router.post(
  "/hierarchy",
  hasPermission("MANAGE_ROLES"),
  roleController.implementRoleHierarchy
);

export default router;