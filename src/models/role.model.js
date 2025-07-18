import mongoose from "mongoose";

const roleSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            index: true
        },
        organization: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Organization',
            required: true,
            index: true
        },
        permissions: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Permission'
        }],
        isSystemRole: {
            type: Boolean,
            default: false,
            index: true
        },
        description: {
            type: String,
            trim: true
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        isActive: {
            type: Boolean,
            default: true,
            index: true
        }
    },
    {
        timestamps: true
    }
);

// Compound index to ensure unique role names per organization
roleSchema.index({ name: 1, organization: 1 }, { unique: true });

// Index for efficient querying by organization and active status
roleSchema.index({ organization: 1, isActive: 1 });

// Index for system roles
roleSchema.index({ isSystemRole: 1, isActive: 1 });

// Static method to get roles by organization
roleSchema.statics.getByOrganization = function(organizationId) {
    return this.find({ 
        organization: organizationId, 
        isActive: true 
    }).populate('permissions').sort({ name: 1 });
};

// Static method to get system roles
roleSchema.statics.getSystemRoles = function() {
    return this.find({ 
        isSystemRole: true, 
        isActive: true 
    }).populate('permissions').sort({ name: 1 });
};

// Method to check if role has specific permission
roleSchema.methods.hasPermission = function(permissionId) {
    return this.permissions.some(p => p.toString() === permissionId.toString());
};

// Method to add permission to role
roleSchema.methods.addPermission = function(permissionId) {
    if (!this.hasPermission(permissionId)) {
        this.permissions.push(permissionId);
    }
    return this;
};

// Method to remove permission from role
roleSchema.methods.removePermission = function(permissionId) {
    this.permissions = this.permissions.filter(p => p.toString() !== permissionId.toString());
    return this;
};

// Pre-save middleware to validate permissions exist
roleSchema.pre('save', async function(next) {
    if (this.isModified('permissions') && this.permissions.length > 0) {
        const Permission = mongoose.model('Permission');
        const validPermissions = await Permission.find({
            _id: { $in: this.permissions },
            isActive: true
        }).select('_id');
        
        const validPermissionIds = validPermissions.map(p => p._id.toString());
        this.permissions = this.permissions.filter(p => validPermissionIds.includes(p.toString()));
    }
    next();
});

export const Role = mongoose.model("Role", roleSchema);