import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import mongoose from 'mongoose';
import { Permission } from '../../models/permission.model.js';

describe('Permission Model', () => {
    beforeEach(async () => {
        // Clear the collection before each test
        await Permission.deleteMany({});
    });

    afterEach(async () => {
        // Clean up after each test
        await Permission.deleteMany({});
    });

    describe('Schema Validation', () => {
        it('should create a valid permission', async () => {
            const permissionData = {
                name: 'MANAGE_USERS',
                category: 'USER_MANAGEMENT',
                context: 'ADMIN_PORTAL',
                description: 'Allows managing users in the organization',
                isSystemPermission: true
            };

            const permission = new Permission(permissionData);
            const savedPermission = await permission.save();

            expect(savedPermission.name).toBe('MANAGE_USERS');
            expect(savedPermission.category).toBe('USER_MANAGEMENT');
            expect(savedPermission.context).toBe('ADMIN_PORTAL');
            expect(savedPermission.description).toBe('Allows managing users in the organization');
            expect(savedPermission.isSystemPermission).toBe(true);
            expect(savedPermission.isActive).toBe(true);
        });

        it('should require name field', async () => {
            const permission = new Permission({
                category: 'USER_MANAGEMENT',
                description: 'Test permission'
            });

            await expect(permission.save()).rejects.toThrow();
        });

        it('should require category field', async () => {
            const permission = new Permission({
                name: 'TEST_PERMISSION',
                description: 'Test permission'
            });

            await expect(permission.save()).rejects.toThrow();
        });

        it('should require description field', async () => {
            const permission = new Permission({
                name: 'TEST_PERMISSION',
                category: 'USER_MANAGEMENT'
            });

            await expect(permission.save()).rejects.toThrow();
        });

        it('should enforce unique name constraint', async () => {
            const permissionData = {
                name: 'DUPLICATE_PERMISSION',
                category: 'USER_MANAGEMENT',
                description: 'First permission'
            };

            await Permission.create(permissionData);

            const duplicatePermission = new Permission({
                ...permissionData,
                description: 'Second permission'
            });

            await expect(duplicatePermission.save()).rejects.toThrow();
        });

        it('should validate category enum values', async () => {
            const permission = new Permission({
                name: 'TEST_PERMISSION',
                category: 'INVALID_CATEGORY',
                description: 'Test permission'
            });

            await expect(permission.save()).rejects.toThrow();
        });

        it('should convert name to uppercase', async () => {
            const permission = new Permission({
                name: 'manage_users',
                category: 'USER_MANAGEMENT',
                description: 'Test permission'
            });

            const savedPermission = await permission.save();
            expect(savedPermission.name).toBe('MANAGE_USERS');
        });
    });

    describe('Static Methods', () => {
        beforeEach(async () => {
            // Clear and create fresh test permissions
            await Permission.deleteMany({});
            await Permission.create([
                {
                    name: 'PERM_TEST_USER_MGMT_1',
                    category: 'USER_MANAGEMENT',
                    context: 'ADMIN_PORTAL',
                    description: 'User management permission 1',
                    isActive: true
                },
                {
                    name: 'PERM_TEST_USER_MGMT_2',
                    category: 'USER_MANAGEMENT',
                    context: 'ADMIN_PORTAL',
                    description: 'User management permission 2',
                    isActive: false
                },
                {
                    name: 'PERM_TEST_BILLING_1',
                    category: 'BILLING_MANAGEMENT',
                    context: 'MOBILE_APP',
                    description: 'Billing permission 1',
                    isActive: true
                },
                {
                    name: 'PERM_TEST_SYSTEM_1',
                    category: 'ANALYTICS_ACCESS',
                    context: 'SYSTEM',
                    description: 'System permission 1',
                    isSystemPermission: true,
                    isActive: true
                }
            ]);
        });

        it('should get permissions by category', async () => {
            const userMgmtPermissions = await Permission.getByCategory('USER_MANAGEMENT');
            expect(userMgmtPermissions).toHaveLength(1);
            expect(userMgmtPermissions[0].name).toBe('PERM_TEST_USER_MGMT_1');
        });

        it('should get system permissions', async () => {
            const systemPermissions = await Permission.getSystemPermissions();
            expect(systemPermissions).toHaveLength(1);
            expect(systemPermissions[0].name).toBe('PERM_TEST_SYSTEM_1');
        });

        it('should get permissions by context', async () => {
            const adminPortalPermissions = await Permission.getByContext('ADMIN_PORTAL');
            expect(adminPortalPermissions).toHaveLength(1);
            expect(adminPortalPermissions[0].name).toBe('PERM_TEST_USER_MGMT_1');
        });

        it('should only return active permissions', async () => {
            const userMgmtPermissions = await Permission.getByCategory('USER_MANAGEMENT');
            expect(userMgmtPermissions.every(p => p.isActive)).toBe(true);
        });
    });

    describe('Instance Methods', () => {
        it('should check if permission has dependencies', async () => {
            const permissionWithDeps = new Permission({
                name: 'PERMISSION_WITH_DEPS',
                category: 'USER_MANAGEMENT',
                description: 'Permission with dependencies',
                dependencies: ['MANAGE_USERS', 'VIEW_USERS']
            });

            const permissionWithoutDeps = new Permission({
                name: 'PERMISSION_WITHOUT_DEPS',
                category: 'USER_MANAGEMENT',
                description: 'Permission without dependencies'
            });

            expect(permissionWithDeps.hasDependencies()).toBe(true);
            expect(permissionWithoutDeps.hasDependencies()).toBe(false);
        });
    });
});