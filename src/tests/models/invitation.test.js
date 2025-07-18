import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import mongoose from 'mongoose';
import { Invitation, Role, Organization, User } from '../../models/index.js';

describe('Invitation Model', () => {
    let testOrganization;
    let testUser;
    let testRole;

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

        // Create test role
        testRole = new Role({
            name: 'Test Role',
            organization: testOrganization._id,
            createdBy: testUser._id
        });
        await testRole.save();
    });

    afterEach(async () => {
        await Invitation.deleteMany({});
        await Role.deleteMany({});
        await Organization.deleteMany({});
        await User.deleteMany({});
    });

    it('should create an invitation successfully', async () => {
        const invitationData = {
            email: 'invited@example.com',
            organization: testOrganization._id,
            role: testRole._id,
            invitedBy: testUser._id
        };

        const invitation = new Invitation(invitationData);
        const savedInvitation = await invitation.save();

        expect(savedInvitation.email).toBe(invitationData.email);
        expect(savedInvitation.status).toBe('PENDING');
        expect(savedInvitation.token).toBeDefined();
        expect(savedInvitation.expiresAt).toBeDefined();
        expect(savedInvitation.expiresAt > new Date()).toBe(true);
    });

    it('should generate unique tokens', async () => {
        const invitation1 = new Invitation({
            email: 'invited1@example.com',
            organization: testOrganization._id,
            role: testRole._id,
            invitedBy: testUser._id
        });
        await invitation1.save();

        const invitation2 = new Invitation({
            email: 'invited2@example.com',
            organization: testOrganization._id,
            role: testRole._id,
            invitedBy: testUser._id
        });
        await invitation2.save();

        expect(invitation1.token).not.toBe(invitation2.token);
    });

    it('should validate invitation correctly', async () => {
        const invitation = new Invitation({
            email: 'invited@example.com',
            organization: testOrganization._id,
            role: testRole._id,
            invitedBy: testUser._id
        });
        await invitation.save();

        expect(invitation.isValid()).toBe(true);

        // Test expired invitation
        invitation.expiresAt = new Date(Date.now() - 1000);
        expect(invitation.isValid()).toBe(false);

        // Test revoked invitation
        invitation.expiresAt = new Date(Date.now() + 1000000);
        invitation.status = 'REVOKED';
        expect(invitation.isValid()).toBe(false);
    });

    it('should accept invitation', async () => {
        const invitation = new Invitation({
            email: 'invited@example.com',
            organization: testOrganization._id,
            role: testRole._id,
            invitedBy: testUser._id
        });
        await invitation.save();

        await invitation.accept();

        expect(invitation.status).toBe('ACCEPTED');
        expect(invitation.acceptedAt).toBeDefined();
    });

    it('should revoke invitation', async () => {
        const invitation = new Invitation({
            email: 'invited@example.com',
            organization: testOrganization._id,
            role: testRole._id,
            invitedBy: testUser._id
        });
        await invitation.save();

        await invitation.revoke(testUser._id);

        expect(invitation.status).toBe('REVOKED');
        expect(invitation.revokedAt).toBeDefined();
        expect(invitation.revokedBy.toString()).toBe(testUser._id.toString());
    });

    it('should extend expiry for pending invitations', async () => {
        const invitation = new Invitation({
            email: 'invited@example.com',
            organization: testOrganization._id,
            role: testRole._id,
            invitedBy: testUser._id
        });
        await invitation.save();

        const originalExpiry = invitation.expiresAt;
        await invitation.extendExpiry(14); // 14 days

        expect(invitation.expiresAt > originalExpiry).toBe(true);
    });

    it('should not extend expiry for non-pending invitations', async () => {
        const invitation = new Invitation({
            email: 'invited@example.com',
            organization: testOrganization._id,
            role: testRole._id,
            invitedBy: testUser._id,
            status: 'ACCEPTED'
        });
        await invitation.save();

        // Using a try-catch to verify the error is thrown
        let errorThrown = false;
        try {
            await invitation.extendExpiry();
        } catch (error) {
            errorThrown = true;
            expect(error.message).toBe('Cannot extend expiry of non-pending invitation');
        }
        expect(errorThrown).toBe(true);
    });
});