import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import mongoose from 'mongoose';
import { AuditLog, User, Organization } from '../../models/index.js';

describe('AuditLog Model', () => {
    let testUser;
    let testOrganization;

    beforeEach(async () => {
        // Create test user
        testUser = new User({
            firstName: 'Test',
            lastName: 'User',
            email: 'testuser@example.com',
            password: 'password123',
            userType: 'ADMIN_PORTAL'
        });
        await testUser.save();

        // Create test organization
        testOrganization = new Organization({
            name: 'Test Organization',
            slug: 'test-org',
            email: 'test@example.com',
            admin: testUser._id
        });
        await testOrganization.save();
    });

    afterEach(async () => {
        await AuditLog.deleteMany({});
        await User.deleteMany({});
        await Organization.deleteMany({});
    });

    it('should create an audit log successfully', async () => {
        const logData = {
            userId: testUser._id,
            action: 'USER_LOGIN',
            entityType: 'USER',
            entityId: testUser._id,
            organizationId: testOrganization._id,
            ipAddress: '192.168.1.1',
            userAgent: 'Mozilla/5.0 Test Browser',
            details: { message: 'User logged in successfully' },
            status: 'SUCCESS'
        };

        const log = new AuditLog(logData);
        const savedLog = await log.save();

        expect(savedLog.userId.toString()).toBe(testUser._id.toString());
        expect(savedLog.action).toBe(logData.action);
        expect(savedLog.entityType).toBe(logData.entityType);
        expect(savedLog.status).toBe(logData.status);
        expect(savedLog.createdAt).toBeDefined();
    });

    it('should log an action using static method', async () => {
        const logData = {
            userId: testUser._id,
            action: 'USER_CREATED',
            entityType: 'USER',
            entityId: new mongoose.Types.ObjectId(),
            organizationId: testOrganization._id,
            details: { message: 'New user created' }
        };

        const log = await AuditLog.logAction(logData);

        expect(log).toBeDefined();
        expect(log.userId.toString()).toBe(testUser._id.toString());
        expect(log.action).toBe(logData.action);
        expect(log.status).toBe('SUCCESS'); // Default value
    });

    it('should get logs by entity', async () => {
        const entityId = new mongoose.Types.ObjectId();
        
        // Create multiple logs for the same entity
        await AuditLog.create([
            {
                userId: testUser._id,
                action: 'ENTITY_CREATED',
                entityType: 'ROLE',
                entityId,
                organizationId: testOrganization._id
            },
            {
                userId: testUser._id,
                action: 'ENTITY_UPDATED',
                entityType: 'ROLE',
                entityId,
                organizationId: testOrganization._id
            }
        ]);

        const logs = await AuditLog.getByEntity('ROLE', entityId);

        expect(logs).toHaveLength(2);
        expect(logs[0].entityId.toString()).toBe(entityId.toString());
        expect(logs[1].entityId.toString()).toBe(entityId.toString());
    });

    it('should get logs by organization', async () => {
        // Create logs for the organization
        await AuditLog.create([
            {
                userId: testUser._id,
                action: 'USER_INVITED',
                entityType: 'USER',
                organizationId: testOrganization._id
            },
            {
                userId: testUser._id,
                action: 'ROLE_CREATED',
                entityType: 'ROLE',
                organizationId: testOrganization._id
            }
        ]);

        const logs = await AuditLog.getByOrganization(testOrganization._id);

        expect(logs).toHaveLength(2);
        expect(logs[0].organizationId.toString()).toBe(testOrganization._id.toString());
        expect(logs[1].organizationId.toString()).toBe(testOrganization._id.toString());
    });

    it('should get logs by user', async () => {
        // Create logs for the user
        await AuditLog.create([
            {
                userId: testUser._id,
                action: 'USER_LOGIN',
                entityType: 'USER',
                entityId: testUser._id
            },
            {
                userId: testUser._id,
                action: 'USER_LOGOUT',
                entityType: 'USER',
                entityId: testUser._id
            }
        ]);

        const logs = await AuditLog.getByUser(testUser._id);

        expect(logs).toHaveLength(2);
        expect(logs[0].userId.toString()).toBe(testUser._id.toString());
        expect(logs[1].userId.toString()).toBe(testUser._id.toString());
    });

    it('should get recent activity', async () => {
        // Create multiple logs with different timestamps
        await AuditLog.create([
            {
                userId: testUser._id,
                action: 'ACTION_1',
                entityType: 'USER',
                createdAt: new Date(Date.now() - 1000)
            },
            {
                userId: testUser._id,
                action: 'ACTION_2',
                entityType: 'USER',
                createdAt: new Date(Date.now() - 2000)
            },
            {
                userId: testUser._id,
                action: 'ACTION_3',
                entityType: 'USER',
                createdAt: new Date(Date.now() - 3000)
            }
        ]);

        const logs = await AuditLog.getRecentActivity({ limit: 2 });

        expect(logs).toHaveLength(2);
        expect(logs[0].action).toBe('ACTION_1'); // Most recent first
        expect(logs[1].action).toBe('ACTION_2');
    });
});