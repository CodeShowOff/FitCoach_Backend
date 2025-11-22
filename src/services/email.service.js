import pkg from "@getbrevo/brevo";
const { TransactionalEmailsApi, SendSmtpEmail } = pkg;

const FROM_EMAIL = process.env.BREVO_FROM_EMAIL || "no-reply@health-app.local";
const APP_NAME = process.env.APP_NAME || "PulseLedger";
const BREVO_API_KEY = process.env.BREVO_API_KEY;

if (!BREVO_API_KEY) {
  console.error("❌ CRITICAL: BREVO_API_KEY is not set in environment variables!");
  console.error("❌ Emails will NOT be sent. Please add BREVO_API_KEY to your .env file.");
} else {
  console.log("📧 Email service configured:");
  console.log("   - From:", FROM_EMAIL);
  console.log("   - App Name:", APP_NAME);
}

// Setup Brevo client
const apiInstance = new TransactionalEmailsApi();
apiInstance.authentications.apiKey.apiKey = BREVO_API_KEY;

// ------------------------------
// 🧩 Core send helper (Brevo API)
// ------------------------------
/**
 * sendEmail({ to, subject, html, text })
 * - `to` can be a string or an array of { email, name }
 */
export const sendEmail = async ({ to, subject, html, text }) => {
  if (!to) {
    throw new Error("Recipient email (to) is required");
  }

  if (!BREVO_API_KEY) {
    console.error("❌ Cannot send email: BREVO_API_KEY is not configured");
    throw new Error("Email service not configured. Please set BREVO_API_KEY in environment variables.");
  }

  // Normalize `to` into SDK format
  const toList = Array.isArray(to)
    ? to.map(t => (typeof t === "string" ? { email: t } : t))
    : [{ email: to }];

  const sendSmtpEmail = new SendSmtpEmail();
  sendSmtpEmail.sender = { name: APP_NAME, email: FROM_EMAIL };
  sendSmtpEmail.to = toList;
  sendSmtpEmail.subject = subject;
  sendSmtpEmail.htmlContent = html;
  sendSmtpEmail.textContent = text;

  try {
    const response = await apiInstance.sendTransacEmail(sendSmtpEmail);
    return response;
  } catch (error) {
    console.error(`❌ Failed to send email to ${JSON.stringify(toList)}: ${error?.message || error}`);
    throw error;
  }
};

// ------------------------------
// 📩 Send with Brevo Template (optional)
// ------------------------------
/**
 * sendEmailWithTemplate({ to, templateId, params })
 * Use this if you create templates in Brevo dashboard
 */
export const sendEmailWithTemplate = async ({ to, templateId, params }) => {
  const toList = Array.isArray(to) 
    ? to.map(t => (typeof t === "string" ? { email: t } : t)) 
    : [{ email: to }];

  const sendSmtpEmail = new SendSmtpEmail();
  sendSmtpEmail.sender = { name: APP_NAME, email: FROM_EMAIL };
  sendSmtpEmail.to = toList;
  sendSmtpEmail.templateId = templateId;
  sendSmtpEmail.params = params;

  try {
    const response = await apiInstance.sendTransacEmail(sendSmtpEmail);
    return response;
  } catch (error) {
    console.error(`❌ Template email failed (ID: ${templateId}): ${error?.message || error}`);
    throw error;
  }
};

// ------------------------------
// 📩 Templates
// ------------------------------

const baseHtmlWrapper = (title, body) => {
  return `<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
  </head>
  <body style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background-color: #f5f5f5; margin: 0; padding: 0;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f5f5f5; padding: 24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 480px; background-color:#ffffff; border-radius: 12px; overflow:hidden; box-shadow:0 4px 12px rgba(15,23,42,0.08);">
            <tr>
              <td style="padding: 20px 24px; border-bottom:1px solid #e5e7eb; background:linear-gradient(135deg,#22c55e,#16a34a); color:#f9fafb;">
                <h1 style="margin:0; font-size: 20px; font-weight: 600; letter-spacing: .02em;">${APP_NAME}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding: 24px 24px 8px 24px; color:#111827; font-size:14px; line-height:1.6;">
                ${body}
              </td>
            </tr>
            <tr>
              <td style="padding: 0 24px 24px 24px; color:#6b7280; font-size:12px; line-height:1.6;">
                <p style="margin: 0;">If you didn't perform this action, you can safely ignore this email.</p>
                <p style="margin: 8px 0 0 0;">— The ${APP_NAME} Team</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>`;
};

const maskEmail = (email) => {
  if (!email) return "your email";
  const [user, domain] = email.split("@");
  if (!domain) return email;
  const visible = user.slice(0, 2);
  return `${visible}***@${domain}`;
};

export const buildRegisterOtpTemplate = ({ fullName, otp, email }) => {
  const safeName = fullName || "there";
  const subject = `Verify your email for ${APP_NAME}`;
  const text = `Hi ${safeName},\n\nYour verification code is ${otp}. It will expire in 10 minutes.\n\nIf you didn't try to sign up, you can ignore this message.`;
  const html = baseHtmlWrapper(
    subject,
    `
      <p style="margin:0 0 12px 0;">Hi <strong>${safeName}</strong>,</p>
      <p style="margin:0 0 12px 0;">Use the following one-time verification code to complete your registration:</p>
      <p style="margin:0 0 16px 0; font-size: 24px; font-weight: 700; letter-spacing: 0.3em; text-align:center;">${otp}</p>
      <p style="margin:0 0 12px 0; color:#4b5563;">For your security, this code will expire in <strong>10 minutes</strong> and can be used only once.</p>
      <p style="margin:0; color:#6b7280; font-size:12px;">This code was sent to <strong>${maskEmail(email)}</strong>.</p>
    `
  );

  return { subject, text, html };
};

export const buildResetPasswordOtpTemplate = ({ fullName, otp, email }) => {
  const safeName = fullName || "there";
  const subject = `Reset your password for ${APP_NAME}`;
  const text = `Hi ${safeName},\n\nUse this code to reset your password: ${otp}. It will expire in 10 minutes.\n\nIf you didn't request a password reset, please ignore this email.`;
  const html = baseHtmlWrapper(
    subject,
    `
      <p style="margin:0 0 12px 0;">Hi <strong>${safeName}</strong>,</p>
      <p style="margin:0 0 12px 0;">We received a request to reset the password for your ${APP_NAME} account.</p>
      <p style="margin:0 0 16px 0;">Enter this one-time code on the reset password screen:</p>
      <p style="margin:0 0 16px 0; font-size: 24px; font-weight: 700; letter-spacing: 0.3em; text-align:center;">${otp}</p>
      <p style="margin:0 0 12px 0; color:#4b5563;">This code will expire in <strong>10 minutes</strong>. If you didn't request this, you can safely ignore this email and your password will stay the same.</p>
      <p style="margin:0; color:#6b7280; font-size:12px;">Request made for <strong>${maskEmail(email)}</strong>.</p>
    `
  );

  return { subject, text, html };
};

export const buildWelcomeTemplate = ({ fullName }) => {
  const safeName = fullName || "there";
  const subject = `Welcome to ${APP_NAME}!`;
  const text = `Hi ${safeName},\n\nWelcome to ${APP_NAME}! Your email has been verified and your account is now active.\n\nWe’re excited to support you on your health journey.`;
  const html = baseHtmlWrapper(
    subject,
    `
      <p style="margin:0 0 12px 0;">Hi <strong>${safeName}</strong>,</p>
      <p style="margin:0 0 12px 0;">Welcome to <strong>${APP_NAME}</strong> — we’re really glad you’re here.</p>
      <p style="margin:0 0 12px 0;">Your email has been verified and your account is now active. You can start exploring your plans, tracking progress, and staying connected with your coach.</p>
      <p style="margin:0 0 12px 0;">Here are a few ideas to get started:</p>
      <ul style="margin:0 0 12px 18px; padding:0; color:#4b5563;">
        <li>Complete your profile details</li>
        <li>Review your plan and daily guidance</li>
        <li>Log your first progress update</li>
      </ul>
      <p style="margin:0;">Let’s make consistent, healthy progress — one habit at a time.</p>
    `
  );

  return { subject, text, html };
};

// ------------------------------
// 🎯 High-level helpers
// ------------------------------

export const sendRegistrationOtpEmail = async ({ to, fullName, otp }) => {
  try {
    const { subject, text, html } = buildRegisterOtpTemplate({
      fullName,
      otp,
      email: to,
    });
    return await sendEmail({ to, subject, text, html });
  } catch (error) {
    console.error("❌ Failed to send registration OTP email:", error);
    throw error; // Re-throw to let caller handle
  }
};

export const sendResetPasswordOtpEmail = async ({ to, fullName, otp }) => {
  try {
    const { subject, text, html } = buildResetPasswordOtpTemplate({
      fullName,
      otp,
      email: to,
    });
    return await sendEmail({ to, subject, text, html });
  } catch (error) {
    console.error("❌ Failed to send reset password OTP email:", error);
    throw error; // Re-throw to let caller handle
  }
};

export const sendWelcomeEmail = async ({ to, fullName }) => {
  try {
    const { subject, text, html } = buildWelcomeTemplate({ fullName });
    return await sendEmail({ to, subject, text, html });
  } catch (error) {
    console.error("❌ Failed to send welcome email:", error);
    // Don't throw - welcome emails are not critical
    return null;
  }
};
