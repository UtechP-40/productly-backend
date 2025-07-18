import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const userSchema = new mongoose.Schema(
    {
        firstName: {
            type: String,
            required: true,
            trim: true,
            index: true
        },
        lastName: {
            type: String,
            required: true,
            trim: true,
            index: true
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        password: {
            type: String,
            required: [true, "Password is required"],
            minlength: [8, "Password must be at least 8 characters"],
            select: false
        },
        avatar: {
            type: String,
            default: "https://via.placeholder.com/200"
        },
        phoneNumber: {
            type: String,
            trim: true
        },
        userType: {
            type: String,
            enum: ["ADMIN_PORTAL", "MOBILE_APP"],
            required: true
        },
        isEmailVerified: {
            type: Boolean,
            default: false
        },
        refreshToken: {
            type: String,
            select: false
        },
        // Enhanced fields for RBAC system
        organizationRole: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Role',
            sparse: true
        },
        invitationToken: {
            type: String,
            sparse: true,
            select: false
        },
        invitedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            sparse: true
        },
        lastLoginAt: {
            type: Date
        },
        isActive: {
            type: Boolean,
            default: true,
            index: true
        },
        loginLogs: [{
            device: String,
            ip: String,
            location: String,
            time: { type: Date, default: Date.now }
          }]
          
    },
    {
        timestamps: true
    }
);

// Pre-save hook to hash password
userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

// Method to check password
userSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password);
};

// Method to generate access token
userSchema.methods.generateAccessToken = function () {
    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            userType: this.userType
        },
        process.env.ACCESS_TOKEN_SECRATE,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    );
};

// Method to generate refresh token
userSchema.methods.generateRefreshToken = function () {
    return jwt.sign(
        {
            _id: this._id,
        },
        process.env.REFRESH_TOKEN_SECRATE,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    );
};

// Virtual for full name
userSchema.virtual('fullName').get(function() {
    return `${this.firstName} ${this.lastName}`;
});

export const User = mongoose.model("User", userSchema);