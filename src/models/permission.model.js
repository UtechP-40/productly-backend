import mongoose from "mongoose";

const permissionSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            uppercase: true
        },
        category: {
            type: String,
            required: true,
            enum: ["USER_MANAGEMENT", "ORGANIZATION_SETTINGS", "BILLING_MANAGEMENT", "ANALYTICS_ACCESS", "CONTENT_MANAGEMENT"],
            index: true
        },
        context: {
            type: String,
            required: true,
            enum: ["ADMIN_PORTAL", "MOBILE_APP", "SYSTEM"],
            index: true,
            default: "ADMIN_PORTAL"
        },
        description: {
            type: String,
            required: true,
            trim: true
        },
        isSystemPermission: {
            type: Boolean,
            default: false,
            index: true
        },
        dependencies: [{
            type: String,
            ref: "Permission"
        }],
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

// Index for efficient querying by category and active status
permissionSchema.index({ category: 1, isActive: 1 });
permissionSchema.index({ context: 1, isActive: 1 });

// Static method to get permissions by category
permissionSchema.statics.getByCategory = function(category) {
    return this.find({ category, isActive: true }).sort({ name: 1 });
};

// Static method to get permissions by context
permissionSchema.statics.getByContext = function(context) {
    return this.find({ context, isActive: true }).sort({ name: 1 });
};

// Static method to get system permissions
permissionSchema.statics.getSystemPermissions = function() {
    return this.find({ isSystemPermission: true, isActive: true }).sort({ name: 1 });
};

// Method to check if permission has dependencies
permissionSchema.methods.hasDependencies = function() {
    return this.dependencies && this.dependencies.length > 0;
};

export const Permission = mongoose.model("Permission", permissionSchema);