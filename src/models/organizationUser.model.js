import mongoose from "mongoose";

const organizationUserSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        organizationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            required: true
        },
        userType: {
            type: String,
            enum: ["ADMIN_PORTAL", "MOBILE_APP"],
            required: true
        },
        role: {
            type: String,
            enum: ["OWNER", "ADMIN", "MEMBER"],
            default: "MEMBER"
        },
        invitedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
          },
          invitedAt: Date,
          approvedAt: Date,
        status: {
            type: String,
            enum: ["ACTIVE", "INACTIVE", "PENDING"],
            default: "PENDING"
        },
        permissions: [{
            type: String,
            enum: [
                // Admin Portal Permissions
                "MANAGE_USERS",
                "MANAGE_BILLING",
                "MANAGE_ORGANIZATION",
                "VIEW_ANALYTICS",
                "MANAGE_SETTINGS",
                // Mobile App Permissions
                "READ",
                "WRITE",
                "DELETE",
                "UPLOAD_MEDIA",
                "ACCESS_FEATURES"
            ]
        }],
        joinedAt: {
            type: Date,
            default: Date.now
        }
    },
    {
        timestamps: true
    }
);

export const PERMISSIONS = {
    ADMIN_PORTAL: [
      "MANAGE_USERS", "MANAGE_BILLING", "MANAGE_ORGANIZATION",
      "VIEW_ANALYTICS", "MANAGE_SETTINGS"
    ],
    MOBILE_APP: [
      "READ", "WRITE", "DELETE", "UPLOAD_MEDIA", "ACCESS_FEATURES"
    ]
  };
  
  organizationUserSchema.index({ status: 1 });

// Compound index to ensure a user can only have one role per organization
organizationUserSchema.index({ userId: 1, organizationId: 1, userType: 1 }, { unique: true });

// Middleware to validate permissions based on userType
organizationUserSchema.pre('save', function(next) {
    const adminPermissions = ["MANAGE_USERS", "MANAGE_BILLING", "MANAGE_ORGANIZATION", "VIEW_ANALYTICS", "MANAGE_SETTINGS"];
    const mobilePermissions = ["READ", "WRITE", "DELETE", "UPLOAD_MEDIA", "ACCESS_FEATURES"];

    if (this.userType === "ADMIN_PORTAL") {
        this.permissions = this.permissions.filter(perm => adminPermissions.includes(perm));
    } else {
        this.permissions = this.permissions.filter(perm => mobilePermissions.includes(perm));
    }
    next();
});

export const OrganizationUser = mongoose.model("OrganizationUser", organizationUserSchema);