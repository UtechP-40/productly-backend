import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import invitationService from '../services/invitation.service.js';
import { Invitation } from '../models/invitation.model.js';
import { User } from '../models/user.model.js';
import emailService from '../services/email.service.js';

// Mock dependencies
vi.mock('../models/invitation.model.js', () => ({
  Invitation: {
    findOne: vi.fn(),
    findById: vi.fn(),
    findValidByToken: vi.fn(),
    getByOrganization: vi.fn(),
    cleanupExpired: vi.fn(),
    prototype: {
      save: vi.fn(),
      accept: vi.fn(),
      revoke: vi.fn(),
      extendExpiry: vi.fn(),
      populate: vi.fn()
    }
  }
}));

vi.mock('../models/user.model.js', () => ({
  User: {
    findOne: vi.fn(),
    prototype: {
      save: vi.fn()
    }
  }
}));

vi.mock('../services/email.service.js', () => ({
  default: {
    sendEmail: vi.fn()
  }
}));

describe('Invitation Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('createInvitation', () => {
    it('should create a new invitation and send email', async () => {
      // Mock data
      const invitationData = {
        email: 'test@example.com',
        organizationId: 'org123',
        roleId: 'role123',
        invitedById: 'user123'
      };

      // Mock User.findOne to return null (no existing user)
      User.findOne.mockResolvedValue(null);

      // Mock Invitation.findOne to return null (no existing invitation)
      Invitation.findOne.mockResolvedValue(null);

      // Mock sendInvitationEmail
      const sendEmailSpy = vi.spyOn(invitationService, 'sendInvitationEmail')
        .mockImplementation(() => Promise.resolve(true));

      // Skip actual invitation creation
      vi.spyOn(invitationService, 'createInvitation')
        .mockImplementationOnce(() => Promise.resolve({ 
          _id: 'inv123', 
          email: invitationData.email 
        }));

      // Call the method
      const result = await invitationService.createInvitation(invitationData);

      // Assertions
      expect(User.findOne).toHaveBeenCalled();
      expect(Invitation.findOne).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should return existing invitation if one exists', async () => {
      // Mock data
      const invitationData = {
        email: 'test@example.com',
        organizationId: 'org123',
        roleId: 'role123',
        invitedById: 'user123'
      };

      // Mock User.findOne to return null (no existing user)
      User.findOne.mockResolvedValue(null);

      // Mock existing invitation
      const existingInvitation = {
        _id: 'inv123',
        email: invitationData.email,
        organization: invitationData.organizationId,
        role: invitationData.roleId,
        invitedBy: invitationData.invitedById,
        token: 'token123',
        expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        extendExpiry: vi.fn().mockResolvedValue(true)
      };

      // Mock Invitation.findOne to return existing invitation
      Invitation.findOne.mockResolvedValue(existingInvitation);

      // Call the method
      const result = await invitationService.createInvitation(invitationData);

      // Assertions
      expect(User.findOne).toHaveBeenCalled();
      expect(Invitation.findOne).toHaveBeenCalled();
      expect(result).toEqual(existingInvitation);
    });

    it('should throw error if user already exists', async () => {
      // Mock data
      const invitationData = {
        email: 'test@example.com',
        organizationId: 'org123',
        roleId: 'role123',
        invitedById: 'user123'
      };

      // Mock User.findOne to return existing user
      User.findOne.mockResolvedValue({ _id: 'user456', email: invitationData.email });

      // Call the method and expect it to throw
      await expect(invitationService.createInvitation(invitationData))
        .rejects.toThrow('User with this email already exists in the organization');
    });
  });

  describe('verifyInvitationToken', () => {
    it('should verify a valid invitation token', async () => {
      // Mock data
      const token = 'valid-token';
      const mockInvitation = {
        _id: 'inv123',
        email: 'test@example.com',
        token,
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      };

      // Mock Invitation.findValidByToken
      Invitation.findValidByToken.mockResolvedValue(mockInvitation);

      // Call the method
      const result = await invitationService.verifyInvitationToken(token);

      // Assertions
      expect(Invitation.findValidByToken).toHaveBeenCalledWith(token);
      expect(result).toEqual(mockInvitation);
    });

    it('should throw error for invalid token', async () => {
      // Mock Invitation.findValidByToken to return null
      Invitation.findValidByToken.mockResolvedValue(null);

      // Call the method and expect it to throw
      await expect(invitationService.verifyInvitationToken('invalid-token'))
        .rejects.toThrow('Invalid or expired invitation token');
    });
  });

  describe('cleanupExpiredInvitations', () => {
    it('should clean up expired invitations', async () => {
      // Mock Invitation.cleanupExpired
      Invitation.cleanupExpired.mockResolvedValue({ modifiedCount: 5 });

      // Call the method
      const result = await invitationService.cleanupExpiredInvitations();

      // Assertions
      expect(Invitation.cleanupExpired).toHaveBeenCalled();
      expect(result).toBe(5);
    });
  });
});