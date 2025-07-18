import { Role } from "../models/role.model.js";
import { Permission } from "../models/permission.model.js";
import { User } from "../models/user.model.js";
import { RoleTemplate } from "../models/roleTemplate.model.js";
import { ApiError } from "../utils/ApiError.js";
import mongoose from "mongoose";

/**
 * Role Management Service
 * Handles role CRUD operations, permission assignment, and role-based access control
 */
class RoleService {
  /**
   * Create a new role with organization scoping
   * @param {Object} roleData - Role data including name, organization, permissions, etc.
   * @param {String} createdBy - User ID of the creator
   * @returns {Object} Created role
   */
  async createRole(roleData, createdBy) {
    try {
      const { name, organization, permissions = [], description, isSystemRole = false } = roleData;

      // Validate organization exists
      if (!organization) {
        throw new ApiError(400, "Organization ID is required");
      }

      // Check if role with same name already exists in the organization
      const existingRole = await Role.findOne({
        name,
        organization,
        isActive: true
      });

      if (existingRole) {
        throw new ApiError(409, "Role with this name already exists in the organization");
      }

      // Validate permissions exist
      if (permissions.length > 0) {
        const validPermissions = await Permission.find({
          _id: { $in: permissions },
          isActive: true
        }).select("_id");

        if (validPermissions.length !== permissions.length) {
          throw new ApiError(400, "One or more permissions are invalid");
        }
      }

      // Create new role
      const role = new Role({
        name,
        organization,
        permissions,
        description,
        isSystemRole,
        createdBy
      });

      await role.save();
      return role;
    } catch (error) {
      if (error.code === 11000) {
        throw new ApiError(409, "Role with this name already exists in the organization");
      }
      throw error.statusCode ? error : new ApiError(500, "Failed to create role", error);
    }
  }

  /**
   * Get a role by ID
   * @param {String} roleId - Role ID
   * @param {String} organizationId - Organization ID for scoping
   * @returns {Object} Role object
   */
  async getRoleById(roleId, organizationId) {
    try {
      const role = await Role.findOne({
        _id: roleId,
        organization: organizationId,
        isActive: true
      }).populate("permissions");

      if (!role) {
        throw new ApiError(404, "Role not found");
      }

      return role;
    } catch (error) {
      throw error.statusCode ? error : new ApiError(500, "Failed to get role", error);
    }
  }

  /**
   * Get all roles for an organization
   * @param {String} organizationId - Organization ID
   * @param {Object} options - Query options (pagination, sorting, etc.)
   * @returns {Array} List of roles
   */
  async getRolesByOrganization(organizationId, options = {}) {
    try {
      const { page = 1, limit = 20, sortBy = "name", sortOrder = "asc" } = options;
      
      const query = {
        organization: organizationId,
        isActive: true
      };

      const sort = {};
      sort[sortBy] = sortOrder === "asc" ? 1 : -1;

      const roles = await Role.find(query)
        .populate("permissions")
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit);

      const total = await Role.countDocuments(query);

      return {
        roles,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      throw error.statusCode ? error : new ApiError(500, "Failed to get roles", error);
    }
  }

  /**
   * Update a role
   * @param {String} roleId - Role ID
   * @param {String} organizationId - Organization ID for scoping
   * @param {Object} updateData - Data to update
   * @returns {Object} Updated role
   */
  async updateRole(roleId, organizationId, updateData) {
    try {
      const { name, permissions, description } = updateData;

      // Find role by ID and organization
      const role = await Role.findOne({
        _id: roleId,
        organization: organizationId,
        isActive: true
      });

      if (!role) {
        throw new ApiError(404, "Role not found");
      }

      // Prevent updating system roles (optional security measure)
      if (role.isSystemRole) {
        throw new ApiError(403, "System roles cannot be modified");
      }

      // Update fields if provided
      if (name) role.name = name;
      if (description !== undefined) role.description = description;

      // Update permissions if provided
      if (permissions && Array.isArray(permissions)) {
        // Validate permissions exist
        const validPermissions = await Permission.find({
          _id: { $in: permissions },
          isActive: true
        }).select("_id");

        const validPermissionIds = validPermissions.map(p => p._id.toString());
        role.permissions = permissions.filter(p => validPermissionIds.includes(p.toString()));
      }

      await role.save();
      return role;
    } catch (error) {
      if (error.code === 11000) {
        throw new ApiError(409, "Role with this name already exists in the organization");
      }
      throw error.statusCode ? error : new ApiError(500, "Failed to update role", error);
    }
  }

  /**
   * Delete a role (soft delete)
   * @param {String} roleId - Role ID
   * @param {String} organizationId - Organization ID for scoping
   * @returns {Boolean} Success status
   */
  async deleteRole(roleId, organizationId) {
    try {
      // Check if role is assigned to any users
      const usersWithRole = await User.countDocuments({
        organizationRole: roleId,
        isActive: true
      });

      if (usersWithRole > 0) {
        throw new ApiError(400, "Cannot delete role that is assigned to users");
      }

      // Find role by ID and organization
      const role = await Role.findOne({
        _id: roleId,
        organization: organizationId,
        isActive: true
      });

      if (!role) {
        throw new ApiError(404, "Role not found");
      }

      // Prevent deleting system roles
      if (role.isSystemRole) {
        throw new ApiError(403, "System roles cannot be deleted");
      }

      // Soft delete by setting isActive to false
      role.isActive = false;
      await role.save();

      return true;
    } catch (error) {
      throw error.statusCode ? error : new ApiError(500, "Failed to delete role", error);
    }
  }

  /**
   * Assign permissions to a role
   * @param {String} roleId - Role ID
   * @param {String} organizationId - Organization ID for scoping
   * @param {Array} permissionIds - Array of permission IDs
   * @returns {Object} Updated role
   */
  async assignPermissions(roleId, organizationId, permissionIds) {
    try {
      // Find role by ID and organization
      const role = await Role.findOne({
        _id: roleId,
        organization: organizationId,
        isActive: true
      });

      if (!role) {
        throw new ApiError(404, "Role not found");
      }

      // Validate permissions exist
      const validPermissions = await Permission.find({
        _id: { $in: permissionIds },
        isActive: true
      }).select("_id");

      if (validPermissions.length !== permissionIds.length) {
        throw new ApiError(400, "One or more permissions are invalid");
      }

      // Add permissions to role
      const validPermissionIds = validPermissions.map(p => p._id.toString());
      
      // Filter out duplicates
      const currentPermissions = role.permissions.map(p => p.toString());
      const newPermissions = validPermissionIds.filter(p => !currentPermissions.includes(p));
      
      // Add new permissions
      role.permissions = [...role.permissions, ...newPermissions];
      
      await role.save();
      return role;
    } catch (error) {
      throw error.statusCode ? error : new ApiError(500, "Failed to assign permissions", error);
    }
  }

  /**
   * Remove permissions from a role
   * @param {String} roleId - Role ID
   * @param {String} organizationId - Organization ID for scoping
   * @param {Array} permissionIds - Array of permission IDs
   * @returns {Object} Updated role
   */
  async removePermissions(roleId, organizationId, permissionIds) {
    try {
      // Find role by ID and organization
      const role = await Role.findOne({
        _id: roleId,
        organization: organizationId,
        isActive: true
      });

      if (!role) {
        throw new ApiError(404, "Role not found");
      }

      // Remove permissions from role
      role.permissions = role.permissions.filter(
        p => !permissionIds.includes(p.toString())
      );
      
      await role.save();
      return role;
    } catch (error) {
      throw error.statusCode ? error : new ApiError(500, "Failed to remove permissions", error);
    }
  }

  /**
   * Check if a user has a specific permission
   * @param {String} userId - User ID
   * @param {String} permissionName - Permission name or ID
   * @returns {Boolean} Whether user has permission
   */
  async hasPermission(userId, permissionName) {
    try {
      // Get user with role
      const user = await User.findById(userId)
        .select("organizationRole")
        .populate({
          path: "organizationRole",
          populate: {
            path: "permissions"
          }
        });

      if (!user || !user.organizationRole) {
        return false;
      }

      // Check if permission exists in role
      const role = user.organizationRole;
      
      // If permissionName is an ID
      if (mongoose.Types.ObjectId.isValid(permissionName)) {
        return role.permissions.some(p => p._id.toString() === permissionName);
      }
      
      // If permissionName is a string name
      return role.permissions.some(p => p.name === permissionName);
    } catch (error) {
      console.error("Permission check failed:", error);
      return false;
    }
  }

  /**
   * Get all permissions for a user
   * @param {String} userId - User ID
   * @returns {Array} List of permissions
   */
  async getUserPermissions(userId) {
    try {
      // Get user with role
      const user = await User.findById(userId)
        .select("organizationRole")
        .populate({
          path: "organizationRole",
          populate: {
            path: "permissions"
          }
        });

      if (!user || !user.organizationRole) {
        return [];
      }

      return user.organizationRole.permissions || [];
    } catch (error) {
      throw error.statusCode ? error : new ApiError(500, "Failed to get user permissions", error);
    }
  }

  /**
   * Create a role from a template
   * @param {String} templateId - Role template ID
   * @param {String} organizationId - Organization ID
   * @param {String} createdBy - User ID of creator
   * @returns {Object} Created role
   */
  async createRoleFromTemplate(templateId, organizationId, createdBy) {
    try {
      // Find template
      const template = await RoleTemplate.findOne({
        _id: templateId,
        isActive: true
      });

      if (!template) {
        throw new ApiError(404, "Role template not found");
      }

      // Get permissions from template
      const permissions = await Permission.find({
        name: { $in: template.permissions },
        isActive: true
      }).select("_id");

      // Create role from template
      const role = new Role({
        name: template.name,
        organization: organizationId,
        permissions: permissions.map(p => p._id),
        description: template.description,
        isSystemRole: false,
        createdBy
      });

      await role.save();
      
      // Update template usage statistics
      await template.incrementUsage();
      
      return role;
    } catch (error) {
      throw error.statusCode ? error : new ApiError(500, "Failed to create role from template", error);
    }
  }

  /**
   * Get permission matrix for UI display
   * @param {String} organizationId - Organization ID
   * @returns {Object} Permission matrix with categories and permissions
   */
  async getPermissionMatrix(organizationId) {
    try {
      // Get all active permissions
      const permissions = await Permission.find({ isActive: true });
      
      // Get all active roles for the organization
      const roles = await Role.find({
        organization: organizationId,
        isActive: true
      }).populate("permissions");

      // Organize permissions by category
      const permissionsByCategory = permissions.reduce((acc, permission) => {
        if (!acc[permission.category]) {
          acc[permission.category] = [];
        }
        acc[permission.category].push(permission);
        return acc;
      }, {});

      // Create matrix of roles and their permissions
      const matrix = {
        categories: Object.keys(permissionsByCategory),
        permissions: permissionsByCategory,
        roles: roles.map(role => ({
          _id: role._id,
          name: role.name,
          permissions: role.permissions.map(p => p._id.toString())
        }))
      };

      return matrix;
    } catch (error) {
      throw error.statusCode ? error : new ApiError(500, "Failed to get permission matrix", error);
    }
  }

  /**
   * Check for permission conflicts when assigning roles
   * @param {String} roleId - Role ID to check
   * @param {Array} existingRoleIds - Array of existing role IDs
   * @returns {Object} Conflict information if any
   */
  async checkPermissionConflicts(roleId, existingRoleIds) {
    try {
      // Get the role to check
      const role = await Role.findById(roleId).populate("permissions");
      
      if (!role) {
        throw new ApiError(404, "Role not found");
      }
      
      // Get existing roles
      const existingRoles = await Role.find({
        _id: { $in: existingRoleIds },
        isActive: true
      }).populate("permissions");
      
      // Check for conflicting permissions
      const conflicts = [];
      
      role.permissions.forEach(permission => {
        existingRoles.forEach(existingRole => {
          const conflictingPermission = existingRole.permissions.find(p => 
            p._id.toString() === permission._id.toString()
          );
          
          if (conflictingPermission) {
            conflicts.push({
              permission: permission.name,
              roles: [role.name, existingRole.name]
            });
          }
        });
      });
      
      return {
        hasConflicts: conflicts.length > 0,
        conflicts
      };
    } catch (error) {
      throw error.statusCode ? error : new ApiError(500, "Failed to check permission conflicts", error);
    }
  }

  /**
   * Implement role hierarchy and inheritance
   * @param {String} parentRoleId - Parent role ID
   * @param {String} childRoleId - Child role ID
   * @param {String} organizationId - Organization ID for scoping
   * @returns {Object} Updated child role
   */
  async implementRoleHierarchy(parentRoleId, childRoleId, organizationId) {
    try {
      // Find parent and child roles
      const parentRole = await Role.findOne({
        _id: parentRoleId,
        organization: organizationId,
        isActive: true
      }).populate("permissions");
      
      const childRole = await Role.findOne({
        _id: childRoleId,
        organization: organizationId,
        isActive: true
      });
      
      if (!parentRole || !childRole) {
        throw new ApiError(404, "One or both roles not found");
      }
      
      // Get parent role permissions
      const parentPermissions = parentRole.permissions.map(p => p._id);
      
      // Add parent permissions to child role
      const currentChildPermissions = childRole.permissions.map(p => p.toString());
      const newPermissions = parentPermissions.filter(p => 
        !currentChildPermissions.includes(p.toString())
      );
      
      childRole.permissions = [...childRole.permissions, ...newPermissions];
      await childRole.save();
      
      return childRole;
    } catch (error) {
      throw error.statusCode ? error : new ApiError(500, "Failed to implement role hierarchy", error);
    }
  }
}

export default new RoleService();