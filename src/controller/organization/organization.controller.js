import { User } from "../../models/user.model.js";
import Organization from "../../models/organization.model.js";
import { OrganizationUser } from "../../models/organizationUser.model.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import slugify from "slugify";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";

async function registerUser(userData, organizationData) {
  const { firstName, lastName, email, password, userType } = userData;
  const { name: orgName, slug } = organizationData;

  if (!firstName || !lastName || !email || !password || !userType) {
    throw new ApiError(400, "All user fields (first name, last name, email, password, user type) are required");
  }

  if (!orgName) {
    throw new ApiError(400, "Organization name is required");
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new ApiError(409, "User already exists with this email");
  }

  const user = await User.create(userData);

  const generatedSlug = slug || slugify(orgName, { lower: true });

  const existingOrg = await Organization.findOne({ slug: generatedSlug });
  if (existingOrg) {
    throw new ApiError(409, "Organization with this slug already exists");
  }

  const organization = await Organization.create({
    name: orgName,
    slug: generatedSlug,
    admin: user._id,
    email
  });

  const permissions =
    userType === "ADMIN_PORTAL"
      ? ["MANAGE_USERS", "MANAGE_BILLING", "MANAGE_ORGANIZATION", "VIEW_ANALYTICS", "MANAGE_SETTINGS"]
      : ["READ", "WRITE", "DELETE", "UPLOAD_MEDIA", "ACCESS_FEATURES"];

  const organizationUser = await OrganizationUser.create({
    userId: user._id,
    organizationId: organization._id,
    userType,
    role: "OWNER",
    status: "ACTIVE",
    permissions
  });

  return new ApiResponse(201, {
    user: {
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      userType: user.userType
    },
    organization: {
      _id: organization._id,
      name: organization.name,
      slug: organization.slug
    },
    organizationUser: {
      _id: organizationUser._id,
      role: organizationUser.role,
      permissions: organizationUser.permissions
    }
  }, "User registered successfully");
}
// main controller finalized for organization regestration
export const registerOrganization = asyncHandler(async (req, res, next) => {
  const { userData, organizationData } = req.body;

  if (!userData || !organizationData) {
    throw new ApiError(400, "User and organization data are required");
  }

  try {
    const response = await registerUser(userData, organizationData);
    res.status(response.statusCode).json(response);
  } catch (error) {
    if (error instanceof ApiError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
        errors: error.errors || null
      });
    } else {
      next(error);
    }
  }
});
