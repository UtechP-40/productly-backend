import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import mongoose from 'mongoose';
import { RoleTemplate } from '../../models/roleTemplate.model.js';
import { Permission } from '../../models/permission.model.js';

describe('RoleTemplate Model', () => {
    let organizationId;
    let userId;

    beforeEach(async () => {
        // Clear collections and create test data
        await RoleTemplate.deleteMany({});
        await Permission.deleteMany({});
        
        organizationId = new mongoose.Types.ObjectId();
        userId = new mongoose.Types.ObjectId();

        // Create test permissions
        await Permission.create([
            {
                name: 'ROLE_TEST_MANAGE_USERS',
                category: 'USER_MANAGEMENT',
                context: 'ADMIN_PORTAL',
                description: 'Manage users',
                isActive: true
            },
            {
                name: 'ROLE_TEST_VIEW_ANALYTICS',
                category: 'ANALYTICS_ACCESS',
                context: 'ADMIN_PORTAL',
                description: 'View analytics',
                isActive: true
            },
            {
                name: 'ROLE_TEST_READ_DATA',
                category: 'CONTENT_MANAGEMENT',
                context: 'MOBILE_APP',
                description: 'Read data',
                isActive: true
            }
        ]);
    });

    afterEach(async () => {
        await RoleTemplate.deleteMany({});
        await Permission.deleteMany({});
    });

    describe('Schema Validation', () => {
        it('should create a valid role template', async () => {
            const templateData = {
                name: 'Custom Admin',
                organizationId,
                userType: 'ADMIN_PORTAL',
                baseRole: 'ADMIN',
                permissions: ['ROLE_TEST_MANAGE_USERS', 'ROLE_TEST_VIEW_ANALYTICS'],
                description: 'Custom admin role template',
                createdBy: userId
            };

            const template = new RoleTemplate(templateData);
            const savedTemplate = await template.save();

            expect(savedTemplate.name).toBe('Custom Admin');
            expect(savedTemplate.organizationId.toString()).toBe(organizationId.toString());
            expect(savedTemplate.userType).toBe('ADMIN_PORTAL');
            expect(savedTemplate.baseRole).toBe('ADMIN');
            // Permissions will be filtered by pre-save middleware, so we check they exist
            expect(Array.isArray(savedTemplate.permissions)).toBe(true);
            expect(savedTemplate.isActive).toBe(true);
            expect(savedTemplate.isDefault).toBe(false);
        });

        it('should require name field', async () => {
            const template = new RoleTemplate({
                organizationId,
                userType: 'ADMIN_PORTAL',
                baseRole: 'ADMIN',
                createdBy: userId
            });

            await expect(template.save()).rejects.toThrow();
        });

        it('should require organizationId field', async () => {
            const template = new RoleTemplate({
                name: 'Test Template',
                userType: 'ADMIN_PORTAL',
                baseRole: 'ADMIN',
                createdBy: userId
            });

            await expect(template.save()).rejects.toThrow();
        });

        it('should validate userType enum values', async () => {
            const template = new RoleTemplate({
                name: 'Test Template',
                organizationId,
                userType: 'INVALID_TYPE',
                baseRole: 'ADMIN',
                createdBy: userId
            });

            await expect(template.save()).rejects.toThrow();
        });

        it('should validate baseRole enum values', async () => {
            const template = new RoleTemplate({
                name: 'Test Template',
                organizationId,
                userType: 'ADMIN_PORTAL',
                baseRole: 'INVALID_ROLE',
                createdBy: userId
            });

            await expect(template.save()).rejects.toThrow();
        });
    });

    describe('Pre-save Middleware', () => {
        it('should filter permissions based on userType', async () => {
            const template = new RoleTemplate({
                name: 'Mixed Permissions Template',
                organizationId,
                userType: 'ADMIN_PORTAL',
                baseRole: 'ADMIN',
                permissions: ['ROLE_TEST_MANAGE_USERS', 'ROLE_TEST_READ_DATA'], // Mixed admin and mobile permissions
                createdBy: userId
            });

            const savedTemplate = await template.save();
            
            // Should only keep ADMIN_PORTAL permissions
            expect(savedTemplate.permissions).toContain('ROLE_TEST_MANAGE_USERS');
            expect(savedTemplate.permissions).not.toContain('ROLE_TEST_READ_DATA');
        });

        it('should remove invalid permissions', async () => {
            const template = new RoleTemplate({
                name: 'Invalid Permissions Template',
                organizationId,
                userType: 'ADMIN_PORTAL',
                baseRole: 'ADMIN',
                permissions: ['ROLE_TEST_MANAGE_USERS', 'INVALID_PERMISSION'],
                createdBy: userId
            });

            const savedTemplate = await template.save();
            
            // Should only keep valid permissions
            expect(savedTemplate.permissions).toEqual(['ROLE_TEST_MANAGE_USERS']);
            expect(savedTemplate.permissions).not.toContain('INVALID_PERMISSION');
        });
    });

    describe('Static Methods', () => {
        beforeEach(async () => {
            // Create test templates
            await RoleTemplate.create([
                {
                    name: 'Admin Template 1',
                    organizationId,
                    userType: 'ADMIN_PORTAL',
                    baseRole: 'ADMIN',
                    isDefault: true,
                    isActive: true,
                    createdBy: userId
                },
                {
                    name: 'Admin Template 2',
                    organizationId,
                    userType: 'ADMIN_PORTAL',
                    baseRole: 'MANAGER',
                    isDefault: false,
                    isActive: true,
                    createdBy: userId
                },
                {
                    name: 'Mobile Template 1',
                    organizationId,
                    userType: 'MOBILE_APP',
                    baseRole: 'MEMBER',
                    isDefault: true,
                    isActive: true,
                    createdBy: userId
                },
                {
                    name: 'Inactive Template',
                    organizationId,
                    userType: 'ADMIN_PORTAL',
                    baseRole: 'ADMIN',
                    isActive: false,
                    createdBy: userId
                }
            ]);
        });

        it('should get templates by organization', async () => {
            const templates = await RoleTemplate.getByOrganization(organizationId);
            expect(templates).toHaveLength(3); // Only active templates
            
            // Should be sorted with default templates first
            expect(templates[0].isDefault).toBe(true);
        });

        it('should get templates by organization and userType', async () => {
            const adminTemplates = await RoleTemplate.getByOrganization(organizationId, 'ADMIN_PORTAL');
            expect(adminTemplates).toHaveLength(2);
            expect(adminTemplates.every(t => t.userType === 'ADMIN_PORTAL')).toBe(true);
        });

        it('should get default template for role', async () => {
            const defaultTemplate = await RoleTemplate.getDefaultTemplate(
                organizationId,
                'ADMIN_PORTAL',
                'ADMIN'
            );
            
            expect(defaultTemplate).toBeTruthy();
            expect(defaultTemplate.name).toBe('Admin Template 1');
            expect(defaultTemplate.isDefault).toBe(true);
        });
    });

    describe('Instance Methods', () => {
        it('should increment usage count', async () => {
            const template = await RoleTemplate.create({
                name: 'Usage Test Template',
                organizationId,
                userType: 'ADMIN_PORTAL',
                baseRole: 'ADMIN',
                createdBy: userId
            });

            expect(template.metadata.usageCount).toBe(0);
            expect(template.metadata.lastUsed).toBeUndefined();

            await template.incrementUsage();

            expect(template.metadata.usageCount).toBe(1);
            expect(template.metadata.lastUsed).toBeInstanceOf(Date);
        });
    });
});