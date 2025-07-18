import roleService from "../services/role.service.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

/**
 * Role Controller
 * Handles HTTP requests for role management
 */
class RoleController {
  /**
   * Create a new role
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async createRole(req, res) {
    try {
      const { name, organization, permissions, description, isSystemRole } = req.body;
      
      if (!name || !organization) {
        throw new ApiError(400, "Name and organization are required");
      }
      
      // Create role
      const role = await roleService.createRole(
        { name, organization, permissions, description, isSystemRole },
        req.user._id
      );
      
      return res.status(201).json(
        new ApiResponse(201, role, "Role created successfully")
      );
    } catch (error) {
      return res.status(error.statusCode || 500).json(
        new ApiResponse(
          error.statusCode || 500,
          null,
          error.message || "Failed to create role"
        )
      );
    }
  }
  
  /**
   * Get a role by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getRole(req, res) {
    try {
      const { id } = req.params;
      const organizationId = req.user.organization;
      
      const role = await roleService.getRoleById(id, organizationId);
      
      return res.status(200).json(
        new ApiResponse(200, role, "Role retrieved successfully")
      );
    } catch (error) {
      return res.status(error.statusCode || 500).json(
        new ApiResponse(
          error.statusCode || 500,
          null,
          error.message || "Failed to get role"
        )
      );
    }
  }
  
  /**
   * Get all roles for an organization
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getRoles(req, res) {
    try {
      const organizationId = req.user.organization;
      const { page, limit, sortBy, sortOrder } = req.query;
      
      const result = await roleService.getRolesByOrganization(
        organizationId,
        { page, limit, sortBy, sortOrder }
      );
      
      return res.status(200).json(
        new ApiResponse(200, result, "Roles retrieved successfully")
      );
    } catch (error) {
      return res.status(error.statusCode || 500).json(
        new ApiResponse(
          error.statusCode || 500,
          null,
          error.message || "Failed to get roles"
        )
      );
    }
  }
  
  /**
   * Update a role
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async updateRole(req, res) {
    try {
      const { id } = req.params;
      const organizationId = req.user.organization;
      const { name, permissions, description } = req.body;
      
      const role = await roleService.updateRole(
        id,
        organizationId,
        { name, permissions, description }
      );
      
      return res.status(200).json(
        new ApiResponse(200, role, "Role updated successfully")
      );
    } catch (error) {
      return res.status(error.statusCode || 500).json(
        new ApiResponse(
          error.statusCode || 500,
          null,
          error.message || "Failed to update role"
        )
      );
    }
  }
  
  /**
   * Delete a role
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async deleteRole(req, res) {
    try {
      const { id } = req.params;
      const organizationId = req.user.organization;
      
      await roleService.deleteRole(id, organizationId);
      
      return res.status(200).json(
        new ApiResponse(200, { success: true }, "Role deleted successfully")
      );
    } catch (error) {
      return res.status(error.statusCode || 500).json(
        new ApiResponse(
          error.statusCode || 500,
          null,
          error.message || "Failed to delete role"
        )
      );
    }
  }
  
  /**
   * Assign permissions to a role
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async assignPermissions(req, res) {
    try {
      const { id } = req.params;
      const organizationId = req.user.organization;
      const { permissions } = req.body;
      
      if (!permissions || !Array.isArray(permissions)) {
        throw new ApiError(400, "Permissions array is required");
      }
      
      const role = await roleService.assignPermissions(
        id,
        organizationId,
        permissions
      );
      
      return res.status(200).json(
        new ApiResponse(200, role, "Permissions assigned successfully")
      );
    } catch (error) {
      return res.status(error.statusCode || 500).json(
        new ApiResponse(
          error.statusCode || 500,
          null,
          error.message || "Failed to assign permissions"
        )
      );
    }
  }
  
  /**
   * Remove permissions from a role
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async removePermissions(req, res) {
    try {
      const { id } = req.params;
      const organizationId = req.user.organization;
      const { permissions } = req.body;
      
      if (!permissions || !Array.isArray(permissions)) {
        throw new ApiError(400, "Permissions array is required");
      }
      
      const role = await roleService.removePermissions(
        id,
        organizationId,
        permissions
      );
      
      return res.status(200).json(
        new ApiResponse(200, role, "Permissions removed successfully")
      );
    } catch (error) {
      return res.status(error.statusCode || 500).json(
        new ApiResponse(
          error.statusCode || 500,
          null,
          error.message || "Failed to remove permissions"
        )
      );
    }
  }
  
  /**
   * Get permission matrix for UI display
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getPermissionMatrix(req, res) {
    try {
      const organizationId = req.user.organization;
      
      const matrix = await roleService.getPermissionMatrix(organizationId);
      
      return res.status(200).json(
        new ApiResponse(200, matrix, "Permission matrix retrieved successfully")
      );
    } catch (error) {
      return res.status(error.statusCode || 500).json(
        new ApiResponse(
          error.statusCode || 500,
          null,
          error.message || "Failed to get permission matrix"
        )
      );
    }
  }
  
  /**
   * Check for permission conflicts
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async checkPermissionConflicts(req, res) {
    try {
      const { roleId, existingRoleIds } = req.body;
      
      if (!roleId || !existingRoleIds || !Array.isArray(existingRoleIds)) {
        throw new ApiError(400, "Role ID and existing role IDs array are required");
      }
      
      const conflicts = await roleService.checkPermissionConflicts(
        roleId,
        existingRoleIds
      );
      
      return res.status(200).json(
        new ApiResponse(200, conflicts, "Permission conflicts checked successfully")
      );
    } catch (error) {
      return res.status(error.statusCode || 500).json(
        new ApiResponse(
          error.statusCode || 500,
          null,
          error.message || "Failed to check permission conflicts"
        )
      );
    }
  }
  
  /**
   * Create a role from a template
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async createRoleFromTemplate(req, res) {
    try {
      const { templateId } = req.body;
      const organizationId = req.user.organization;
      
      if (!templateId) {
        throw new ApiError(400, "Template ID is required");
      }
      
      const role = await roleService.createRoleFromTemplate(
        templateId,
        organizationId,
        req.user._id
      );
      
      return res.status(201).json(
        new ApiResponse(201, role, "Role created from template successfully")
      );
    } catch (error) {
      return res.status(error.statusCode || 500).json(
        new ApiResponse(
          error.statusCode || 500,
          null,
          error.message || "Failed to create role from template"
        )
      );
    }
  }
  
  /**
   * Implement role hierarchy (inherit permissions from parent role)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async implementRoleHierarchy(req, res) {
    try {
      const { parentRoleId, childRoleId } = req.body;
      const organizationId = req.user.organization;
      
      if (!parentRoleId || !childRoleId) {
        throw new ApiError(400, "Parent and child role IDs are required");
      }
      
      const role = await roleService.implementRoleHierarchy(
        parentRoleId,
        childRoleId,
        organizationId
      );
      
      return res.status(200).json(
        new ApiResponse(200, role, "Role hierarchy implemented successfully")
      );
    } catch (error) {
      return res.status(error.statusCode || 500).json(
        new ApiResponse(
          error.statusCode || 500,
          null,
          error.message || "Failed to implement role hierarchy"
        )
      );
    }
  }
}

export default new RoleController();