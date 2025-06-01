import Organization from "../../models/organization.model.js";
import { OrganizationUser } from "../../models/organizationUser.model.js";
import { ApiError } from "../../utils/ApiError.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { sendEmail } from "../../utils/sendEmail.js";
import jwt from "jsonwebtoken";
/**
 * Controller to handle user request to join an existing organization
 * @route POST /api/organization/join
 */
export const joinOrganization = asyncHandler(async (req, res) => {
  const { orgSlug, inviteToken } = req.body;
  const userId = req.user._id;

  let organization;
  let status = "PENDING";

  if (inviteToken) {
    // Verify the invite token
    const decoded = jwt.verify(inviteToken, process.env.JWT_SECRET);
    if (decoded.orgSlug !== orgSlug) {
      throw new ApiError(400, "Invalid invitation token");
    }
    status = "APPROVED";
    organization = await Organization.findOne({ slug: decoded.orgSlug.toLowerCase() });
  } else {
    organization = await Organization.findOne({ slug: orgSlug.toLowerCase() });
  }

  if (!organization) {
    throw new ApiError(404, "Organization not found");
  }

  const existingMembership = await OrganizationUser.findOne({
    userId,
    organizationId: organization._id
  });

  if (existingMembership) {
    throw new ApiError(
      400,
      `You already have a ${existingMembership.status.toLowerCase()} membership in this organization`
    );
  }

  const orgUser = await OrganizationUser.create({
    userId,
    organizationId: organization._id,
    userType: "MOBILE_APP",
    role: "MEMBER",
    status,
    permissions: ["READ"]
  });

  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        orgUser,
        status === "APPROVED" 
          ? "Successfully joined the organization"
          : "Join request submitted successfully. Waiting for admin approval."
      )
    );
});

export const inviteToOrganization = asyncHandler(async (req, res) => {
  const { email, orgSlug } = req.body;
  const adminId = req.user._id;

  // Verify admin has rights to invite
  const adminMembership = await OrganizationUser.findOne({
    userId: adminId,
    organizationId: organization._id,
    role: "ADMIN"
  });

  if (!adminMembership) {
    throw new ApiError(403, "You don't have permission to invite users");
  }

  const organization = await Organization.findOne({ slug: orgSlug.toLowerCase() });
  if (!organization) {
    throw new ApiError(404, "Organization not found");
  }

  // Generate invitation token
  const inviteToken = jwt.sign(
    { email, orgSlug, type: "organization_invite" },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  // Generate invitation link
  const inviteLink = `${process.env.FRONTEND_URL}/join-organization?token=${inviteToken}`;

  // Send invitation email
  await sendEmail({
    email,
    subject: `Invitation to join ${organization.name}`,
    template: "organizationInvite",
    data: {
      organizationName: organization.name,
      inviteLink
    }
  });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { email },
        "Invitation sent successfully"
      )
    );
});

/**
 * Controller to handle invitation link redirect
 * @route GET /api/organization/verify-invite
 */
export const verifyInvite = asyncHandler(async (req, res) => {
  const { token } = req.query;

  if (!token) {
    throw new ApiError(400, "Invalid invitation link");
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.type !== "organization_invite") {
      throw new ApiError(400, "Invalid invitation type");
    }

    const organization = await Organization.findOne({ slug: decoded.orgSlug.toLowerCase() });
    if (!organization) {
      throw new ApiError(404, "Organization not found");
    }

    // Redirect to frontend with organization details
    res.redirect(`${process.env.FRONTEND_URL}/join-organization?token=${token}&org=${organization.name}`);
  } catch (error) {
    throw new ApiError(400, "Invalid or expired invitation link");
  }
});
