import { Permission } from '../models/permission.model.js';

// Default system permissions
const DEFAULT_PERMISSIONS = [
    // Admin Portal Permissions
    {
        name: 'MANAGE_USERS',
        category: 'ADMIN_PORTAL',
        description: 'Create, update, and delete users in the organization',
        isSystemPermission: true
    },
    {
        name: 'MANAGE_BILLING',
        category: 'ADMIN_PORTAL',
        description: 'Access and manage billing information and subscriptions',
        isSystemPermission: true
    },
    {
        name: 'MANAGE_ORGANIZATION',
        category: 'ADMIN_PORTAL',
        description: 'Update organization settings and configuration',
        isSystemPermission: true
    },
    {
        name: 'VIEW_ANALYTICS',
        category: 'ADMIN_PORTAL',
        description: 'Access analytics and reporting dashboards',
        isSystemPermission: true
    },
    {
        name: 'MANAGE_SETTINGS',
        category: 'ADMIN_PORTAL',
        description: 'Configure system settings and preferences',
        isSystemPermission: true
    },
    {
        name: 'INVITE_USERS',
        category: 'ADMIN_PORTAL',
        description: 'Send invitations to new users',
        isSystemPermission: true,
        dependencies: ['MANAGE_USERS']
    },
    {
        name: 'MANAGE_ROLES',
        category: 'ADMIN_PORTAL',
        description: 'Create and manage role templates',
        isSystemPermission: true
    },
    {
        name: 'VIEW_AUDIT_LOGS',
        category: 'ADMIN_PORTAL',
        description: 'Access audit logs and security reports',
        isSystemPermission: true
    },

    // Mobile App Permissions
    {
        name: 'READ',
        category: 'MOBILE_APP',
        description: 'Read access to application data',
        isSystemPermission: true
    },
    {
        name: 'WRITE',
        category: 'MOBILE_APP',
        description: 'Create and update application data',
        isSystemPermission: true,
        dependencies: ['READ']
    },
    {
        name: 'DELETE',
        category: 'MOBILE_APP',
        description: 'Delete application data',
        isSystemPermission: true,
        dependencies: ['WRITE']
    },
    {
        name: 'UPLOAD_MEDIA',
        category: 'MOBILE_APP',
        description: 'Upload and manage media files',
        isSystemPermission: true
    },
    {
        name: 'ACCESS_FEATURES',
        category: 'MOBILE_APP',
        description: 'Access premium or advanced features',
        isSystemPermission: true
    },
    {
        name: 'SHARE_CONTENT',
        category: 'MOBILE_APP',
        description: 'Share content with other users',
        isSystemPermission: true,
        dependencies: ['READ']
    },
    {
        name: 'EXPORT_DATA',
        category: 'MOBILE_APP',
        description: 'Export user data and content',
        isSystemPermission: true,
        dependencies: ['READ']
    },

    // System Permissions (cross-category)
    {
        name: 'SUPER_ADMIN',
        category: 'SYSTEM',
        description: 'Full system access across all organizations',
        isSystemPermission: true
    },
    {
        name: 'SYSTEM_MAINTENANCE',
        category: 'SYSTEM',
        description: 'Perform system maintenance operations',
        isSystemPermission: true
    }
];

/**
 * Seeds the database with default permissions
 * @param {boolean} force - Whether to force recreate all permissions
 */
export const seedPermissions = async (force = false) => {
    try {
        console.log('Starting permission seeding...');

        if (force) {
            console.log('Force mode: Clearing existing permissions...');
            await Permission.deleteMany({ isSystemPermission: true });
        }

        const existingPermissions = await Permission.find({
            isSystemPermission: true
        }).select('name');
        
        const existingNames = existingPermissions.map(p => p.name);
        const newPermissions = DEFAULT_PERMISSIONS.filter(
            p => !existingNames.includes(p.name)
        );

        if (newPermissions.length === 0) {
            console.log('All default permissions already exist.');
            return;
        }

        console.log(`Creating ${newPermissions.length} new permissions...`);
        
        const createdPermissions = await Permission.create(newPermissions);
        
        console.log(`Successfully created ${createdPermissions.length} permissions:`);
        createdPermissions.forEach(p => {
            console.log(`  - ${p.name} (${p.category})`);
        });

        return createdPermissions;
    } catch (error) {
        console.error('Error seeding permissions:', error);
        throw error;
    }
};

/**
 * Gets default permissions for a specific role and user type
 * @param {string} role - The role (OWNER, ADMIN, MANAGER, MEMBER)
 * @param {string} userType - The user type (ADMIN_PORTAL, MOBILE_APP)
 * @returns {string[]} Array of permission names
 */
export const getDefaultPermissionsForRole = (role, userType) => {
    const rolePermissions = {
        ADMIN_PORTAL: {
            OWNER: [
                'MANAGE_USERS', 'MANAGE_BILLING', 'MANAGE_ORGANIZATION',
                'VIEW_ANALYTICS', 'MANAGE_SETTINGS', 'INVITE_USERS',
                'MANAGE_ROLES', 'VIEW_AUDIT_LOGS'
            ],
            ADMIN: [
                'MANAGE_USERS', 'VIEW_ANALYTICS', 'MANAGE_SETTINGS',
                'INVITE_USERS', 'MANAGE_ROLES', 'VIEW_AUDIT_LOGS'
            ],
            MANAGER: [
                'MANAGE_USERS', 'VIEW_ANALYTICS', 'INVITE_USERS'
            ],
            MEMBER: [
                'VIEW_ANALYTICS'
            ]
        },
        MOBILE_APP: {
            OWNER: [
                'READ', 'WRITE', 'DELETE', 'UPLOAD_MEDIA',
                'ACCESS_FEATURES', 'SHARE_CONTENT', 'EXPORT_DATA'
            ],
            ADMIN: [
                'READ', 'WRITE', 'DELETE', 'UPLOAD_MEDIA',
                'ACCESS_FEATURES', 'SHARE_CONTENT'
            ],
            MANAGER: [
                'READ', 'WRITE', 'UPLOAD_MEDIA', 'ACCESS_FEATURES', 'SHARE_CONTENT'
            ],
            MEMBER: [
                'READ', 'SHARE_CONTENT'
            ]
        }
    };

    return rolePermissions[userType]?.[role] || [];
};

export default seedPermissions;