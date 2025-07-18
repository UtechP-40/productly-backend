import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import mongoose from 'mongoose';
import { Session, User } from '../../models/index.js';

describe('Session Model', () => {
    let testUser;

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
    });

    afterEach(async () => {
        await Session.deleteMany({});
        await User.deleteMany({});
    });

    it('should create a session successfully', async () => {
        const tokens = Session.generateTokens();
        const sessionData = {
            userId: testUser._id,
            sessionToken: tokens.sessionToken,
            refreshToken: tokens.refreshToken,
            deviceInfo: {
                userAgent: 'Mozilla/5.0 Test Browser',
                ip: '192.168.1.1',
                location: 'Test Location',
                deviceType: 'DESKTOP'
            }
        };

        const session = new Session(sessionData);
        const savedSession = await session.save();

        expect(savedSession.userId.toString()).toBe(testUser._id.toString());
        expect(savedSession.sessionToken).toBe(tokens.sessionToken);
        expect(savedSession.refreshToken).toBe(tokens.refreshToken);
        expect(savedSession.isActive).toBe(true);
        expect(savedSession.expiresAt).toBeDefined();
        expect(savedSession.refreshExpiresAt).toBeDefined();
    });

    it('should generate unique tokens', () => {
        const tokens1 = Session.generateTokens();
        const tokens2 = Session.generateTokens();

        expect(tokens1.sessionToken).not.toBe(tokens2.sessionToken);
        expect(tokens1.refreshToken).not.toBe(tokens2.refreshToken);
    });

    it('should validate session correctly', async () => {
        const tokens = Session.generateTokens();
        const session = new Session({
            userId: testUser._id,
            sessionToken: tokens.sessionToken,
            refreshToken: tokens.refreshToken
        });
        await session.save();

        expect(session.isValid()).toBe(true);

        // Test expired session
        session.expiresAt = new Date(Date.now() - 1000);
        expect(session.isValid()).toBe(false);

        // Test inactive session
        session.expiresAt = new Date(Date.now() + 1000000);
        session.isActive = false;
        expect(session.isValid()).toBe(false);
    });

    it('should validate refresh token correctly', async () => {
        const tokens = Session.generateTokens();
        const session = new Session({
            userId: testUser._id,
            sessionToken: tokens.sessionToken,
            refreshToken: tokens.refreshToken
        });
        await session.save();

        expect(session.isRefreshValid()).toBe(true);

        // Test expired refresh token
        session.refreshExpiresAt = new Date(Date.now() - 1000);
        expect(session.isRefreshValid()).toBe(false);
    });

    it('should refresh session tokens', async () => {
        const tokens = Session.generateTokens();
        const session = new Session({
            userId: testUser._id,
            sessionToken: tokens.sessionToken,
            refreshToken: tokens.refreshToken
        });
        await session.save();

        const originalSessionToken = session.sessionToken;
        const originalRefreshToken = session.refreshToken;

        await session.refresh();

        expect(session.sessionToken).not.toBe(originalSessionToken);
        expect(session.refreshToken).not.toBe(originalRefreshToken);
        expect(session.lastAccessedAt).toBeDefined();
    });

    it('should revoke session', async () => {
        const tokens = Session.generateTokens();
        const session = new Session({
            userId: testUser._id,
            sessionToken: tokens.sessionToken,
            refreshToken: tokens.refreshToken
        });
        await session.save();

        await session.revoke();

        expect(session.isActive).toBe(false);
    });

    it('should add security flags', async () => {
        const tokens = Session.generateTokens();
        const session = new Session({
            userId: testUser._id,
            sessionToken: tokens.sessionToken,
            refreshToken: tokens.refreshToken
        });
        await session.save();

        await session.addSecurityFlag('SUSPICIOUS_LOCATION');
        expect(session.metadata.securityFlags).toContain('SUSPICIOUS_LOCATION');

        // Should not add duplicate flags
        await session.addSecurityFlag('SUSPICIOUS_LOCATION');
        expect(session.metadata.securityFlags.filter(f => f === 'SUSPICIOUS_LOCATION')).toHaveLength(1);
    });

    it('should update last accessed time', async () => {
        const tokens = Session.generateTokens();
        const session = new Session({
            userId: testUser._id,
            sessionToken: tokens.sessionToken,
            refreshToken: tokens.refreshToken
        });
        await session.save();

        const originalLastAccessed = session.lastAccessedAt;
        
        // Wait a bit to ensure time difference
        await new Promise(resolve => setTimeout(resolve, 10));
        
        await session.updateLastAccessed();

        expect(session.lastAccessedAt > originalLastAccessed).toBe(true);
    });
});