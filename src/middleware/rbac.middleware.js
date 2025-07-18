import { ApiError } from "../utils/ApiError.js";
import roleService from "../services/role.service.js";

/**
 * Role-Based Access Control (RBAC) Middleware
 * Provides middleware functions for permission-based authorization
 */

/**
 * Middleware to check if user has required permission
 * @param {String|Array} requiredPermission - Permission name(s) required for access
 * @returns {Function} Express middleware function
 */
export const hasPermission = (requiredPermission) => {
  return async (req, res, next) => {
    try {
      // Ensure user is authenticated
      if (!req.user) {
        throw new ApiError(401, "Authentication required");
      }

      const userId = req.user._id;
      
      // Handle array of permissions (ANY match)
      if (Array.isArray(requiredPermission)) {
        let hasAnyPermission = false;
        
        for (const permission of requiredPermission) {
          const permitted = await roleService.hasPermission(userId, permission);
          if (permitted) {
            hasAnyPermission = true;
            break;
          }
        }
        
        if (!hasAnyPermission) {
          throw new ApiError(403, "You don't have permission to perform this action");
        }
        
        return next();
      }
      
      // Handle single permission
      const hasRequiredPermission = await roleService.hasPermission(
        userId,
        requiredPermission
      );

      if (!hasRequiredPermission) {
        throw new ApiError(403, "You don't have permission to perform this action");
      }

      next();
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Authorization failed"
      });
    }
  };
};

/**
 * Middleware to check if user has ALL required permissions
 * @param {Array} requiredPermissions - Array of permission names required for access
 * @returns {Function} Express middleware function
 */
export const hasAllPermissions = (requiredPermissions) => {
  return async (req, res, next) => {
    try {
      // Ensure user is authenticated
      if (!req.user) {
        throw new ApiError(401, "Authentication required");
      }

      const userId = req.user._id;
      
      // Get all user permissions
      const userPermissions = await roleService.getUserPermissions(userId);
      const userPermissionNames = userPermissions.map(p => p.name);
      
      // Check if user has all required permissions
      const missingPermissions = requiredPermissions.filter(
        permission => !userPermissionNames.includes(permission)
      );
      
      if (missingPermissions.length > 0) {
        throw new ApiError(403, "You don't have all required permissions to perform this action");
      }

      next();
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Authorization failed"
      });
    }
  };
};

/**
 * Middleware to check if user belongs to a specific role
 * @param {String|Array} roleName - Role name(s) required for access
 * @returns {Function} Express middleware function
 */
export const hasRole = (roleName) => {
  return async (req, res, next) => {
    try {
      // Ensure user is authenticated
      if (!req.user || !req.user.organizationRole) {
        throw new ApiError(401, "Authentication required");
      }

      // Get user's role
      const userRole = req.user.organizationRole;
      
      // Handle array of roles
      if (Array.isArray(roleName)) {
        if (!userRole.name || !roleName.includes(userRole.name)) {
          throw new ApiError(403, "You don't have the required role to perform this action");
        }
        return next();
      }
      
      // Handle single role
      if (!userRole.name || userRole.name !== roleName) {
        throw new ApiError(403, "You don't have the required role to perform this action");
      }

      next();
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Authorization failed"
      });
    }
  };
};

/**
 * Middleware to check if user is in the same organization as the resource
 * @param {Function} getOrgId - Function to extract organization ID from request
 * @returns {Function} Express middleware function
 */
export const isSameOrganization = (getOrgId) => {
  return async (req, res, next) => {
    try {
      // Ensure user is authenticated
      if (!req.user) {
        throw new ApiError(401, "Authentication required");
      }

      // Get organization ID from request using the provided function
      const resourceOrgId = getOrgId(req);
      
      // Get user's organization
      const userOrgId = req.user.organization ? req.user.organization.toString() : null;
      
      if (!userOrgId || userOrgId !== resourceOrgId.toString()) {
        throw new ApiError(403, "You don't have access to resources from this organization");
      }

      next();
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Authorization failed"
      });
    }
  };
};

/**
 * Middleware to attach user permissions to request
 * Useful for frontend to determine UI rendering
 * @returns {Function} Express middleware function
 */
export const attachPermissions = () => {
  return async (req, res, next) => {
    try {
      // Ensure user is authenticated
      if (!req.user) {
        return next();
      }

      const userId = req.user._id;
      
      // Get user permissions
      const permissions = await roleService.getUserPermissions(userId);
      
      // Attach permissions to request
      req.userPermissions = permissions;
      
      next();
    } catch (error) {
      // Don't block the request if this fails
      console.error("Failed to attach permissions:", error);
      next();
    }
  };
};

/**
 * Middleware to check if user is the owner of a resource
 * @param {Function} getResourceOwnerId - Function to extract resource owner ID from request
 * @param {String} alternativePermission - Optional permission that allows access even if not owner
 * @returns {Function} Express middleware function
 */
export const isResourceOwner = (getResourceOwnerId, alternativePermission = null) => {
  return async (req, res, next) => {
    try {
      // Ensure user is authenticated
      if (!req.user) {
        throw new ApiError(401, "Authentication required");
      }

      const userId = req.user._id.toString();
      const resourceOwnerId = getResourceOwnerId(req);
      
      // Check if user is the resource owner
      if (userId === resourceOwnerId.toString()) {
        return next();
      }
      
      // If not owner, check for alternative permission
      if (alternativePermission) {
        const hasAlternativePermission = await roleService.hasPermission(
          userId,
          alternativePermission
        );
        
        if (hasAlternativePermission) {
          return next();
        }
      }
      
      throw new ApiError(403, "You don't have permission to access this resource");
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Authorization failed"
      });
    }
  };
};