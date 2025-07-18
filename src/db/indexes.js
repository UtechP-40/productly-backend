import mongoose from "mongoose";
import { User, Role, Invitation, Session, Permission, Organization, OrganizationUser } from "../models/index.js";

/**
 * Create database indexes for performance optimization
 * This function should be called after database connection is established
 */
export const createIndexes = async () => {
    try {
        console.log("Creating database indexes...");

        // User model indexes
        await User.collection.createIndex({ email: 1 }, { unique: true });
        await User.collection.createIndex({ "firstName": 1, "lastName": 1 });
        await User.collection.createIndex({ organizationRole: 1 });
        await User.collection.createIndex({ isActive: 1 });
        await User.collection.createIndex({ invitationToken: 1 }, { sparse: true });
        await User.collection.createIndex({ lastLoginAt: -1 });
        await User.collection.createIndex({ userType: 1, isActive: 1 });

        // Role model indexes
        await Role.collection.createIndex({ name: 1, organization: 1 }, { unique: true });
        await Role.collection.createIndex({ organization: 1, isActive: 1 });
        await Role.collection.createIndex({ isSystemRole: 1, isActive: 1 });
        await Role.collection.createIndex({ createdBy: 1 });

        // Invitation model indexes
        await Invitation.collection.createIndex({ token: 1 }, { unique: true });
        await Invitation.collection.createIndex({ email: 1, organization: 1, status: 1 });
        await Invitation.collection.createIndex({ expiresAt: 1, status: 1 });
        await Invitation.collection.createIndex({ organization: 1, status: 1, createdAt: -1 });
        await Invitation.collection.createIndex({ status: 1 });

        // Session model indexes
        await Session.collection.createIndex({ sessionToken: 1 }, { unique: true });
        await Session.collection.createIndex({ refreshToken: 1 }, { unique: true });
        await Session.collection.createIndex({ userId: 1, isActive: 1, expiresAt: 1 });
        await Session.collection.createIndex({ expiresAt: 1, isActive: 1 });
        await Session.collection.createIndex({ refreshExpiresAt: 1, isActive: 1 });
        await Session.collection.createIndex({ "deviceInfo.ip": 1, userId: 1 });
        await Session.collection.createIndex({ lastAccessedAt: -1 });

        // Permission model indexes (additional to existing ones)
        await Permission.collection.createIndex({ category: 1, isActive: 1 });
        await Permission.collection.createIndex({ context: 1, isActive: 1 });
        await Permission.collection.createIndex({ isSystemPermission: 1, isActive: 1 });

        // Organization model indexes
        await Organization.collection.createIndex({ slug: 1 }, { unique: true });
        await Organization.collection.createIndex({ email: 1 }, { unique: true });
        await Organization.collection.createIndex({ admin: 1 });

        // OrganizationUser model indexes (additional to existing ones)
        await OrganizationUser.collection.createIndex({ userId: 1, organizationId: 1, userType: 1 }, { unique: true });
        await OrganizationUser.collection.createIndex({ status: 1 });
        await OrganizationUser.collection.createIndex({ organizationId: 1, status: 1 });
        await OrganizationUser.collection.createIndex({ invitedBy: 1 });
        await OrganizationUser.collection.createIndex({ joinedAt: -1 });

        // Compound indexes for common query patterns
        await User.collection.createIndex({ userType: 1, isActive: 1, lastLoginAt: -1 });
        await Role.collection.createIndex({ organization: 1, isSystemRole: 1, isActive: 1 });
        await Invitation.collection.createIndex({ organization: 1, invitedBy: 1, createdAt: -1 });
        await Session.collection.createIndex({ userId: 1, "deviceInfo.ip": 1, createdAt: -1 });

        // Text indexes for search functionality
        await User.collection.createIndex({ 
            firstName: "text", 
            lastName: "text", 
            email: "text" 
        }, { 
            name: "user_search_index",
            weights: { 
                firstName: 10, 
                lastName: 10, 
                email: 5 
            }
        });

        await Role.collection.createIndex({ 
            name: "text", 
            description: "text" 
        }, { 
            name: "role_search_index",
            weights: { 
                name: 10, 
                description: 1 
            }
        });

        console.log("Database indexes created successfully");
    } catch (error) {
        console.error("Error creating database indexes:", error);
        throw error;
    }
};

/**
 * Drop all custom indexes (useful for development/testing)
 */
export const dropIndexes = async () => {
    try {
        console.log("Dropping custom database indexes...");

        const collections = [User, Role, Invitation, Session, Permission, Organization, OrganizationUser];
        
        for (const model of collections) {
            const indexes = await model.collection.indexes();
            for (const index of indexes) {
                // Skip the default _id index
                if (index.name !== '_id_') {
                    try {
                        await model.collection.dropIndex(index.name);
                        console.log(`Dropped index ${index.name} from ${model.collection.name}`);
                    } catch (error) {
                        // Index might not exist, continue
                        console.warn(`Could not drop index ${index.name}: ${error.message}`);
                    }
                }
            }
        }

        console.log("Custom database indexes dropped successfully");
    } catch (error) {
        console.error("Error dropping database indexes:", error);
        throw error;
    }
};

/**
 * List all indexes for debugging
 */
export const listIndexes = async () => {
    try {
        const collections = [User, Role, Invitation, Session, Permission, Organization, OrganizationUser];
        const indexInfo = {};

        for (const model of collections) {
            const indexes = await model.collection.indexes();
            indexInfo[model.collection.name] = indexes.map(index => ({
                name: index.name,
                key: index.key,
                unique: index.unique || false,
                sparse: index.sparse || false
            }));
        }

        return indexInfo;
    } catch (error) {
        console.error("Error listing database indexes:", error);
        throw error;
    }
};