import { Resend } from "resend";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

/**
 * Initialize Resend client if API key is provided
 */
const getResendClient = () => {
  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey && apiKey.trim() !== "") {
    return new Resend(apiKey.trim());
  }
  return null;
};

/**
 * Configure Nodemailer transport (fallback option).
 */
const getNodemailerTransporter = () => {
  const user = process.env.EMAIL_USER ? process.env.EMAIL_USER.trim() : null;
  const pass = process.env.EMAIL_PASS ? process.env.EMAIL_PASS.replace(/\s+/g, "") : null;

  if (user && pass) {
    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        user,
        pass,
      },
    });
  }
  return null;
};

/**
 * Load Mhira brand logo as inline CID attachment
 */
const getLogoAttachment = () => {
  const pathsToCheck = [
    path.resolve(__dirname, "../../frontend/public/mhira_removebg.png"),
    path.resolve(__dirname, "../public/mhira_removebg.png"),
    path.resolve(__dirname, "../uploads/mhira_logo.png"),
    path.resolve(process.cwd(), "frontend", "public", "mhira_removebg.png"),
    path.resolve(process.cwd(), "..", "frontend", "public", "mhira_removebg.png"),
    path.resolve(process.cwd(), "uploads", "mhira_logo.png"),
    path.resolve(process.cwd(), "public", "mhira_removebg.png"),
  ];

  for (const filePath of pathsToCheck) {
    if (fs.existsSync(filePath)) {
      try {
        const buf = fs.readFileSync(filePath);
        return {
          filename: "mhira-logo.png",
          content: buf,
          cid: "mhira-logo",
        };
      } catch (err) {
        console.warn("Could not read logo buffer:", err.message);
      }
    }
  }
  return null;
};

const PUBLIC_LOGO_URL =
  process.env.PUBLIC_LOGO_URL ||
  (process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/mhira_removebg.png` : "https://mhira-crmsystem.onrender.com/mhira_removebg.png");

/**
 * Base Brand Layout for all Mhira Natural Emails
 * Consistent with Login.jsx: Clean #fcfdfb warm palette, Poppins typography, centered logo, rounded cards.
 */
export const renderEmailLayout = ({ title, category = "SECURITY NOTIFICATION", contentHtml }) => {
  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
        <style>
          * {
            font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
            box-sizing: border-box;
          }
          body {
            margin: 0;
            padding: 0;
            background-color: #fcfdfb;
            font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            color: #1f2937;
            -webkit-font-smoothing: antialiased;
          }
          .email-wrapper {
            width: 100%;
            background-color: #fcfdfb;
            padding: 48px 16px;
          }
          .email-container {
            max-width: 480px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 24px;
            border: 1px solid #e5e7eb;
            box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.04);
            padding: 40px 36px;
          }
          .logo-center {
            text-align: center;
            margin: 0 auto 12px auto;
          }
          .logo-img {
            display: inline-block;
            max-height: 52px;
            height: 52px;
            width: auto;
            border: 0;
            outline: none;
            text-decoration: none;
          }
          .brand-title {
            font-family: 'Poppins', sans-serif;
            font-size: 16px;
            font-weight: 700;
            letter-spacing: 2px;
            color: #01390f;
            text-transform: uppercase;
            margin: 0 0 16px 0;
            text-align: center;
          }
          .category-pill-wrapper {
            text-align: center;
            margin-bottom: 12px;
          }
          .category-pill {
            display: inline-block;
            background-color: #f0fdf4;
            border: 1px solid #bbf7d0;
            color: #01390f;
            font-size: 10px;
            font-weight: 700;
            letter-spacing: 1.2px;
            text-transform: uppercase;
            padding: 4px 14px;
            border-radius: 9999px;
          }
          .main-heading {
            margin: 0 0 16px 0;
            font-family: 'Poppins', sans-serif;
            font-size: 22px;
            font-weight: 700;
            color: #1f2937;
            line-height: 1.35;
            text-align: center;
            letter-spacing: -0.3px;
          }
          .lead-text {
            font-family: 'Poppins', sans-serif;
            font-size: 13px;
            line-height: 1.65;
            color: #4b5563;
            margin: 0 0 16px 0;
            text-align: center;
          }
          .credential-box {
            background-color: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 16px;
            padding: 20px 24px;
            margin: 24px 0;
            text-align: left;
          }
          .credential-row {
            margin-bottom: 12px;
          }
          .credential-row:last-child {
            margin-bottom: 0;
          }
          .credential-label {
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 1px;
            text-transform: uppercase;
            color: #6b7280;
            margin-bottom: 4px;
          }
          .credential-value {
            font-size: 14px;
            font-weight: 600;
            color: #1f2937;
            word-break: break-all;
          }
          .credential-code {
            font-family: 'Poppins', Consolas, monospace;
            background-color: #ffffff;
            border: 1px solid #d1d5db;
            padding: 6px 14px;
            border-radius: 9999px;
            font-size: 14px;
            font-weight: 700;
            color: #01390f;
            display: inline-block;
          }
          .action-btn {
            display: inline-block;
            background-color: #01390f;
            color: #ffffff !important;
            font-family: 'Poppins', sans-serif;
            font-size: 12px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 1px;
            text-decoration: none;
            padding: 14px 32px;
            border-radius: 9999px;
            box-shadow: 0 4px 14px rgba(1, 57, 15, 0.2);
            margin: 12px 0 20px 0;
          }
          .notice-box {
            background-color: #fcfdfa;
            border: 1px solid #e5e7eb;
            border-left: 4px solid #01390f;
            border-radius: 12px;
            padding: 14px 18px;
            margin-top: 24px;
            font-size: 12px;
            color: #4b5563;
            line-height: 1.6;
            text-align: left;
          }
          .email-footer {
            margin-top: 32px;
            padding-top: 24px;
            border-top: 1px solid #f1f5f9;
            text-align: center;
            font-size: 11px;
            color: #9ca3af;
            line-height: 1.7;
          }
        </style>
      </head>
      <body>
        <div class="email-wrapper">
          <div class="email-container">
            <!-- Centered Mhira Logo & Brand -->
            <div class="logo-center">
              <img src="cid:mhira-logo" alt="Mhira Natural" class="logo-img" />
            </div>
            <div class="brand-title">MHIRA NATURAL</div>

            <!-- Pill Category -->
            <div class="category-pill-wrapper">
              <div class="category-pill">${category}</div>
            </div>

            <!-- Title -->
            <h1 class="main-heading">${title}</h1>

            <!-- Content -->
            ${contentHtml}

            <!-- Footer -->
            <div class="email-footer">
              &copy; ${new Date().getFullYear()} Mhira Natural Soap and Cosmetics Manufacturing. All rights reserved.<br>
              <span style="font-size: 10px; color: #cbd5e1;">Automated System Notification &bull; Confidential &bull; Please do not reply directly to this email.</span>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
};

/**
 * Send email via Resend (primary) or Nodemailer / Console fallback
 */
export const sendEmail = async ({ to, subject, html, text, attachments = [] }) => {
  const resend = getResendClient();
  const fromEmail = process.env.RESEND_FROM || "Mhira Natural <onboarding@resend.dev>";

  // Ensure brand logo CID attachment is included
  const logoAttachment = getLogoAttachment();
  const finalAttachments = [...attachments];
  if (logoAttachment && !finalAttachments.some((a) => a.cid === "mhira-logo")) {
    finalAttachments.push(logoAttachment);
  }

  // Fallback logo URL if attachment cannot be displayed
  const finalHtml = !logoAttachment
    ? html.replace(/src="cid:mhira-logo"/g, `src="${PUBLIC_LOGO_URL}"`)
    : html;

  // 1. Try Resend first
  if (resend) {
    try {
      const response = await resend.emails.send({
        from: fromEmail,
        to: Array.isArray(to) ? to : [to],
        subject,
        html: finalHtml.replace(/src="cid:mhira-logo"/g, `src="${PUBLIC_LOGO_URL}"`),
        text,
        attachments: finalAttachments.map((att) => ({
          filename: att.filename,
          content: Buffer.isBuffer(att.content) ? att.content.toString("base64") : att.content,
          cid: att.cid,
        })),
      });

      if (response.error) {
        console.warn("Resend API warning:", response.error.message);
        if (response.error.message?.includes("can only send testing emails")) {
          console.warn(
            "[Resend Note] Free tier without custom domain only delivers to account owner. Add & verify a domain at resend.com/domains to send to any recipient."
          );
        }
      } else if (response.data) {
        console.log(`[Resend] Email sent to ${to} (ID: ${response.data.id})`);
        return { success: true, messageId: response.data.id, provider: "resend" };
      }
    } catch (resendErr) {
      console.error("Resend API exception:", resendErr.message);
    }
  }

  // 2. Fallback to Nodemailer if available
  const transporter = getNodemailerTransporter();
  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from: `"Mhira Natural" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        html: finalHtml,
        text,
        attachments: finalAttachments,
      });
      console.log(`[Nodemailer] Email sent to ${to} (MessageId: ${info.messageId})`);
      return { success: true, messageId: info.messageId, provider: "nodemailer" };
    } catch (nodemailerErr) {
      console.error("Nodemailer failed:", nodemailerErr.message);
    }
  }

  // 3. Fallback to dev console simulation
  console.log("\n" + "=".repeat(60));
  console.log(`[EMAIL SERVICE - DEV CONSOLE SIMULATION]`);
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log("=".repeat(60) + "\n");
  return { success: true, simulated: true };
};

/**
 * 1. Send OTP Verification Code (Password Reset / Staff Verification)
 * Clean, modern layout matching Login.jsx with Poppins font and centered logo.
 */
export const sendVerificationCodeEmail = async ({
  to,
  code,
  userName = "User",
  type = "password_reset", // "password_reset" | "staff_verification"
}) => {
  const isReset = type === "password_reset";
  const title = isReset ? "Password Reset Verification Code" : "Staff Account Email Verification";
  const category = isReset ? "SECURITY VERIFICATION" : "STAFF ONBOARDING";
  const subtitle = isReset
    ? "We received a security request to reset your Mhira Natural account password."
    : "Your staff account has been configured on the Mhira Natural CRM System.";
  const codeLen = (code && String(code).length) || 8;
  const actionText = isReset
    ? `Enter the ${codeLen}-digit verification code below on the password reset screen to confirm your identity:`
    : `Enter the ${codeLen}-digit verification code below to confirm your staff email address:`;

  const contentHtml = `
    <p class="lead-text">
      Hello <strong style="color: #1f2937;">${userName}</strong>,<br>
      ${subtitle}
    </p>
    <p class="lead-text" style="color: #6b7280; font-size: 12px; margin-bottom: 6px;">
      ${actionText}
    </p>
    
    <div style="text-align: center; margin: 26px 0;">
      <div style="background-color: #f4fbf6; border: 2px solid #01390f; border-radius: 9999px; padding: 14px 28px; display: inline-block; box-shadow: 0 4px 14px rgba(1, 57, 15, 0.08);">
        <span style="font-family: 'Poppins', Consolas, monospace; font-size: 30px; font-weight: 800; letter-spacing: 8px; color: #01390f; margin-left: 8px;">${code}</span>
      </div>
      <p style="font-size: 11px; font-weight: 600; color: #9ca3af; margin: 10px 0 0 0;">Enter this ${codeLen}-digit code on the reset screen</p>
    </div>

    <div class="notice-box">
      <strong style="color: #01390f;">Time-sensitive notification:</strong> This verification code will expire in <strong style="color: #01390f;">15 minutes</strong>.<br>
      <span style="color: #6b7280; font-size: 11px; display: inline-block; margin-top: 4px;">If you did not initiate this request, please disregard this message or contact your system administrator.</span>
    </div>
  `;

  const html = renderEmailLayout({
    title,
    category,
    contentHtml,
  });

  const subject = `Mhira Natural - ${title}`;
  const result = await sendEmail({ to, subject, html });

  if (!result.success || result.simulated) {
    console.log(`[OTP CONSOLE FALLBACK] Verification code for ${to}: ${code}`);
    return { ...result, fallbackCode: code };
  }

  return result;
};

/**
 * 2. Send Customer Registration Welcome & Credentials Email
 * Dispatches account details (Customer ID, username, email, password) upon signup.
 */
export const sendCustomerWelcomeEmail = async ({
  to,
  fullName = "Valued Customer",
  customerNo = "CTM-000001",
  username = "",
  password = "",
  verificationLink = "",
}) => {
  const title = "Welcome to Mhira Natural";
  const category = "CUSTOMER ACCOUNT CONFIRMATION";
  const loginUrl = process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/login` : "https://mhira-crmsystem.onrender.com/login";

  const contentHtml = `
    <p class="lead-text">
      Hello <strong style="color: #1f2937;">${fullName}</strong>,<br>
      Thank you for creating an account with <strong>Mhira Natural</strong>. Your customer profile has been registered and is now active.
    </p>

    <div class="credential-box">
      <div class="credential-row">
        <div class="credential-label">Customer ID</div>
        <div class="credential-value" style="color: #01390f; font-weight: 700;">${customerNo}</div>
      </div>
      <div class="credential-row">
        <div class="credential-label">Username</div>
        <div class="credential-value">${username || to.split("@")[0]}</div>
      </div>
      <div class="credential-row">
        <div class="credential-label">Registered Email</div>
        <div class="credential-value">${to}</div>
      </div>
      <div class="credential-row">
        <div class="credential-label">Account Password</div>
        <div class="credential-value">
          <span class="credential-code">${password}</span>
        </div>
      </div>
    </div>

    ${
      verificationLink
        ? `
      <div style="text-align: center; margin: 28px 0 20px 0;">
        <a href="${verificationLink}" class="action-btn">Verify Account &amp; Sign In</a>
      </div>
    `
        : `
      <div style="text-align: center; margin: 28px 0 20px 0;">
        <a href="${loginUrl}" class="action-btn">Sign In to Your Account</a>
      </div>
    `
    }

    <div class="notice-box">
      <strong style="color: #01390f;">Security Recommendation:</strong> Store your login credentials securely. You can update your password or profile information anytime in your account settings, or use the "Forgot Password" option on the sign-in screen.
    </div>
  `;

  const html = renderEmailLayout({
    title,
    category,
    contentHtml,
  });

  const subject = `Welcome to Mhira Natural - Your Account Credentials`;
  return await sendEmail({ to, subject, html });
};

/**
 * 3. Send Staff Account Creation Credentials Email
 * Dispatches auto-generated temporary password and role details to new staff members.
 */
export const sendStaffWelcomeEmail = async ({
  to,
  fullName = "Staff Member",
  empNo = "EMP-001",
  role = "Inventory",
  temporaryPassword = "",
  verificationLink = "",
}) => {
  const title = "Staff Account Access Granted";
  const category = "INTERNAL STAFF ONBOARDING";
  const loginUrl = process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/login` : "https://mhira-crmsystem.onrender.com/login";

  const contentHtml = `
    <p class="lead-text">
      Hello <strong style="color: #1f2937;">${fullName}</strong>,<br>
      An administrative account has been provisioned for you on the <strong>Mhira Natural CRM &amp; Management System</strong>.
    </p>

    <div class="credential-box">
      <div class="credential-row">
        <div class="credential-label">Employee / Staff ID</div>
        <div class="credential-value" style="color: #01390f; font-weight: 700;">${empNo}</div>
      </div>
      <div class="credential-row">
        <div class="credential-label">Assigned Department / Role</div>
        <div class="credential-value" style="color: #01390f; font-weight: 700;">${role}</div>
      </div>
      <div class="credential-row">
        <div class="credential-label">Staff Login Email</div>
        <div class="credential-value">${to}</div>
      </div>
      <div class="credential-row">
        <div class="credential-label">Temporary Generated Password</div>
        <div class="credential-value">
          <span class="credential-code">${temporaryPassword}</span>
        </div>
      </div>
    </div>

    ${
      verificationLink
        ? `
      <div style="text-align: center; margin: 28px 0 20px 0;">
        <a href="${verificationLink}" class="action-btn">Verify &amp; Access CRM Portal</a>
      </div>
    `
        : `
      <div style="text-align: center; margin: 28px 0 20px 0;">
        <a href="${loginUrl}" class="action-btn">Access CRM Portal</a>
      </div>
    `
    }

    <div class="notice-box">
      <strong style="color: #01390f;">Next Steps:</strong> You may sign in immediately using the temporary password above. If you prefer to set your own password right away, simply use the <strong>"Forgot Password"</strong> link on the login screen with your registered email address.
    </div>
  `;

  const html = renderEmailLayout({
    title,
    category,
    contentHtml,
  });

  const subject = `Mhira Natural CRM - Staff Credentials & Access`;
  return await sendEmail({ to, subject, html });
};

/**
 * 4. Send One-Click Verification Link Email (For Customers & Remote Users)
 * Dispatches a direct confirmation link button to verify email address without manual code entry.
 */
export const sendVerificationLinkEmail = async ({
  to,
  fullName = "Valued Customer",
  verificationLink = "",
}) => {
  const title = "Verify Your Email Address";
  const category = "ACCOUNT VERIFICATION";

  const contentHtml = `
    <p class="lead-text">
      Hello <strong style="color: #1f2937;">${fullName}</strong>,<br>
      Please confirm your email address for your <strong>Mhira Natural</strong> account. Verifying your email helps secure your profile and ensures you receive order updates and member rewards.
    </p>

    <div style="text-align: center; margin: 30px 0 24px 0;">
      <a href="${verificationLink}" class="action-btn">Verify Email Address</a>
    </div>

    <p class="lead-text" style="font-size: 12px; color: #6b7280; margin-top: 20px;">
      Or copy and paste this verification link directly into your web browser:<br>
      <a href="${verificationLink}" style="color: #01390f; word-break: break-all; font-size: 12px; font-family: monospace; text-decoration: underline;">${verificationLink}</a>
    </p>

    <div class="notice-box">
      <strong style="color: #01390f;">Important:</strong> This verification link is valid for 7 days. If you did not create an account with Mhira Natural, you can safely ignore this email.
    </div>
  `;

  const html = renderEmailLayout({
    title,
    category,
    contentHtml,
  });

  const subject = `Verify Your Mhira Natural Account`;
  return await sendEmail({ to, subject, html });
};

/**
 * 5. Send Google Connected Customer Welcome Email
 * Dispatches a welcoming confirmation when a new customer connects their Google account.
 */
export const sendGoogleWelcomeEmail = async ({
  to,
  fullName = "Valued Customer",
  customerNo = "CTM-000001",
}) => {
  const title = "Welcome to Mhira Natural";
  const category = "GOOGLE ACCOUNT LINKED";
  const frontendUrl = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.replace(/\/$/, "")
    : "https://mhira-crmsystem.onrender.com";
  const shopUrl = `${frontendUrl}/`;

  const contentHtml = `
    <p class="lead-text">
      Hello <strong style="color: #1f2937;">${fullName}</strong>,<br>
      Thank you for connecting with <strong>Mhira Natural</strong> using your Google account. Your customer profile has been successfully created and is now active!
    </p>

    <div class="credential-box">
      <div class="credential-row">
        <div class="credential-label">Customer ID</div>
        <div class="credential-value" style="color: #01390f; font-weight: 700;">${customerNo}</div>
      </div>
      <div class="credential-row">
        <div class="credential-label">Account Name</div>
        <div class="credential-value">${fullName}</div>
      </div>
      <div class="credential-row">
        <div class="credential-label">Connected Google Account</div>
        <div class="credential-value">${to}</div>
      </div>
      <div class="credential-row">
        <div class="credential-label">Sign-In Method</div>
        <div class="credential-value">
          <span style="display: inline-block; background-color: #f0fdf4; border: 1px solid #bbf7d0; color: #01390f; padding: 4px 14px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase;">Google OAuth Verified</span>
        </div>
      </div>
    </div>

    <div style="text-align: center; margin: 28px 0 20px 0;">
      <a href="${shopUrl}" class="action-btn">Explore Mhira Collection</a>
    </div>

    <div class="notice-box">
      <strong style="color: #01390f;">Fast &amp; Seamless Sign-In:</strong> Whenever you return to Mhira Natural, you can sign into your account in one click by choosing <strong>"Connect with Google"</strong> on the sign-in page.
    </div>
  `;

  const html = renderEmailLayout({
    title,
    category,
    contentHtml,
  });

  const subject = `Welcome to Mhira Natural - Your Google Account is Connected`;
  return await sendEmail({ to, subject, html });
};

export default {
  sendEmail,
  sendVerificationCodeEmail,
  sendCustomerWelcomeEmail,
  sendStaffWelcomeEmail,
  sendVerificationLinkEmail,
  sendGoogleWelcomeEmail,
};

