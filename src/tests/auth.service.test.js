import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import authService from '../services/auth.service.js';
import { User } from '../models/user.model.js';
import { Session } from '../models/session.model.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

// Mock dependencies
vi.mock('../models/user.model.js', () => ({
  User: {
    findOne: vi.fn(),
    findById: vi.fn(),
    findByIdAndUpdate: vi.fn()
  }
}));

// Mock Session model
const mockSessionPrototype = {
  save: vi.fn(),
  isValid: vi.fn(),
  isRefreshValid: vi.fn(),
  refresh: vi.fn(),
  updateLastAccessed: vi.fn(),
  revoke: vi.fn()
};

vi.mock('../models/session.model.js', () => {
  const SessionConstructor = vi.fn();
  SessionConstructor.findOne = vi.fn();
  SessionConstructor.findById = vi.fn();
  SessionConstructor.findActiveByToken = vi.fn();
  SessionConstructor.findByRefreshToken = vi.fn();
  SessionConstructor.getActiveSessionsForUser = vi.fn();
  SessionConstructor.cleanupExpired = vi.fn();
  SessionConstructor.revokeAllForUser = vi.fn();
  
  // Set up the constructor to return a mock session instance
  SessionConstructor.prototype = mockSessionPrototype;
  
  return {
    Session: SessionConstructor
  };
});

vi.mock('jsonwebtoken', () => ({
  sign: vi.fn()
}));

vi.mock('bcrypt', () => ({
  compare: vi.fn()
}));

vi.mock('../utils/checkPasswordStrength.js', () => ({
  default: vi.fn().mockReturnValue({ score: 4, feedback: [] })
}));

// Mock environment variables
process.env.ACCESS_TOKEN_SECRATE = 'test-access-secret';
process.env.ACCESS_TOKEN_EXPIRY = '15m';

describe('AuthService', () => {
  let mockUser;
  let mockSession;
  let mockDeviceInfo;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Setup mock data
    mockUser = {
      _id: 'user123',
      email: 'test@example.com',
      password: 'hashedPassword',
      isActive: true,
      organizationRole: 'role123',
      isPasswordCorrect: vi.fn().mockResolvedValue(true),
      toObject: vi.fn().mockReturnValue({
        _id: 'user123',
        email: 'test@example.com',
        organizationRole: 'role123'
      })
    };

    mockSession = {
      _id: 'session123',
      userId: 'user123',
      sessionToken: 'session-token-123',
      refreshToken: 'refresh-token-123',
      isActive: true,
      expiresAt: new Date(Date.now() + 900000), // 15 minutes from now
      refreshExpiresAt: new Date(Date.now() + 604800000), // 7 days from now
      deviceInfo: {
        userAgent: 'test-agent',
        ip: '127.0.0.1'
      },
      isValid: vi.fn().mockReturnValue(true),
      isRefreshValid: vi.fn().mockReturnValue(true),
      refresh: vi.fn().mockResolvedValue(true),
      updateLastAccessed: vi.fn().mockResolvedValue(true),
      revoke: vi.fn().mockResolvedValue(true),
      save: vi.fn().mockResolvedValue(true)
    };

    mockDeviceInfo = {
      userAgent: 'test-agent',
      ip: '127.0.0.1',
      deviceType: 'DESKTOP',
      browser: 'Chrome',
      os: 'Windows'
    };

    // Setup mock implementations
    User.findOne.mockResolvedValue(mockUser);
    User.findById.mockResolvedValue(mockUser);
    User.findByIdAndUpdate.mockResolvedValue(mockUser);

    // Mock Session constructor
    vi.mock('../models/session.model.js', () => {
      const mockSessionInstance = {
        ...mockSession,
        save: vi.fn().mockResolvedValue(mockSession)
      };
      
      return {
        Session: vi.fn().mockImplementation(() => mockSessionInstance)
      };
    }, { virtual: true });
    
    Session.findActiveByToken = vi.fn().mockResolvedValue(mockSession);
    Session.findByRefreshToken = vi.fn().mockResolvedValue(mockSession);
    Session.getActiveSessionsForUser = vi.fn().mockResolvedValue([mockSession]);
    Session.findById = vi.fn().mockResolvedValue(mockSession);

    jwt.sign.mockReturnValue('mock-jwt-token');
    bcrypt.compare.mockResolvedValue(true);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('login', () => {
    it('should authenticate user with valid credentials', async () => {
      const result = await authService.login('test@example.com', 'password123', mockDeviceInfo);

      expect(User.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
      expect(mockUser.isPasswordCorrect).toHaveBeenCalledWith('password123');
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('sessionToken');
    });

    it('should throw error for non-existent user', async () => {
      User.findOne.mockResolvedValue(null);

      await expect(authService.login('nonexistent@example.com', 'password123')).rejects.toThrow('Invalid email or password');
    });

    it('should throw error for inactive user', async () => {
      User.findOne.mockResolvedValue({ ...mockUser, isActive: false });

      await expect(authService.login('test@example.com', 'password123')).rejects.toThrow('Account is disabled');
    });

    it('should throw error for incorrect password', async () => {
      mockUser.isPasswordCorrect.mockResolvedValue(false);

      await expect(authService.login('test@example.com', 'wrongpassword')).rejects.toThrow('Invalid email or password');
    });
  });

  describe('refreshTokens', () => {
    it('should refresh tokens with valid refresh token', async () => {
      const result = await authService.refreshTokens('refresh-token-123', mockDeviceInfo);

      expect(Session.findByRefreshToken).toHaveBeenCalledWith('refresh-token-123');
      expect(mockSession.refresh).toHaveBeenCalled();
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('sessionToken');
    });

    it('should throw error for missing refresh token', async () => {
      await expect(authService.refreshTokens()).rejects.toThrow('Refresh token is required');
    });

    it('should throw error for invalid refresh token', async () => {
      Session.findByRefreshToken.mockResolvedValue(null);

      await expect(authService.refreshTokens('invalid-token')).rejects.toThrow('Invalid or expired refresh token');
    });

    it('should throw error for expired refresh token', async () => {
      mockSession.isRefreshValid.mockReturnValue(false);

      await expect(authService.refreshTokens('expired-token')).rejects.toThrow('Invalid or expired refresh token');
    });
  });

  describe('validateSession', () => {
    it('should validate a valid session token', async () => {
      const result = await authService.validateSession('session-token-123');

      expect(Session.findActiveByToken).toHaveBeenCalledWith('session-token-123');
      expect(mockSession.updateLastAccessed).toHaveBeenCalled();
      expect(result).toEqual(mockSession);
    });

    it('should throw error for missing session token', async () => {
      await expect(authService.validateSession()).rejects.toThrow('Session token is required');
    });

    it('should throw error for invalid session token', async () => {
      Session.findActiveByToken.mockResolvedValue(null);

      await expect(authService.validateSession('invalid-token')).rejects.toThrow('Invalid or expired session');
    });

    it('should throw error for expired session', async () => {
      mockSession.isValid.mockReturnValue(false);

      await expect(authService.validateSession('expired-token')).rejects.toThrow('Invalid or expired session');
    });
  });

  describe('logout', () => {
    it('should revoke a session', async () => {
      Session.findOne.mockResolvedValue(mockSession);

      const result = await authService.logout('session-token-123');

      expect(Session.findOne).toHaveBeenCalledWith({ sessionToken: 'session-token-123', isActive: true });
      expect(mockSession.revoke).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should revoke all sessions for a user', async () => {
      Session.findOne.mockResolvedValue(mockSession);

      const result = await authService.logout('session-token-123', true);

      expect(Session.revokeAllForUser).toHaveBeenCalledWith('user123');
      expect(result).toBe(true);
    });

    it('should throw error for missing session token', async () => {
      await expect(authService.logout()).rejects.toThrow('Session token is required');
    });

    it('should return true if session is already inactive', async () => {
      Session.findOne.mockResolvedValue(null);

      const result = await authService.logout('nonexistent-token');

      expect(result).toBe(true);
    });
  });

  describe('validatePasswordStrength', () => {
    it('should validate a strong password', () => {
      const result = authService.validatePasswordStrength('StrongP@ssw0rd');
      expect(result).toHaveProperty('score', 4);
    });

    it('should throw error for weak password', () => {
      vi.mocked(authService.validatePasswordStrength).mockImplementationOnce(() => {
        throw new Error('Password is too weak');
      });

      expect(() => authService.validatePasswordStrength('weak')).toThrow('Password is too weak');
    });
  });

  describe('getUserSessions', () => {
    it('should get all active sessions for a user', async () => {
      const result = await authService.getUserSessions('user123');

      expect(Session.getActiveSessionsForUser).toHaveBeenCalledWith('user123');
      expect(result).toEqual([mockSession]);
    });

    it('should throw error for missing user ID', async () => {
      await expect(authService.getUserSessions()).rejects.toThrow('User ID is required');
    });
  });

  describe('revokeSession', () => {
    it('should revoke a specific session', async () => {
      const result = await authService.revokeSession('session123', 'user123');

      expect(Session.findById).toHaveBeenCalledWith('session123');
      expect(mockSession.revoke).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should throw error for missing session ID or user ID', async () => {
      await expect(authService.revokeSession()).rejects.toThrow('Session ID and User ID are required');
    });

    it('should throw error for non-existent session', async () => {
      Session.findById.mockResolvedValue(null);

      await expect(authService.revokeSession('nonexistent', 'user123')).rejects.toThrow('Session not found');
    });

    it('should throw error for unauthorized session revocation', async () => {
      mockSession.userId = 'different-user';

      await expect(authService.revokeSession('session123', 'user123')).rejects.toThrow('Not authorized to revoke this session');
    });
  });

  describe('cleanupExpiredSessions', () => {
    it('should clean up expired sessions', async () => {
      Session.cleanupExpired.mockResolvedValue({ modifiedCount: 5 });

      const result = await authService.cleanupExpiredSessions();

      expect(Session.cleanupExpired).toHaveBeenCalled();
      expect(result).toBe(5);
    });

    it('should handle cleanup errors', async () => {
      Session.cleanupExpired.mockRejectedValue(new Error('Database error'));

      await expect(authService.cleanupExpiredSessions()).rejects.toThrow('Failed to clean up expired sessions');
    });
  });
});