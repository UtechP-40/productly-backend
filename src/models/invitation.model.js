import mongoose from "mongoose";
import crypto from "crypto";

const invitationSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            required: true,
            lowercase: true,
            trim: true,
            index: true
        },
        token: {
            type: String,
            unique: true,
            index: true,
            default: function() {
                return crypto.randomBytes(32).toString('hex');
            }
        },
        organization: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Organization',
            required: true,
            index: true
        },
        role: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Role',
            required: true
        },
        invitedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        status: {
            type: String,
            enum: ['PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED'],
            default: 'PENDING',
            index: true
        },
        expiresAt: {
            type: Date,
            index: true,
            default: function() {
                return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
            }
        },
        acceptedAt: {
            type: Date
        },
        revokedAt: {
            type: Date
        },
        revokedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        metadata: {
            userAgent: String,
            ipAddress: String,
            invitationSource: {
                type: String,
                enum: ['ADMIN_PANEL', 'API', 'BULK_IMPORT'],
                default: 'ADMIN_PANEL'
            }
        }
    },
    {
        timestamps: true
    }
);

// Compound index for email and organization to prevent duplicate invitations
invitationSchema.index({ email: 1, organization: 1, status: 1 });

// Index for efficient cleanup of expired invitations
invitationSchema.index({ expiresAt: 1, status: 1 });

// Index for organization-based queries
invitationSchema.index({ organization: 1, status: 1, createdAt: -1 });

// Static method to generate secure token
invitationSchema.statics.generateToken = function() {
    return crypto.randomBytes(32).toString('hex');
};

// Static method to find valid invitation by token
invitationSchema.statics.findValidByToken = function(token) {
    return this.findOne({
        token,
        status: 'PENDING',
        expiresAt: { $gt: new Date() }
    }).populate('organization role invitedBy');
};

// Static method to get invitations by organization
invitationSchema.statics.getByOrganization = function(organizationId, status = null) {
    const query = { organization: organizationId };
    if (status) {
        query.status = status;
    }
    return this.find(query)
        .populate('role invitedBy', 'name firstName lastName')
        .sort({ createdAt: -1 });
};

// Static method to cleanup expired invitations
invitationSchema.statics.cleanupExpired = function() {
    return this.updateMany(
        {
            status: 'PENDING',
            expiresAt: { $lt: new Date() }
        },
        {
            status: 'EXPIRED'
        }
    );
};

// Method to check if invitation is valid
invitationSchema.methods.isValid = function() {
    return this.status === 'PENDING' && this.expiresAt > new Date();
};

// Method to accept invitation
invitationSchema.methods.accept = function() {
    this.status = 'ACCEPTED';
    this.acceptedAt = new Date();
    return this.save();
};

// Method to revoke invitation
invitationSchema.methods.revoke = function(revokedBy) {
    this.status = 'REVOKED';
    this.revokedAt = new Date();
    this.revokedBy = revokedBy;
    return this.save();
};

// Method to extend expiry
invitationSchema.methods.extendExpiry = function(days = 7) {
    if (this.status === 'PENDING') {
        this.expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
        return this.save();
    }
    throw new Error('Cannot extend expiry of non-pending invitation');
};

// Pre-save middleware to generate token and set expiry if not provided
invitationSchema.pre('save', function(next) {
    if (this.isNew) {
        if (!this.token) {
            this.token = crypto.randomBytes(32).toString('hex');
        }
        if (!this.expiresAt) {
            // Default expiry: 7 days from now
            this.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        }
    }
    next();
});

export const Invitation = mongoose.model("Invitation", invitationSchema);