import roleService from "../services/role.service.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";

/**
 * Role Controller
 * Handles HTTP requests for role management and role-based access control
 * Implements CRUD operations for roles, role assignment to users, and permission management
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
  
  /**
   * Assign role to a user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async assignRoleToUser(req, res) {
    try {
      const { userId, roleId } = req.body;
      const organizationId = req.user.organization;
      
      if (!userId || !roleId) {
        throw new ApiError(400, "User ID and Role ID are required");
      }
      
      // Validate user exists and belongs to the organization
      const user = await User.findOne({ 
        _id: userId,
        isActive: true
      });
      
      if (!user) {
        throw new ApiError(404, "User not found");
      }
      
      // Validate role exists and belongs to the organization
      const role = await roleService.getRoleById(roleId, organizationId);
      
      if (!role) {
        throw new ApiError(404, "Role not found");
      }
      
      // Assign role to user
      user.organizationRole = roleId;
      await user.save();
      
      return res.status(200).json(
        new ApiResponse(200, {
          userId: user._id,
          roleId: role._id,
          roleName: role.name
        }, "Role assigned to user successfully")
      );
    } catch (error) {
      return res.status(error.statusCode || 500).json(
        new ApiResponse(
          error.statusCode || 500,
          null,
          error.message || "Failed to assign role to user"
        )
      );
    }
  }
  
  /**
   * Remove role from a user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async removeRoleFromUser(req, res) {
    try {
      const { userId } = req.params;
      const organizationId = req.user.organization;
      
      if (!userId) {
        throw new ApiError(400, "User ID is required");
      }
      
      // Validate user exists and belongs to the organization
      const user = await User.findOne({ 
        _id: userId,
        isActive: true
      });
      
      if (!user) {
        throw new ApiError(404, "User not found");
      }
      
      // Check if user has a role assigned
      if (!user.organizationRole) {
        throw new ApiError(400, "User does not have a role assigned");
      }
      
      // Store the role ID for response
      const previousRoleId = user.organizationRole;
      
      // Remove role from user
      user.organizationRole = null;
      await user.save();
      
      return res.status(200).json(
        new ApiResponse(200, {
          userId: user._id,
          previousRoleId
        }, "Role removed from user successfully")
      );
    } catch (error) {
      return res.status(error.statusCode || 500).json(
        new ApiResponse(
          error.statusCode || 500,
          null,
          error.message || "Failed to remove role from user"
        )
      );
    }
  }
  
  /**
   * Get users by role
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getUsersByRole(req, res) {
    try {
      const { roleId } = req.params;
      const organizationId = req.user.organization;
      const { page = 1, limit = 20 } = req.query;
      
      if (!roleId) {
        throw new ApiError(400, "Role ID is required");
      }
      
      // Validate role exists and belongs to the organization
      const role = await roleService.getRoleById(roleId, organizationId);
      
      if (!role) {
        throw new ApiError(404, "Role not found");
      }
      
      // Find users with this role
      const users = await User.find({
        organizationRole: roleId,
        isActive: true
      })
      .select("_id firstName lastName email avatar lastLoginAt")
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
      
      // Count total users with this role
      const total = await User.countDocuments({
        organizationRole: roleId,
        isActive: true
      });
      
      return res.status(200).json(
        new ApiResponse(200, {
          users,
          pagination: {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(total / limit)
          },
          role: {
            _id: role._id,
            name: role.name
          }
        }, "Users retrieved successfully")
      );
    } catch (error) {
      return res.status(error.statusCode || 500).json(
        new ApiResponse(
          error.statusCode || 500,
          null,
          error.message || "Failed to get users by role"
        )
      );
    }
  }
  
  /**
   * Validate role assignment
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async validateRoleAssignment(req, res) {
    try {
      const { userId, roleId } = req.body;
      const organizationId = req.user.organization;
      
      if (!userId || !roleId) {
        throw new ApiError(400, "User ID and Role ID are required");
      }
      
      // Validate user exists
      const user = await User.findOne({ 
        _id: userId,
        isActive: true
      });
      
      if (!user) {
        throw new ApiError(404, "User not found");
      }
      
      // Validate role exists
      const role = await roleService.getRoleById(roleId, organizationId);
      
      if (!role) {
        throw new ApiError(404, "Role not found");
      }
      
      // Check if user already has this role
      const hasRole = user.organizationRole && 
                      user.organizationRole.toString() === roleId.toString();
      
      // Check if user has any existing role
      const currentRole = user.organizationRole ? 
        await roleService.getRoleById(user.organizationRole, organizationId) : null;
      
      return res.status(200).json(
        new ApiResponse(200, {
          valid: true,
          hasRole,
          currentRole: currentRole ? {
            _id: currentRole._id,
            name: currentRole.name
          } : null,
          targetRole: {
            _id: role._id,
            name: role.name
          }
        }, "Role assignment validation successful")
      );
    } catch (error) {
      return res.status(error.statusCode || 500).json(
        new ApiResponse(
          error.statusCode || 500,
          null,
          error.message || "Failed to validate role assignment"
        )
      );
    }
  }
  
  /**
   * Bulk assign roles to users
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async bulkAssignRoles(req, res) {
    try {
      const { assignments } = req.body;
      const organizationId = req.user.organization;
      
      if (!assignments || !Array.isArray(assignments) || assignments.length === 0) {
        throw new ApiError(400, "Valid assignments array is required");
      }
      
      // Validate all role IDs exist and belong to the organization
      const roleIds = [...new Set(assignments.map(a => a.roleId))];
      const roles = await Promise.all(
        roleIds.map(id => roleService.getRoleById(id, organizationId))
      );
      
      // Check if any roles were not found
      const validRoleIds = roles.filter(Boolean).map(r => r._id.toString());
      const invalidRoleIds = roleIds.filter(id => !validRoleIds.includes(id.toString()));
      
      if (invalidRoleIds.length > 0) {
        throw new ApiError(400, `Invalid role IDs: ${invalidRoleIds.join(', ')}`);
      }
      
      // Process assignments
      const results = {
        successful: [],
        failed: []
      };
      
      for (const assignment of assignments) {
        try {
          const { userId, roleId } = assignment;
          
          // Find user
          const user = await User.findOne({ 
            _id: userId,
            isActive: true
          });
          
          if (!user) {
            results.failed.push({
              userId,
              roleId,
              reason: "User not found"
            });
            continue;
          }
          
          // Assign role
          user.organizationRole = roleId;
          await user.save();
          
          results.successful.push({
            userId: user._id,
            roleId,
            userName: `${user.firstName} ${user.lastName}`
          });
        } catch (error) {
          results.failed.push({
            userId: assignment.userId,
            roleId: assignment.roleId,
            reason: error.message || "Unknown error"
          });
        }
      }
      
      return res.status(200).json(
        new ApiResponse(200, results, "Bulk role assignment completed")
      );
    } catch (error) {
      return res.status(error.statusCode || 500).json(
        new ApiResponse(
          error.statusCode || 500,
          null,
          error.message || "Failed to perform bulk role assignment"
        )
      );
    }
  }
}

export default new RoleController();