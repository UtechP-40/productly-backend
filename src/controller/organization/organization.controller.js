import { User } from "../../models/user.model.js"
import Organization from "../../models/organization.model.js";
import { OrganizationUser } from "../../models/organizationUser.model.js";
import { asyncHandler } from "../../utils/asyncHandler.js";// for try/catch wrap
import slugify from "slugify";

// @route   POST /api/v1/auth/register
// @desc    Register user + create organization + assign admin
export const registerController = asyncHandler(async (req, res) => {
  const {
    firstName,
    lastName,
    email,
    password,
    phoneNumber,
    organizationName,
  } = req.body;

  if (!firstName || !lastName || !email || !password || !organizationName) {
    return res.status(400).json({ message: "All required fields must be filled" });
  }

  // 1. Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({ message: "User already exists with this email" });
  }

  // 2. Create User
  const user = await User.create({
    firstName,
    lastName,
    email,
    password,
    phoneNumber,
    userType: "ADMIN_PORTAL"
  });

  // 3. Create Organization
  const slug = slugify(organizationName, { lower: true, strict: true });
  const existingOrg = await Organization.findOne({ slug });
  if (existingOrg) {
    return res.status(400).json({ message: "Organization name already taken" });
  }

  const organization = await Organization.create({
    name: organizationName,
    slug,
    email: email,
    admin: user._id
  });

  // 4. Create OrganizationUser entry (as OWNER)
  const organizationUser = await OrganizationUser.create({
    userId: user._id,
    organizationId: organization._id,
    userType: "ADMIN_PORTAL",
    role: "OWNER",
    status: "ACTIVE",
    permissions: [
      "MANAGE_USERS",
      "MANAGE_BILLING",
      "MANAGE_ORGANIZATION",
      "VIEW_ANALYTICS",
      "MANAGE_SETTINGS"
    ],
    joinedAt: new Date()
  });

  // 5. Generate tokens
  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  user.refreshTokens = [refreshToken];
  await user.save();

  // 6. Send Response 
  return res.status(201).json({
    message: "User registered successfully",
    user: {
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      avatar: user.avatar,
      userType: user.userType
    },
    organization: {
      _id: organization._id,
      name: organization.name,
      slug: organization.slug
    },
    accessToken,
    refreshToken
  });
});
