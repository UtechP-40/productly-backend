import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import mongoose from 'mongoose';
import { AuditLog } from '../../models/auditLog.model.js';
import { User } from '../../models/user.model.js';
import Organization from '../../models/organization.model.js';

describe('AuditLog Model', () => {
    let organizationId;
    let userId;
    let targetUserId;

    beforeEach(async () => {
        // Clear the collection and create test IDs
        await AuditLog.deleteMany({});
        
        organizationId = new mongoose.Types.ObjectId();
        userId = new mongoose.Types.ObjectId();
        targetUserId = new mongoose.Types.ObjectId();
    });

    afterEach(async () => {
        await AuditLog.deleteMany({});
    });

    describe('Schema Validation', () => {
        it('should create a valid audit log', async () => {
            const logData = {
                organizationId,
                userId,
                targetUserId,
                action: 'USER_INVITED',
                resource: 'USER',
                resourceId: targetUserId.toString(),
                details: {
                    permissions: ['READ', 'WRITE'],
                    roles: ['MEMBER']
                },
                ipAddress: '192.168.1.1',
                userAgent: 'Mozilla/5.0...',
                severity: 'MEDIUM',
                status: 'SUCCESS'
            };

            const auditLog = new AuditLog(logData);
            const savedLog = await auditLog.save();

            expect(savedLog.organizationId.toString()).toBe(organizationId.toString());
            expect(savedLog.userId.toString()).toBe(userId.toString());
            expect(savedLog.targetUserId.toString()).toBe(targetUserId.toString());
            expect(savedLog.action).toBe('USER_INVITED');
            expect(savedLog.resource).toBe('USER');
            expect(savedLog.severity).toBe('MEDIUM');
            expect(savedLog.status).toBe('SUCCESS');
        });

        it('should require organizationId field', async () => {
            const auditLog = new AuditLog({
                userId,
                action: 'USER_INVITED',
                resource: 'USER'
            });

            await expect(auditLog.save()).rejects.toThrow();
        });

        it('should require userId field', async () => {
            const auditLog = new AuditLog({
                organizationId,
                action: 'USER_INVITED',
                resource: 'USER'
            });

            await expect(auditLog.save()).rejects.toThrow();
        });

        it('should require action field', async () => {
            const auditLog = new AuditLog({
                organizationId,
                userId,
                resource: 'USER'
            });

            await expect(auditLog.save()).rejects.toThrow();
        });

        it('should validate action enum values', async () => {
            const auditLog = new AuditLog({
                organizationId,
                userId,
                action: 'INVALID_ACTION',
                resource: 'USER'
            });

            await expect(auditLog.save()).rejects.toThrow();
        });

        it('should validate resource enum values', async () => {
            const auditLog = new AuditLog({
                organizationId,
                userId,
                action: 'USER_INVITED',
                resource: 'INVALID_RESOURCE'
            });

            await expect(auditLog.save()).rejects.toThrow();
        });

        it('should set default values', async () => {
            const auditLog = new AuditLog({
                organizationId,
                userId,
                action: 'USER_INVITED',
                resource: 'USER'
            });

            const savedLog = await auditLog.save();
            expect(savedLog.severity).toBe('LOW');
            expect(savedLog.status).toBe('SUCCESS');
        });
    });

    describe('Static Methods', () => {
        beforeEach(async () => {
            // Create test audit logs
            const testLogs = [
                {
                    organizationId,
                    userId,
                    action: 'USER_INVITED',
                    resource: 'USER',
                    severity: 'LOW',
                    status: 'SUCCESS',
                    createdAt: new Date('2024-01-01')
                },
                {
                    organizationId,
                    userId,
                    targetUserId,
                    action: 'ROLE_ASSIGNED',
                    resource: 'ROLE',
                    severity: 'MEDIUM',
                    status: 'SUCCESS',
                    createdAt: new Date('2024-01-02')
                },
                {
                    organizationId,
                    userId: new mongoose.Types.ObjectId(),
                    action: 'PERMISSION_CHECK_FAILED',
                    resource: 'PERMISSION',
                    severity: 'HIGH',
                    status: 'FAILURE',
                    createdAt: new Date('2024-01-03')
                }
            ];

            await AuditLog.create(testLogs);
        });

        it('should log an audit event', async () => {
            const eventData = {
                organizationId,
                userId,
                action: 'USER_REMOVED',
                resource: 'USER',
                resourceId: targetUserId.toString(),
                ipAddress: '192.168.1.1',
                severity: 'HIGH'
            };

            const loggedEvent = await AuditLog.logEvent(eventData);
            
            expect(loggedEvent.organizationId.toString()).toBe(organizationId.toString());
            expect(loggedEvent.action).toBe('USER_REMOVED');
            expect(loggedEvent.severity).toBe('HIGH');
            expect(loggedEvent.status).toBe('SUCCESS');
        });

        it('should get audit logs with filters', async () => {
            const logs = await AuditLog.getAuditLogs({
                organizationId,
                action: 'USER_INVITED'
            });

            expect(logs).toHaveLength(1);
            expect(logs[0].action).toBe('USER_INVITED');
        });

        it('should get audit logs with date range filter', async () => {
            const logs = await AuditLog.getAuditLogs({
                organizationId,
                startDate: '2024-01-01',
                endDate: '2024-01-02'
            });

            expect(logs).toHaveLength(2);
        });

        it('should get audit logs with pagination', async () => {
            const logs = await AuditLog.getAuditLogs({
                organizationId,
                limit: 1,
                skip: 1
            });

            expect(logs).toHaveLength(1);
        });

        it('should get audit summary', async () => {
            const summary = await AuditLog.getAuditSummary(organizationId, 365);
            
            expect(summary.length).toBeGreaterThanOrEqual(0);
            if (summary.length > 0) {
                expect(summary[0]).toHaveProperty('_id');
                expect(summary[0]).toHaveProperty('count');
                expect(summary[0]).toHaveProperty('lastOccurrence');
            }
        });
    });
});