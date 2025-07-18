import mongoose from "mongoose";
import crypto from "crypto";

const sessionSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true
        },
        sessionToken: {
            type: String,
            unique: true,
            index: true,
            default: function() {
                return crypto.randomBytes(32).toString('hex');
            }
        },
        refreshToken: {
            type: String,
            unique: true,
            index: true,
            default: function() {
                return crypto.randomBytes(32).toString('hex');
            }
        },
        expiresAt: {
            type: Date,
            index: true,
            default: function() {
                return new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
            }
        },
        refreshExpiresAt: {
            type: Date,
            index: true,
            default: function() {
                return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
            }
        },
        deviceInfo: {
            userAgent: String,
            ip: String,
            location: String,
            deviceType: {
                type: String,
                enum: ['DESKTOP', 'MOBILE', 'TABLET', 'UNKNOWN'],
                default: 'UNKNOWN'
            },
            browser: String,
            os: String
        },
        isActive: {
            type: Boolean,
            default: true,
            index: true
        },
        lastAccessedAt: {
            type: Date,
            default: Date.now
        },
        loginMethod: {
            type: String,
            enum: ['PASSWORD', 'INVITATION', 'SSO', 'REFRESH'],
            default: 'PASSWORD'
        },
        metadata: {
            loginAttempts: {
                type: Number,
                default: 0
            },
            securityFlags: [{
                type: String,
                enum: ['SUSPICIOUS_LOCATION', 'NEW_DEVICE', 'MULTIPLE_SESSIONS', 'RAPID_REQUESTS']
            }],
            sessionDuration: Number // in milliseconds
        }
    },
    {
        timestamps: true
    }
);

// Compound index for user and active sessions
sessionSchema.index({ userId: 1, isActive: 1, expiresAt: 1 });

// Index for cleanup of expired sessions
sessionSchema.index({ expiresAt: 1, isActive: 1 });
sessionSchema.index({ refreshExpiresAt: 1, isActive: 1 });

// Index for device tracking
sessionSchema.index({ 'deviceInfo.ip': 1, userId: 1 });

// Static method to generate secure tokens
sessionSchema.statics.generateTokens = function() {
    return {
        sessionToken: crypto.randomBytes(32).toString('hex'),
        refreshToken: crypto.randomBytes(32).toString('hex')
    };
};

// Static method to find active session by token
sessionSchema.statics.findActiveByToken = function(sessionToken) {
    return this.findOne({
        sessionToken,
        isActive: true,
        expiresAt: { $gt: new Date() }
    }).populate('userId');
};

// Static method to find session by refresh token
sessionSchema.statics.findByRefreshToken = function(refreshToken) {
    return this.findOne({
        refreshToken,
        isActive: true,
        refreshExpiresAt: { $gt: new Date() }
    }).populate('userId');
};

// Static method to get active sessions for user
sessionSchema.statics.getActiveSessionsForUser = function(userId) {
    return this.find({
        userId,
        isActive: true,
        expiresAt: { $gt: new Date() }
    }).sort({ lastAccessedAt: -1 });
};

// Static method to cleanup expired sessions
sessionSchema.statics.cleanupExpired = function() {
    return this.updateMany(
        {
            $or: [
                { expiresAt: { $lt: new Date() } },
                { refreshExpiresAt: { $lt: new Date() } }
            ],
            isActive: true
        },
        {
            isActive: false
        }
    );
};

// Static method to revoke all sessions for user
sessionSchema.statics.revokeAllForUser = function(userId, exceptSessionId = null) {
    const query = { userId, isActive: true };
    if (exceptSessionId) {
        query._id = { $ne: exceptSessionId };
    }
    return this.updateMany(query, { isActive: false });
};

// Method to check if session is valid
sessionSchema.methods.isValid = function() {
    return this.isActive && this.expiresAt > new Date();
};

// Method to check if refresh token is valid
sessionSchema.methods.isRefreshValid = function() {
    return this.isActive && this.refreshExpiresAt > new Date();
};

// Method to refresh session tokens
sessionSchema.methods.refresh = function() {
    const tokens = this.constructor.generateTokens();
    this.sessionToken = tokens.sessionToken;
    this.refreshToken = tokens.refreshToken;
    this.expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    this.refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    this.lastAccessedAt = new Date();
    return this.save();
};

// Method to update last accessed time
sessionSchema.methods.updateLastAccessed = function() {
    this.lastAccessedAt = new Date();
    return this.save();
};

// Method to revoke session
sessionSchema.methods.revoke = function() {
    this.isActive = false;
    return this.save();
};

// Method to add security flag
sessionSchema.methods.addSecurityFlag = function(flag) {
    if (!this.metadata.securityFlags.includes(flag)) {
        this.metadata.securityFlags.push(flag);
        return this.save();
    }
    return Promise.resolve(this);
};

// Method to calculate session duration
sessionSchema.methods.calculateDuration = function() {
    if (this.createdAt && this.lastAccessedAt) {
        this.metadata.sessionDuration = this.lastAccessedAt - this.createdAt;
        return this.save();
    }
    return Promise.resolve(this);
};

// Pre-save middleware to set default expiry times
sessionSchema.pre('save', function(next) {
    if (this.isNew) {
        if (!this.expiresAt) {
            this.expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
        }
        if (!this.refreshExpiresAt) {
            this.refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
        }
    }
    next();
});

export const Session = mongoose.model("Session", sessionSchema);