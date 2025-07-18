import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { ApiError } from "../utils/ApiError.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Email Service
 * Handles email sending and template management
 */
class EmailService {
  constructor() {
    this.transporter = null;
    this.initialized = false;
    this.templates = {};
    this.defaultFrom = process.env.EMAIL_FROM || "noreply@example.com";
    this.initialize();
  }

  /**
   * Initialize email transporter
   */
  initialize() {
    try {
      // Create nodemailer transporter
      this.transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        secure: process.env.EMAIL_SECURE === "true",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD
        }
      });

      // Load email templates
      this.loadTemplates();

      this.initialized = true;
    } catch (error) {
      console.error("Failed to initialize email service:", error);
      // Don't throw error here to allow app to start without email
      this.initialized = false;
    }
  }

  /**
   * Load email templates from templates directory
   */
  loadTemplates() {
    try {
      const templatesDir = path.join(__dirname, "../templates/emails");
      
      // Create templates directory if it doesn't exist
      if (!fs.existsSync(templatesDir)) {
        fs.mkdirSync(templatesDir, { recursive: true });
        
        // Create default invitation template
        const defaultInvitationTemplate = this.getDefaultInvitationTemplate();
        fs.writeFileSync(path.join(templatesDir, "invitation.html"), defaultInvitationTemplate);
      }

      // Read all template files
      const templateFiles = fs.readdirSync(templatesDir).filter(file => file.endsWith(".html"));
      
      // Load each template
      templateFiles.forEach(file => {
        const templateName = path.basename(file, ".html");
        const templateContent = fs.readFileSync(path.join(templatesDir, file), "utf8");
        this.templates[templateName] = templateContent;
      });
    } catch (error) {
      console.error("Failed to load email templates:", error);
    }
  }

  /**
   * Get default invitation template
   * @returns {string} HTML template
   */
  getDefaultInvitationTemplate() {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invitation to Join</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background-color: #4a6cf7;
      color: white;
      padding: 20px;
      text-align: center;
    }
    .content {
      padding: 20px;
      background-color: #f9f9f9;
    }
    .button {
      display: inline-block;
      background-color: #4a6cf7;
      color: white;
      text-decoration: none;
      padding: 12px 24px;
      border-radius: 4px;
      margin: 20px 0;
    }
    .footer {
      text-align: center;
      padding: 20px;
      font-size: 12px;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>You've Been Invited!</h1>
    </div>
    <div class="content">
      <p>Hello,</p>
      <p>You have been invited by {{inviterName}} to join {{organizationName}} as a {{roleName}}.</p>
      <p>Click the button below to accept this invitation and set up your account:</p>
      <p style="text-align: center;">
        <a href="{{invitationLink}}" class="button">Accept Invitation</a>
      </p>
      <p>This invitation will expire on {{expiryDate}}.</p>
      <p>If you have any questions, please contact the person who invited you.</p>
    </div>
    <div class="footer">
      <p>If you received this email by mistake, please ignore it.</p>
      <p>© {{currentYear}} {{organizationName}}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
  }

  /**
   * Compile email template with context data
   * @param {string} templateName - Template name
   * @param {Object} context - Context data for template
   * @returns {string} Compiled HTML
   */
  compileTemplate(templateName, context) {
    try {
      let template = this.templates[templateName];
      
      if (!template) {
        console.warn(`Template ${templateName} not found, using default`);
        template = this.getDefaultInvitationTemplate();
      }

      // Add current year to context
      context.currentYear = new Date().getFullYear();

      // Simple template variable replacement
      return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        return context[key] !== undefined ? context[key] : match;
      });
    } catch (error) {
      console.error("Failed to compile email template:", error);
      throw new ApiError(500, "Failed to compile email template", error);
    }
  }

  /**
   * Send email
   * @param {Object} emailData - Email data
   * @param {string} emailData.to - Recipient email
   * @param {string} emailData.subject - Email subject
   * @param {string} emailData.template - Template name
   * @param {Object} emailData.context - Context data for template
   * @param {string} [emailData.from] - Sender email (optional)
   * @returns {Object} Send result
   */
  async sendEmail(emailData) {
    try {
      if (!this.initialized) {
        this.initialize();
        if (!this.initialized) {
          throw new ApiError(500, "Email service not initialized");
        }
      }

      const { to, subject, template, context, from = this.defaultFrom } = emailData;

      if (!to || !subject) {
        throw new ApiError(400, "Email recipient and subject are required");
      }

      let html;
      if (template) {
        html = this.compileTemplate(template, context || {});
      } else if (emailData.html) {
        html = emailData.html;
      } else {
        throw new ApiError(400, "Email template or HTML content is required");
      }

      const mailOptions = {
        from,
        to,
        subject,
        html
      };

      // Add CC if provided
      if (emailData.cc) {
        mailOptions.cc = emailData.cc;
      }

      // Add BCC if provided
      if (emailData.bcc) {
        mailOptions.bcc = emailData.bcc;
      }

      // Add attachments if provided
      if (emailData.attachments) {
        mailOptions.attachments = emailData.attachments;
      }

      // Send email
      const result = await this.transporter.sendMail(mailOptions);
      return result;
    } catch (error) {
      console.error("Failed to send email:", error);
      throw error.statusCode ? error : new ApiError(500, "Failed to send email", error);
    }
  }

  /**
   * Verify email configuration
   * @returns {boolean} Verification result
   */
  async verifyConnection() {
    try {
      if (!this.initialized) {
        this.initialize();
      }
      
      await this.transporter.verify();
      return true;
    } catch (error) {
      console.error("Email verification failed:", error);
      return false;
    }
  }
}

export default new EmailService();