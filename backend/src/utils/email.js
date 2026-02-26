const nodemailer = require('nodemailer');

const parseBool = (value, defaultValue = false) => {
  if (value === undefined || value === null || value === '') return defaultValue;
  return String(value).toLowerCase() === 'true';
};

const EMAIL_CONFIG = {
  host: process.env.SMTP_HOST || '',
  port: Number(process.env.SMTP_PORT || 587),
  secure: parseBool(process.env.SMTP_SECURE),
  user: process.env.SMTP_USER || '',
  pass: process.env.SMTP_PASS || '',
  from: process.env.SMTP_FROM || process.env.SMTP_USER || '',
  replyTo: process.env.SMTP_REPLY_TO || ''
};

let transporter;

const isEmailConfigured = () => {
  if (!EMAIL_CONFIG.host || !EMAIL_CONFIG.from) return false;
  if (!EMAIL_CONFIG.user && !EMAIL_CONFIG.pass) return true; // supports local mail servers without auth
  return Boolean(EMAIL_CONFIG.user && EMAIL_CONFIG.pass);
};

const getTransporter = () => {
  if (!isEmailConfigured()) {
    throw new Error('SMTP email is not configured');
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: EMAIL_CONFIG.host,
      port: EMAIL_CONFIG.port,
      secure: EMAIL_CONFIG.secure || EMAIL_CONFIG.port === 465,
      auth: EMAIL_CONFIG.user
        ? {
            user: EMAIL_CONFIG.user,
            pass: EMAIL_CONFIG.pass
          }
        : undefined
    });
  }

  return transporter;
};

const sendPasswordResetEmail = async ({ to, resetLink }) => {
  const appName = process.env.APP_NAME || 'ZetechVerse';
  const emailTransporter = getTransporter();

  await emailTransporter.sendMail({
    from: EMAIL_CONFIG.from,
    to,
    replyTo: EMAIL_CONFIG.replyTo || undefined,
    subject: `${appName} password reset`,
    text: [
      `You requested a password reset for ${appName}.`,
      'Use the link below to set a new password. This link expires in 15 minutes.',
      '',
      resetLink,
      '',
      'If you did not request this, you can ignore this email.'
    ].join('\n'),
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111;">
        <h2 style="margin-bottom: 12px;">Reset your password</h2>
        <p>You requested a password reset for <strong>${appName}</strong>.</p>
        <p style="margin: 16px 0;">
          <a
            href="${resetLink}"
            style="display: inline-block; background: #111827; color: #fff; text-decoration: none; padding: 10px 16px; border-radius: 6px;"
          >
            Reset Password
          </a>
        </p>
        <p>This link expires in <strong>15 minutes</strong>.</p>
        <p>If you did not request this, you can ignore this email.</p>
        <p style="margin-top: 20px; color: #4b5563; font-size: 12px;">If the button does not work, copy and paste this URL into your browser:</p>
        <p style="word-break: break-all; color: #4b5563; font-size: 12px;">${resetLink}</p>
      </div>
    `
  });
};

module.exports = {
  isEmailConfigured,
  sendPasswordResetEmail
};
