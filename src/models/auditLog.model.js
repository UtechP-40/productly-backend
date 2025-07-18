import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true
        },
        action: {
            type: String,
            required: true,
            index: true
        },
        entityType: {
            type: String,
            required: true,
            index: true,
            enum: ['USER', 'ORGANIZATION', 'ROLE', 'PERMISSION', 'INVITATION', 'SESSION', 'SYSTEM']
        },
        entityId: {
            type: mongoose.Schema.Types.ObjectId,
            sparse: true,
            index: true
        },
        organizationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Organization',
            index: true
        },
        ipAddress: {
            type: String,
            trim: true
        },
        userAgent: {
            type: String
        },
        details: {
            type: mongoose.Schema.Types.Mixed
        },
        changes: {
            before: mongoose.Schema.Types.Mixed,
            after: mongoose.Schema.Types.Mixed
        },
        status: {
            type: String,
            enum: ['SUCCESS', 'FAILURE', 'WARNING'],
            default: 'SUCCESS',
            index: true
        },
        metadata: {
            type: mongoose.Schema.Types.Mixed
        }
    },
    {
        timestamps: true
    }
);

// Compound indexes for common query patterns
auditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
auditLogSchema.index({ organizationId: 1, action: 1, createdAt: -1 });
auditLogSchema.index({ userId: 1, action: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: -1 });

// Static method to log an action
auditLogSchema.statics.logAction = async function(data) {
    try {
        const log = new this(data);
        await log.save();
        return log;
    } catch (error) {
        console.error('Error logging audit action:', error);
        // Don't throw error to prevent disrupting main operations
        return null;
    }
};

// Static method to get logs by entity
auditLogSchema.statics.getByEntity = function(entityType, entityId) {
    return this.find({ entityType, entityId })
        .sort({ createdAt: -1 })
        .populate('userId', 'firstName lastName email');
};

// Static method to get logs by organization
auditLogSchema.statics.getByOrganization = function(organizationId, options = {}) {
    const query = { organizationId };
    
    if (options.entityType) {
        query.entityType = options.entityType;
    }
    
    if (options.action) {
        query.action = options.action;
    }
    
    if (options.userId) {
        query.userId = options.userId;
    }
    
    if (options.status) {
        query.status = options.status;
    }
    
    if (options.startDate && options.endDate) {
        query.createdAt = {
            $gte: options.startDate,
            $lte: options.endDate
        };
    }
    
    const limit = options.limit || 100;
    const skip = options.skip || 0;
    
    return this.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .populate('userId', 'firstName lastName email');
};

// Static method to get logs by user
auditLogSchema.statics.getByUser = function(userId, options = {}) {
    const query = { userId };
    
    if (options.entityType) {
        query.entityType = options.entityType;
    }
    
    if (options.action) {
        query.action = options.action;
    }
    
    if (options.organizationId) {
        query.organizationId = options.organizationId;
    }
    
    if (options.status) {
        query.status = options.status;
    }
    
    if (options.startDate && options.endDate) {
        query.createdAt = {
            $gte: options.startDate,
            $lte: options.endDate
        };
    }
    
    const limit = options.limit || 100;
    const skip = options.skip || 0;
    
    return this.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip);
};

// Static method to get recent activity
auditLogSchema.statics.getRecentActivity = function(options = {}) {
    const query = {};
    
    if (options.organizationId) {
        query.organizationId = options.organizationId;
    }
    
    if (options.entityType) {
        query.entityType = options.entityType;
    }
    
    if (options.status) {
        query.status = options.status;
    }
    
    const limit = options.limit || 20;
    
    return this.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('userId', 'firstName lastName email avatar');
};

export const AuditLog = mongoose.model("AuditLog", auditLogSchema);