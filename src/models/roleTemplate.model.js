import mongoose from "mongoose";

const roleTemplateSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            index: true
        },
        organizationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            required: true,
            index: true
        },
        userType: {
            type: String,
            enum: ["ADMIN_PORTAL", "MOBILE_APP"],
            required: true,
            index: true
        },
        baseRole: {
            type: String,
            enum: ["OWNER", "ADMIN", "MANAGER", "MEMBER"],
            required: true
        },
        permissions: [{
            type: String,
            ref: "Permission"
        }],
        description: {
            type: String,
            trim: true
        },
        isDefault: {
            type: Boolean,
            default: false,
            index: true
        },
        isActive: {
            type: Boolean,
            default: true,
            index: true
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        metadata: {
            usageCount: {
                type: Number,
                default: 0
            },
            lastUsed: Date
        }
    },
    {
        timestamps: true
    }
);

// Compound index for organization and userType
roleTemplateSchema.index({ organizationId: 1, userType: 1 });

// Compound index for organization and default templates
roleTemplateSchema.index({ organizationId: 1, isDefault: 1, isActive: 1 });

// Static method to get templates by organization and user type
roleTemplateSchema.statics.getByOrganization = function(organizationId, userType = null) {
    const query = { organizationId, isActive: true };
    if (userType) {
        query.userType = userType;
    }
    return this.find(query).sort({ isDefault: -1, name: 1 });
};

// Static method to get default template for a role
roleTemplateSchema.statics.getDefaultTemplate = function(organizationId, userType, baseRole) {
    return this.findOne({
        organizationId,
        userType,
        baseRole,
        isDefault: true,
        isActive: true
    });
};

// Method to increment usage count
roleTemplateSchema.methods.incrementUsage = function() {
    this.metadata.usageCount += 1;
    this.metadata.lastUsed = new Date();
    return this.save();
};

// Pre-save middleware to validate permissions based on userType
roleTemplateSchema.pre('save', async function(next) {
    if (this.isModified('permissions')) {
        const Permission = mongoose.model('Permission');
        const validPermissions = await Permission.find({
            name: { $in: this.permissions },
            context: { $in: [this.userType, 'SYSTEM'] },
            isActive: true
        }).select('name');
        
        const validPermissionNames = validPermissions.map(p => p.name);
        this.permissions = this.permissions.filter(perm => validPermissionNames.includes(perm));
    }
    next();
});

export const RoleTemplate = mongoose.model("RoleTemplate", roleTemplateSchema);