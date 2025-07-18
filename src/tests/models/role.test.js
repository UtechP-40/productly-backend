import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import mongoose from 'mongoose';
import { Role, Permission, Organization, User } from '../../models/index.js';

describe('Role Model', () => {
    let testOrganization;
    let testUser;
    let testPermission;

    beforeEach(async () => {
        // Create test organization
        testOrganization = new Organization({
            name: 'Test Organization',
            slug: 'test-org',
            email: 'test@example.com',
            admin: new mongoose.Types.ObjectId()
        });
        await testOrganization.save();

        // Create test user
        testUser = new User({
            firstName: 'Test',
            lastName: 'User',
            email: 'testuser@example.com',
            password: 'password123',
            userType: 'ADMIN_PORTAL'
        });
        await testUser.save();

        // Create test permission
        testPermission = new Permission({
            name: 'TEST_PERMISSION',
            category: 'USER_MANAGEMENT',
            description: 'Test permission'
        });
        await testPermission.save();
    });

    afterEach(async () => {
        await Role.deleteMany({});
        await Organization.deleteMany({});
        await User.deleteMany({});
        await Permission.deleteMany({});
    });

    it('should create a role successfully', async () => {
        const roleData = {
            name: 'Test Role',
            organization: testOrganization._id,
            permissions: [testPermission._id],
            description: 'Test role description',
            createdBy: testUser._id
        };

        const role = new Role(roleData);
        const savedRole = await role.save();

        expect(savedRole.name).toBe(roleData.name);
        expect(savedRole.organization.toString()).toBe(testOrganization._id.toString());
        expect(savedRole.permissions).toHaveLength(1);
        expect(savedRole.isSystemRole).toBe(false);
        expect(savedRole.isActive).toBe(true);
    });

    it('should enforce unique role names per organization', async () => {
        const roleData = {
            name: 'Duplicate Role',
            organization: testOrganization._id,
            createdBy: testUser._id
        };

        const role1 = new Role(roleData);
        await role1.save();

        const role2 = new Role(roleData);
        await expect(role2.save()).rejects.toThrow();
    });

    it('should check if role has specific permission', async () => {
        const role = new Role({
            name: 'Test Role',
            organization: testOrganization._id,
            permissions: [testPermission._id],
            createdBy: testUser._id
        });
        await role.save();

        expect(role.hasPermission(testPermission._id)).toBe(true);
        expect(role.hasPermission(new mongoose.Types.ObjectId())).toBe(false);
    });

    it('should add and remove permissions', async () => {
        const role = new Role({
            name: 'Test Role',
            organization: testOrganization._id,
            createdBy: testUser._id
        });
        await role.save();

        // Add permission
        role.addPermission(testPermission._id);
        expect(role.permissions).toHaveLength(1);
        expect(role.hasPermission(testPermission._id)).toBe(true);

        // Remove permission
        role.removePermission(testPermission._id);
        expect(role.permissions).toHaveLength(0);
        expect(role.hasPermission(testPermission._id)).toBe(false);
    });
});