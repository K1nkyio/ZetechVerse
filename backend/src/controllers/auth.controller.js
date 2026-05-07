const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const jwt = require('jsonwebtoken');

const { validationResult } = require('express-validator');

const { run, get, all } = require('../config/db');
const { isEmailConfigured, sendAdminInviteEmail, sendPasswordResetEmail } = require('../utils/email');
const {
  cancelAdminInvite,
  consumePasswordResetToken,
  createAdminInviteToken,
  createAuthSession,
  createPasswordResetToken,
  findActiveAdminInvite,
  listAdminInvites,
  listAuthSessions,
  markAdminInviteAccepted,
  revokeAllAuthSessions,
  revokeAuthSession,
  revokePasswordResetTokensForUser
} = require('../utils/authSecurity');
const {
  ZETECH_EMAIL_REQUIREMENT_MESSAGE,
  isAllowedZetechEmail
} = require('../utils/zetechEmail');



// Generate JWT token

const generateToken = (userId, sessionId) => {

  return jwt.sign(

    { userId, sessionId },

    process.env.JWT_SECRET || 'your-super-secret-jwt-key',

    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }

  );

};

const issueAuthToken = async (userId, req) => {
  const { ip, userAgent } = getRequestMeta(req);
  const sessionId = await createAuthSession({ userId, ip, userAgent });
  return generateToken(userId, sessionId);
};

const getRequestMeta = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = Array.isArray(forwarded)
    ? forwarded[0]
    : (forwarded ? forwarded.split(',')[0].trim() : req.ip);
  return {
    ip,
    userAgent: req.headers['user-agent'] || null
  };
};

const logAdminAudit = async ({ userId = null, entityId = null, action, description, ip, userAgent }) => {
  const resolvedEntityId = entityId ?? userId ?? null;
  await run(
    `
      INSERT INTO activity_logs (user_id, action, entity_type, entity_id, description, ip_address, user_agent)
      VALUES (?, ?, 'admin_account', ?, ?, ?, ?)
    `,
    [userId, action, resolvedEntityId, description || null, ip || null, userAgent || null]
  );
};

const logUserAccountAudit = async ({ actorId = null, targetUserId = null, action, description, ip, userAgent }) => {
  await run(
    `
      INSERT INTO activity_logs (user_id, action, entity_type, entity_id, description, ip_address, user_agent)
      VALUES (?, ?, 'user_account', ?, ?, ?, ?)
    `,
    [actorId, action, targetUserId, description || null, ip || null, userAgent || null]
  );
};

const getPrimaryClientOrigin = () => {
  const configuredOrigin = String(process.env.FRONTEND_URL || process.env.CLIENT_ORIGIN || '')
    .split(',')[0]
    .trim();
  return (configuredOrigin || 'http://localhost:5173').replace(/\/+$/, '');
};

const FRONTEND_URL = getPrimaryClientOrigin();
const getAdminClientOrigin = () => {
  const configuredOrigin = String(process.env.ADMIN_FRONTEND_URL || process.env.ADMIN_CLIENT_ORIGIN || process.env.ADMIN_DASHBOARD_URL || '')
    .split(',')[0]
    .trim();
  return (configuredOrigin || FRONTEND_URL || 'http://localhost:8081').replace(/\/+$/, '');
};

const ADMIN_FRONTEND_URL = getAdminClientOrigin();
const OAUTH_STATE_SECRET = process.env.OAUTH_STATE_SECRET || process.env.JWT_SECRET || 'your-super-secret-jwt-key';

const OAUTH_CONFIG = {
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
    scope: 'openid email profile'
  },
  github: {
    clientId: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    authorizationUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    userInfoUrl: 'https://api.github.com/user',
    emailsUrl: 'https://api.github.com/user/emails',
    scope: 'read:user user:email'
  }
};

const getOAuthRedirectUri = (provider) => `${FRONTEND_URL}/auth/callback/${provider}`;

const getAuthSafeUserById = async (id) => get(`
  SELECT id, email, username, full_name, role, is_active, email_verified, admin_status,
         avatar_url, bio, created_at, updated_at, last_login_at
  FROM users
  WHERE id = ?
`, [id]);

const normalizeUsername = (value, fallback = 'user') => {
  const base = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

  const safeBase = (base || fallback).slice(0, 30);
  if (safeBase.length >= 3) return safeBase;
  return `${safeBase}${crypto.randomBytes(2).toString('hex')}`.slice(0, 30);
};

const generateUniqueUsername = async (candidate) => {
  const normalized = normalizeUsername(candidate);

  for (let i = 0; i < 25; i += 1) {
    const suffix = i === 0 ? '' : `_${crypto.randomBytes(2).toString('hex')}`;
    const maxBaseLength = Math.max(3, 30 - suffix.length);
    const base = normalized.slice(0, maxBaseLength);
    const username = `${base}${suffix}`;
    const existing = await get('SELECT id FROM users WHERE LOWER(username) = LOWER(?)', [username]);

    if (!existing) {
      return username;
    }
  }

  throw new Error('Unable to generate a unique username for OAuth user');
};

const resolveInviteUsername = async (email, desiredUsername) => {
  const existingByEmail = await get('SELECT id, username FROM users WHERE LOWER(email) = LOWER(?)', [email]);
  const fallbackUsername = normalizeUsername(String(email).split('@')[0], 'admin');
  const requestedUsername = normalizeUsername(desiredUsername || existingByEmail?.username || fallbackUsername, fallbackUsername);

  if (existingByEmail) {
    if (existingByEmail.username === requestedUsername) return requestedUsername;
    const conflict = await get('SELECT id FROM users WHERE LOWER(username) = LOWER(?) AND id <> ?', [requestedUsername, existingByEmail.id]);
    return conflict ? existingByEmail.username : requestedUsername;
  }

  return generateUniqueUsername(requestedUsername);
};

const parseJsonResponse = async (response) => {
  try {
    return await response.json();
  } catch (error) {
    return null;
  }
};

const exchangeOAuthCodeForToken = async (provider, code, redirectUri) => {
  const config = OAUTH_CONFIG[provider];

  if (provider === 'google') {
    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      })
    });
    const data = await parseJsonResponse(response);
    if (!response.ok || !data?.access_token) {
      throw new Error(data?.error_description || data?.error || 'Failed to exchange Google OAuth code');
    }
    return data.access_token;
  }

  const response = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: redirectUri
    })
  });
  const data = await parseJsonResponse(response);
  if (!response.ok || !data?.access_token) {
    throw new Error(data?.error_description || data?.error || 'Failed to exchange GitHub OAuth code');
  }
  return data.access_token;
};

const getGoogleUserProfile = async (accessToken) => {
  const response = await fetch(OAUTH_CONFIG.google.userInfoUrl, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  const profile = await parseJsonResponse(response);

  if (!response.ok || !profile?.email) {
    throw new Error('Unable to fetch Google user profile');
  }

  return {
    email: String(profile.email).toLowerCase(),
    fullName: profile.name || null,
    avatarUrl: profile.picture || null,
    emailVerified: Boolean(profile.verified_email),
    usernameSeed: profile.email.split('@')[0]
  };
};

const getGitHubUserProfile = async (accessToken) => {
  const profileResponse = await fetch(OAUTH_CONFIG.github.userInfoUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'zetechverse-backend'
    }
  });
  const profile = await parseJsonResponse(profileResponse);
  if (!profileResponse.ok || !profile?.id) {
    throw new Error('Unable to fetch GitHub user profile');
  }

  let email = profile.email ? String(profile.email).toLowerCase() : '';
  let emailVerified = false;

  if (!email) {
    const emailsResponse = await fetch(OAUTH_CONFIG.github.emailsUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'zetechverse-backend'
      }
    });
    const emails = await parseJsonResponse(emailsResponse);

    if (emailsResponse.ok && Array.isArray(emails) && emails.length > 0) {
      const preferred = emails.find((entry) => entry.primary && entry.verified)
        || emails.find((entry) => entry.verified)
        || emails[0];

      if (preferred?.email) {
        email = String(preferred.email).toLowerCase();
        emailVerified = Boolean(preferred.verified);
      }
    }
  }

  if (!email) {
    email = `${profile.id}+github@users.noreply.github.com`;
  }

  return {
    email,
    fullName: profile.name || profile.login || null,
    avatarUrl: profile.avatar_url || null,
    emailVerified,
    usernameSeed: profile.login || email.split('@')[0]
  };
};

const findOrCreateOAuthUser = async (provider, profile) => {
  const existingUser = await get(
    'SELECT id FROM users WHERE LOWER(email) = LOWER(?)',
    [profile.email]
  );

  if (existingUser) {
    await run(
      `
        UPDATE users
        SET full_name = COALESCE(?, full_name),
            avatar_url = COALESCE(?, avatar_url),
            email_verified = CASE WHEN ? THEN true ELSE email_verified END,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [profile.fullName, profile.avatarUrl, profile.emailVerified, existingUser.id]
    );

    return getAuthSafeUserById(existingUser.id);
  }

  if (!isAllowedZetechEmail(profile.email)) {
    const error = new Error(ZETECH_EMAIL_REQUIREMENT_MESSAGE);
    error.statusCode = 403;
    throw error;
  }

  const username = await generateUniqueUsername(profile.usernameSeed);
  const generatedPassword = crypto.randomBytes(32).toString('hex');
  const passwordHash = await bcrypt.hash(generatedPassword, 12);

  const result = await run(
    `
      INSERT INTO users (
        email, username, password_hash, full_name, avatar_url, role, is_active, email_verified
      ) VALUES (?, ?, ?, ?, ?, 'user', true, ?)
    `,
    [profile.email, username, passwordHash, profile.fullName || username, profile.avatarUrl, profile.emailVerified]
  );

  return getAuthSafeUserById(result.id);
};


// Register new user

const register = async (req, res) => {

  try {

    // Check for validation errors

    const errors = validationResult(req);

    if (!errors.isEmpty()) {

      return res.status(400).json({

        success: false,

        message: 'Validation failed',

        errors: errors.array()

      });

    }



    const {

      email,

      username,

      password,

      full_name,

      student_id,

      course,

      year_of_study,

      phone

    } = req.body;



    // Check if user already exists

    const existingUser = await get('SELECT id FROM users WHERE email = ? OR username = ?', [email, username]);

    if (existingUser) {

      return res.status(409).json({

        success: false,

        message: 'User with this email or username already exists'

      });

    }



    // Hash password

    const saltRounds = 12;

    const passwordHash = await bcrypt.hash(password, saltRounds);



    // Create user

    const result = await run(`

      INSERT INTO users (

        email, username, password_hash, full_name, student_id, course, year_of_study, phone, role

      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'user')

    `, [email, username, passwordHash, full_name, student_id, course, year_of_study, phone]);



    // Generate token

    const token = await issueAuthToken(result.id, req);



    // Get user data (without password)

    const user = await get(`

      SELECT id, email, username, full_name, student_id, course, year_of_study, phone, role, admin_status,
             avatar_url, bio, is_active, email_verified, created_at, updated_at, last_login_at

      FROM users WHERE id = ?

    `, [result.id]);



    res.status(201).json({

      success: true,

      message: 'User registered successfully',

      data: {

        user,

        token

      }

    });

  } catch (error) {

    console.error('Error registering user:', error);

    res.status(500).json({

      success: false,

      message: 'Failed to register user',

      error: process.env.NODE_ENV === 'development' ? error.message : undefined

    });

  }

};



const requestAdminAccount = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const firstError = errors.array()[0]?.msg;
      return res.status(400).json({
        success: false,
        message: firstError ? `Validation failed: ${firstError}` : 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, username, password, full_name } = req.body;
    const { ip, userAgent } = getRequestMeta(req);

    const existingUser = await get(
      'SELECT id, role, admin_status FROM users WHERE email = ? OR username = ?',
      [email, username]
    );

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email or username already exists'
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await run(`
      INSERT INTO users (
        email, username, password_hash, full_name, role, is_active, email_verified, admin_status, admin_requested_at
      ) VALUES (?, ?, ?, ?, 'admin', true, false, 'pending', CURRENT_TIMESTAMP)
    `, [email, username, passwordHash, full_name]);

    await logAdminAudit({
      userId: result.id,
      entityId: result.id,
      action: 'admin_request',
      description: JSON.stringify({ requested_by: 'self' }),
      ip,
      userAgent
    });

    res.status(201).json({
      success: true,
      message: 'Your admin account request has been submitted for approval.'
    });
  } catch (error) {
    console.error('Error requesting admin account:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit admin request',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const createAdminAccount = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, username, password, full_name } = req.body;
    const { ip, userAgent } = getRequestMeta(req);

    const existingUser = await get(
      'SELECT id FROM users WHERE email = ? OR username = ?',
      [email, username]
    );

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email or username already exists'
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await run(`
      INSERT INTO users (
        email, username, password_hash, full_name, role, is_active, email_verified, admin_status, admin_requested_at, admin_approved_at, admin_approved_by
      ) VALUES (?, ?, ?, ?, 'admin', true, true, 'approved', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ?)
    `, [email, username, passwordHash, full_name, req.user.id]);

    await logAdminAudit({
      userId: req.user.id,
      entityId: result.id,
      action: 'admin_created',
      description: JSON.stringify({
        approved_by: req.user.id,
        approved_by_email: req.user.email,
        approved_by_username: req.user.username
      }),
      ip,
      userAgent
    });

    res.status(201).json({
      success: true,
      message: 'Admin account created and approved.'
    });
  } catch (error) {
    console.error('Error creating admin account:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create admin account',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const inviteAdminAccount = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const email = String(req.body.email || '').trim().toLowerCase();
    const role = req.body.role || 'admin';
    const { ip, userAgent } = getRequestMeta(req);
    const emailConfigured = isEmailConfigured();

    if (process.env.NODE_ENV === 'production' && !emailConfigured) {
      return res.status(503).json({
        success: false,
        message: 'Admin invitations are temporarily unavailable. Email delivery is not configured.'
      });
    }

    const existingAdmin = await get(
      `SELECT id, role, admin_status FROM users WHERE LOWER(email) = LOWER(?) AND role IN ('admin', 'super_admin')`,
      [email]
    );

    if (existingAdmin && existingAdmin.admin_status !== 'deactivated') {
      return res.status(409).json({
        success: false,
        message: 'An active admin account already exists for this email.'
      });
    }

    const { token, inviteId, expiresAt } = await createAdminInviteToken({
      email,
      role,
      invitedBy: req.user.id,
      ip,
      userAgent
    });

    const inviteLink = `${ADMIN_FRONTEND_URL}/admin/invite?token=${encodeURIComponent(token)}`;

    if (emailConfigured) {
      await sendAdminInviteEmail({
        to: email,
        inviteLink,
        role,
        invitedBy: req.user.email || req.user.username
      });
    }

    await logAdminAudit({
      userId: req.user.id,
      entityId: null,
      action: 'admin_invite_created',
      description: JSON.stringify({ email, role, invite_id: inviteId }),
      ip,
      userAgent
    });

    const payload = {
      success: true,
      message: 'Admin invitation created.'
    };

    if (process.env.NODE_ENV !== 'production' && !emailConfigured) {
      payload.data = {
        invite_link: inviteLink,
        expires_at: expiresAt
      };
    }

    res.status(201).json(payload);
  } catch (error) {
    console.error('Error inviting admin account:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to invite admin account',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const acceptAdminInvite = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { token, username, password, full_name } = req.body;
    const { ip, userAgent } = getRequestMeta(req);
    const invite = await findActiveAdminInvite(token);

    if (!invite) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired admin invitation'
      });
    }

    const resolvedUsername = await resolveInviteUsername(invite.email, username);
    const passwordHash = await bcrypt.hash(password, 12);
    const existingUser = await get('SELECT id FROM users WHERE LOWER(email) = LOWER(?)', [invite.email]);
    let userId;

    if (existingUser) {
      userId = existingUser.id;
      await run(
        `
          UPDATE users
          SET username = ?,
              password_hash = ?,
              full_name = COALESCE(?, full_name),
              role = ?,
              is_active = true,
              email_verified = true,
              admin_status = 'approved',
              admin_requested_at = COALESCE(admin_requested_at, CURRENT_TIMESTAMP),
              admin_approved_at = CURRENT_TIMESTAMP,
              admin_approved_by = ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `,
        [resolvedUsername, passwordHash, full_name || null, invite.role, invite.invited_by, userId]
      );
    } else {
      const result = await run(
        `
          INSERT INTO users (
            email, username, password_hash, full_name, role, is_active, email_verified,
            admin_status, admin_requested_at, admin_approved_at, admin_approved_by
          ) VALUES (?, ?, ?, ?, ?, true, true, 'approved', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ?)
        `,
        [invite.email, resolvedUsername, passwordHash, full_name || resolvedUsername, invite.role, invite.invited_by]
      );
      userId = result.id;
    }

    await markAdminInviteAccepted({ inviteId: invite.id, userId });
    await logAdminAudit({
      userId,
      entityId: userId,
      action: 'admin_invite_accepted',
      description: JSON.stringify({ invited_by: invite.invited_by, role: invite.role }),
      ip,
      userAgent
    });

    const user = await getAuthSafeUserById(userId);
    const authToken = await issueAuthToken(userId, req);

    res.status(201).json({
      success: true,
      message: 'Admin invitation accepted.',
      data: {
        user,
        token: authToken
      }
    });
  } catch (error) {
    console.error('Error accepting admin invite:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to accept admin invitation',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const listAdminInviteAccounts = async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number.parseInt(String(req.query.limit || '100'), 10) || 100, 1), 500);
    const invites = await listAdminInvites({ limit });
    res.json({
      success: true,
      data: invites
    });
  } catch (error) {
    console.error('Error fetching admin invites:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch admin invites',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const cancelAdminInviteAccount = async (req, res) => {
  try {
    const inviteId = Number.parseInt(String(req.params.id || ''), 10);
    const { ip, userAgent } = getRequestMeta(req);
    if (!Number.isFinite(inviteId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid invite id'
      });
    }

    const result = await cancelAdminInvite({ inviteId });
    await logAdminAudit({
      userId: req.user.id,
      entityId: null,
      action: 'admin_invite_cancelled',
      description: JSON.stringify({ invite_id: inviteId }),
      ip,
      userAgent
    });

    res.json({
      success: true,
      message: result.changes ? 'Admin invitation cancelled.' : 'Admin invitation was already closed.'
    });
  } catch (error) {
    console.error('Error cancelling admin invite:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel admin invite',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const listPendingAdmins = async (req, res) => {
  try {
    const pending = await all(`
      SELECT id, email, username, full_name, admin_requested_at
      FROM users
      WHERE role = 'admin' AND admin_status = 'pending'
      ORDER BY admin_requested_at DESC
    `);

    res.json({
      success: true,
      data: pending
    });
  } catch (error) {
    console.error('Error fetching pending admins:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending admins',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const listAdminAccounts = async (req, res) => {
  try {
    const admins = await all(`
      SELECT
        u.id,
        u.email,
        u.username,
        u.full_name,
        u.role,
        u.admin_status,
        u.is_active,
        u.created_at,
        u.last_login_at,
        u.admin_requested_at,
        u.admin_approved_at,
        u.admin_approved_by,
        approver.email AS approved_by_email,
        approver.username AS approved_by_username
      FROM users u
      LEFT JOIN users approver ON approver.id = u.admin_approved_by
      WHERE u.role IN ('admin', 'super_admin')
      ORDER BY u.role DESC, u.email ASC
    `);

    res.json({
      success: true,
      data: admins
    });
  } catch (error) {
    console.error('Error fetching admin accounts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch admin accounts',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const approveAdminAccount = async (req, res) => {
  try {
    const { admin_id, email, reason } = req.body;
    const { ip, userAgent } = getRequestMeta(req);

    if (!admin_id && !email) {
      return res.status(400).json({
        success: false,
        message: 'admin_id or email is required'
      });
    }

    const admin = await get(
      admin_id
        ? 'SELECT id, role, admin_status FROM users WHERE id = ?'
        : 'SELECT id, role, admin_status FROM users WHERE email = ?',
      [admin_id || email]
    );

    if (!admin || admin.role !== 'admin') {
      return res.status(404).json({
        success: false,
        message: 'Admin account not found'
      });
    }

    await run(`
      UPDATE users
      SET admin_status = 'approved',
          admin_approved_at = CURRENT_TIMESTAMP,
          admin_approved_by = ?,
          is_active = true
      WHERE id = ?
    `, [req.user.id, admin.id]);

    await logAdminAudit({
      userId: req.user.id,
      entityId: admin.id,
      action: 'admin_approved',
      description: JSON.stringify({
        approved_by: req.user.id,
        approved_by_email: req.user.email,
        approved_by_username: req.user.username,
        reason: reason || null
      }),
      ip,
      userAgent
    });

    res.json({
      success: true,
      message: 'Admin account approved.'
    });
  } catch (error) {
    console.error('Error approving admin account:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve admin account',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const deactivateAdminAccount = async (req, res) => {
  try {
    const { admin_id, email, reason } = req.body;
    const { ip, userAgent } = getRequestMeta(req);

    if (!admin_id && !email) {
      return res.status(400).json({
        success: false,
        message: 'admin_id or email is required'
      });
    }

    const admin = await get(
      admin_id
        ? 'SELECT id, role FROM users WHERE id = ?'
        : 'SELECT id, role FROM users WHERE email = ?',
      [admin_id || email]
    );

    if (!admin || admin.role !== 'admin') {
      return res.status(404).json({
        success: false,
        message: 'Admin account not found'
      });
    }

    await run(`
      UPDATE users
      SET admin_status = 'deactivated',
          is_active = false
      WHERE id = ?
    `, [admin.id]);

    await logAdminAudit({
      userId: req.user.id,
      entityId: admin.id,
      action: 'admin_deactivated',
      description: JSON.stringify({
        deactivated_by: req.user.id,
        deactivated_by_email: req.user.email,
        deactivated_by_username: req.user.username,
        reason: reason || null
      }),
      ip,
      userAgent
    });

    res.json({
      success: true,
      message: 'Admin account deactivated.'
    });
  } catch (error) {
    console.error('Error deactivating admin account:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to deactivate admin account',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const listAdminAudit = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 100, 500);
    const q = String(req.query.q || '').trim().toLowerCase();
    const entityType = String(req.query.entity_type || 'all').trim().toLowerCase();
    const action = String(req.query.action || 'all').trim().toLowerCase();
    const targetId = req.query.target_id ? Number(req.query.target_id) : null;
    const where = [];
    const params = [];

    if (entityType === 'admin_account' || entityType === 'user_account') {
      where.push('a.entity_type = ?');
      params.push(entityType);
    } else {
      where.push(`a.entity_type IN ('admin_account', 'user_account')`);
    }

    if (action && action !== 'all') {
      where.push('LOWER(a.action) = ?');
      params.push(action);
    }

    if (Number.isFinite(targetId)) {
      where.push('a.entity_id = ?');
      params.push(targetId);
    }

    if (q) {
      const likeQuery = `%${q}%`;
      where.push(`
        (
          LOWER(COALESCE(actor.email, '')) LIKE ?
          OR LOWER(COALESCE(actor.username, '')) LIKE ?
          OR LOWER(COALESCE(target.email, '')) LIKE ?
          OR LOWER(COALESCE(target.username, '')) LIKE ?
          OR LOWER(COALESCE(a.action, '')) LIKE ?
          OR LOWER(COALESCE(a.description, '')) LIKE ?
        )
      `);
      params.push(likeQuery, likeQuery, likeQuery, likeQuery, likeQuery, likeQuery);
    }

    const logs = await all(`
      SELECT
        a.id,
        a.user_id,
        a.entity_id,
        a.entity_type,
        a.action,
        a.description,
        a.ip_address,
        a.user_agent,
        a.created_at,
        actor.email AS actor_email,
        actor.username AS actor_username,
        target.email AS target_email,
        target.username AS target_username
      FROM activity_logs a
      LEFT JOIN users actor ON a.user_id = actor.id
      LEFT JOIN users target ON a.entity_id = target.id
      ${where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY a.created_at DESC
      LIMIT ?
    `, [...params, limit]);

    res.json({
      success: true,
      data: logs
    });
  } catch (error) {
    console.error('Error fetching admin audit logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch admin audit logs',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const listUserAccounts = async (req, res) => {
  try {
    const users = await all(`
      SELECT
        id,
        email,
        username,
        full_name,
        student_id,
        course,
        year_of_study,
        phone,
        role,
        is_active,
        email_verified,
        created_at,
        updated_at,
        last_login_at
      FROM users
      WHERE role = 'user'
      ORDER BY created_at DESC
    `);

    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('Error fetching user accounts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user accounts',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const deactivateUserAccount = async (req, res) => {
  try {
    const { user_id, email, reason } = req.body;
    const { ip, userAgent } = getRequestMeta(req);

    if (!user_id && !email) {
      return res.status(400).json({
        success: false,
        message: 'user_id or email is required'
      });
    }

    const user = await get(
      user_id
        ? `SELECT id, role, is_active FROM users WHERE id = ?`
        : `SELECT id, role, is_active FROM users WHERE email = ?`,
      [user_id || email]
    );

    if (!user || user.role !== 'user') {
      return res.status(404).json({
        success: false,
        message: 'User account not found'
      });
    }

    if (!user.is_active) {
      return res.json({
        success: true,
        message: 'User account is already deactivated.'
      });
    }

    await run(
      `
        UPDATE users
        SET is_active = false,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [user.id]
    );

    await logUserAccountAudit({
      actorId: req.user.id,
      targetUserId: user.id,
      action: 'user_deactivated',
      description: JSON.stringify({
        deactivated_by: req.user.id,
        deactivated_by_email: req.user.email,
        deactivated_by_username: req.user.username,
        reason: reason || null
      }),
      ip,
      userAgent
    });

    res.json({
      success: true,
      message: 'User account deactivated.'
    });
  } catch (error) {
    console.error('Error deactivating user account:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to deactivate user account',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const activateUserAccount = async (req, res) => {
  try {
    const { user_id, email, reason } = req.body;
    const { ip, userAgent } = getRequestMeta(req);

    if (!user_id && !email) {
      return res.status(400).json({
        success: false,
        message: 'user_id or email is required'
      });
    }

    const user = await get(
      user_id
        ? `SELECT id, role, is_active FROM users WHERE id = ?`
        : `SELECT id, role, is_active FROM users WHERE email = ?`,
      [user_id || email]
    );

    if (!user || user.role !== 'user') {
      return res.status(404).json({
        success: false,
        message: 'User account not found'
      });
    }

    if (user.is_active) {
      return res.json({
        success: true,
        message: 'User account is already active.'
      });
    }

    await run(
      `
        UPDATE users
        SET is_active = true,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [user.id]
    );

    await logUserAccountAudit({
      actorId: req.user.id,
      targetUserId: user.id,
      action: 'user_activated',
      description: JSON.stringify({
        activated_by: req.user.id,
        activated_by_email: req.user.email,
        activated_by_username: req.user.username,
        reason: reason || null
      }),
      ip,
      userAgent
    });

    res.json({
      success: true,
      message: 'User account activated.'
    });
  } catch (error) {
    console.error('Error activating user account:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to activate user account',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const email = String(req.body.email || '').trim().toLowerCase();
    const emailConfigured = isEmailConfigured();
    const { ip, userAgent } = getRequestMeta(req);

    if (process.env.NODE_ENV === 'production' && !emailConfigured) {
      return res.status(503).json({
        success: false,
        message: 'Password reset is temporarily unavailable. Please try again later.'
      });
    }

    const user = await get('SELECT id, email, is_active FROM users WHERE LOWER(email) = LOWER(?)', [email]);

    let resetToken = null;
    let resetLink = null;
    if (user?.id && user.is_active) {
      resetToken = await createPasswordResetToken({ userId: user.id, ip, userAgent });
      resetLink = `${FRONTEND_URL}/reset-password?token=${encodeURIComponent(resetToken)}`;

      if (emailConfigured) {
        await sendPasswordResetEmail({
          to: user.email || email,
          resetLink
        });
      }
    }

    const responsePayload = {
      success: true,
      message: 'If an account exists for this email, a password reset link has been sent.'
    };

    if (process.env.NODE_ENV !== 'production' && resetToken && !emailConfigured) {
      responsePayload.data = {
        reset_token: resetToken,
        reset_link: resetLink
      };
    }

    res.json(responsePayload);
  } catch (error) {
    console.error('Error requesting password reset:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process forgot password request',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const resetPassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { token, password } = req.body;
    const resetToken = await consumePasswordResetToken(token);
    if (!resetToken) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired password reset token'
      });
    }

    const user = await get('SELECT id FROM users WHERE id = ?', [resetToken.user_id]);
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid password reset token'
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await run(
      `
        UPDATE users
        SET password_hash = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [passwordHash, resetToken.user_id]
    );
    await revokePasswordResetTokensForUser(resetToken.user_id);
    await revokeAllAuthSessions({ userId: resetToken.user_id, reason: 'password_reset' });

    res.json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset password',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const oauthLogin = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const provider = req.params.provider;
    const config = OAUTH_CONFIG[provider];

    if (!config?.clientId || !config?.clientSecret) {
      return res.status(503).json({
        success: false,
        message: `${provider} OAuth is not configured on the server`
      });
    }

    const redirectUri = getOAuthRedirectUri(provider);
    const state = jwt.sign(
      {
        provider,
        nonce: crypto.randomBytes(12).toString('hex')
      },
      OAUTH_STATE_SECRET,
      { expiresIn: '10m' }
    );

    const authUrl = new URL(config.authorizationUrl);
    authUrl.searchParams.set('client_id', config.clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('scope', config.scope);
    authUrl.searchParams.set('state', state);

    if (provider === 'google') {
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('access_type', 'offline');
      authUrl.searchParams.set('prompt', 'select_account');
    } else {
      authUrl.searchParams.set('allow_signup', 'true');
    }

    const redirectUrl = authUrl.toString();
    res.json({
      success: true,
      data: {
        redirect_url: redirectUrl,
        redirectUrl
      }
    });
  } catch (error) {
    console.error('Error starting OAuth login:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start OAuth login',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const oauthCallback = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const provider = req.params.provider;
    const { code, state } = req.body;
    const config = OAUTH_CONFIG[provider];

    if (!config?.clientId || !config?.clientSecret) {
      return res.status(503).json({
        success: false,
        message: `${provider} OAuth is not configured on the server`
      });
    }

    if (!state) {
      return res.status(400).json({
        success: false,
        message: 'Missing OAuth state parameter'
      });
    }

    let statePayload;
    try {
      statePayload = jwt.verify(state, OAUTH_STATE_SECRET);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OAuth state'
      });
    }

    if (statePayload?.provider !== provider) {
      return res.status(400).json({
        success: false,
        message: 'OAuth state provider mismatch'
      });
    }

    const redirectUri = getOAuthRedirectUri(provider);
    const accessToken = await exchangeOAuthCodeForToken(provider, code, redirectUri);
    const profile = provider === 'google'
      ? await getGoogleUserProfile(accessToken)
      : await getGitHubUserProfile(accessToken);

    let user = await findOrCreateOAuthUser(provider, profile);
    if (!user) {
      throw new Error('Failed to resolve OAuth user');
    }

    if (!user.is_active) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    if (user.role === 'admin' && user.admin_status !== 'approved') {
      return res.status(403).json({
        success: false,
        message: user.admin_status === 'pending'
          ? 'Your account is awaiting approval by the super admin.'
          : 'Your account has been deactivated by the super admin.'
      });
    }

    await run('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);
    user = await getAuthSafeUserById(user.id);

    const token = await issueAuthToken(user.id, req);
    res.json({
      success: true,
      message: 'OAuth login successful',
      data: {
        user,
        token
      }
    });
  } catch (error) {
    console.error('Error completing OAuth callback:', error);
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      message: statusCode === 403 ? error.message : 'Failed to complete OAuth login',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Login user

const login = async (req, res) => {

  try {

    // Check for validation errors

    const errors = validationResult(req);

    if (!errors.isEmpty()) {

      return res.status(400).json({

        success: false,

        message: 'Validation failed',

        errors: errors.array()

      });

    }



    const { email, username, identifier, password } = req.body;
    const { ip, userAgent } = getRequestMeta(req);
    const loginIdentifier = String(identifier || email || username || '').trim();


    // Find user by email or username.

    const user = await get(`

      SELECT id, email, username, password_hash, full_name, role, is_active, email_verified, admin_status

      FROM users WHERE LOWER(email) = LOWER(?) OR LOWER(username) = LOWER(?)

    `, [loginIdentifier, loginIdentifier]);



    if (!user) {

      return res.status(401).json({

        success: false,

        message: 'Invalid username/email or password'

      });

    }



    // Check if account is active

    if (!user.is_active) {
      if (user.role === 'admin' || user.role === 'super_admin') {
      await logAdminAudit({
        userId: user.id,
        entityId: user.id,
        action: 'admin_login_failed',
        description: JSON.stringify({ reason: 'deactivated' }),
        ip,
          userAgent
        });
      }
      return res.status(401).json({

        success: false,

        message: 'Account is deactivated'

      });

    }



    // Verify password

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      if (user.role === 'admin' || user.role === 'super_admin') {
      await logAdminAudit({
        userId: user.id,
        entityId: user.id,
        action: 'admin_login_failed',
        description: JSON.stringify({ reason: 'invalid_password' }),
        ip,
          userAgent
        });
      }
      return res.status(401).json({

        success: false,

        message: 'Invalid username/email or password'

      });

    }

    if (user.role === 'admin' && user.admin_status !== 'approved') {
      const reason = user.admin_status === 'pending' ? 'pending' : 'deactivated';
      await logAdminAudit({
        userId: user.id,
        entityId: user.id,
        action: 'admin_login_failed',
        description: JSON.stringify({ reason }),
        ip,
        userAgent
      });
      return res.status(403).json({
        success: false,
        message: user.admin_status === 'pending'
          ? 'Your account is awaiting approval by the super admin.'
          : 'Your account has been deactivated by the super admin.'
      });
    }



    // Update last login

    await run('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);

    if (user.role === 'admin' || user.role === 'super_admin') {
      await logAdminAudit({
        userId: user.id,
        entityId: user.id,
        action: 'admin_login_success',
        description: JSON.stringify({ role: user.role }),
        ip,
        userAgent
      });
    }



    // Generate token

    const token = await issueAuthToken(user.id, req);



    // Remove password from response

    delete user.password_hash;



    res.json({

      success: true,

      message: 'Login successful',

      data: {

        user,

        token

      }

    });

  } catch (error) {

    console.error('Error logging in user:', error);

    res.status(500).json({

      success: false,

      message: 'Failed to login',

      error: process.env.NODE_ENV === 'development' ? error.message : undefined

    });

  }

};



// Verify token and get user data

const verifyToken = async (req, res) => {

  try {

    // If we reach here, the token is valid (due to authenticateToken middleware)

    res.json({

      success: true,

      message: 'Token is valid',

      data: {

        user: {

          id: req.user.id,

          email: req.user.email,

          username: req.user.username,

          full_name: req.user.full_name,

          role: req.user.role,
          admin_status: req.user.admin_status

        }

      }

    });

  } catch (error) {

    console.error('Token verification error:', error);

    res.status(500).json({

      success: false,

      message: 'Failed to verify token',

      error: process.env.NODE_ENV === 'development' ? error.message : undefined

    });

  }

};



// Logout user

const logout = async (req, res) => {

  try {
    if (req.auth?.sessionId) {
      await revokeAuthSession({
        userId: req.user.id,
        sessionId: req.auth.sessionId,
        reason: 'logout'
      });
    }

    res.json({

      success: true,

      message: 'Logout successful'

    });

  } catch (error) {

    console.error('Logout error:', error);

    res.status(500).json({

      success: false,

      message: 'Failed to logout',

      error: process.env.NODE_ENV === 'development' ? error.message : undefined

    });

  }

};

const listSessions = async (req, res) => {
  try {
    const sessions = await listAuthSessions(req.user.id);
    res.json({
      success: true,
      data: sessions.map((session) => ({
        ...session,
        is_current: Boolean(req.auth?.sessionId && session.id === req.auth.sessionId),
        is_active: !session.revoked_at && new Date(session.expires_at).getTime() > Date.now()
      }))
    });
  } catch (error) {
    console.error('Error listing sessions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to list active sessions',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const revokeSession = async (req, res) => {
  try {
    const sessionId = req.params.id;
    await revokeAuthSession({
      userId: req.user.id,
      sessionId,
      reason: 'user_revoked'
    });

    res.json({
      success: true,
      message: 'Session revoked.'
    });
  } catch (error) {
    console.error('Error revoking session:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to revoke session',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const revokeAllSessions = async (req, res) => {
  try {
    await revokeAllAuthSessions({
      userId: req.user.id,
      reason: 'user_revoked_all'
    });

    res.json({
      success: true,
      message: 'All sessions revoked.'
    });
  } catch (error) {
    console.error('Error revoking all sessions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to revoke all sessions',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};



// Get current user profile

const getProfile = async (req, res) => {

  try {

    const user = await get(`

      SELECT id, email, username, full_name, student_id, course, year_of_study, phone, role, admin_status,

             avatar_url, bio, is_active, created_at, updated_at, last_login_at, email_verified

      FROM users WHERE id = ?

    `, [req.user.id]);



    if (!user) {

      return res.status(404).json({

        success: false,

        message: 'User not found'

      });

    }



    res.json({

      success: true,

      data: user

    });

  } catch (error) {

    console.error('Error fetching user profile:', error);

    res.status(500).json({

      success: false,

      message: 'Failed to fetch profile',

      error: process.env.NODE_ENV === 'development' ? error.message : undefined

    });

  }

};



// Update user profile

const updateProfile = async (req, res) => {

  try {

    // Check for validation errors

    const errors = validationResult(req);

    if (!errors.isEmpty()) {

      return res.status(400).json({

        success: false,

        message: 'Validation failed',

        errors: errors.array()

      });

    }



    const updates = [];
    const params = [];

    if (Object.prototype.hasOwnProperty.call(req.body, 'full_name')) {
      updates.push('full_name = ?');
      params.push(req.body.full_name ? String(req.body.full_name).trim() : null);
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'bio')) {
      updates.push('bio = ?');
      params.push(req.body.bio ? String(req.body.bio).trim() : null);
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'avatar_url')) {
      updates.push('avatar_url = ?');
      params.push(req.body.avatar_url ? String(req.body.avatar_url).trim() : null);
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'phone')) {
      updates.push('phone = ?');
      params.push(req.body.phone ? String(req.body.phone).trim() : null);
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'course')) {
      updates.push('course = ?');
      params.push(req.body.course ? String(req.body.course).trim() : null);
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'year_of_study')) {
      const normalizedYear =
        req.body.year_of_study === null || req.body.year_of_study === ''
          ? null
          : Number(req.body.year_of_study);
      updates.push('year_of_study = ?');
      params.push(Number.isNaN(normalizedYear) ? null : normalizedYear);
    }

    if (updates.length > 0) {
      await run(
        `
          UPDATE users
          SET ${updates.join(', ')},
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `,
        [...params, req.user.id]
      );
    }



    // Get updated user

    const user = await get(`

      SELECT id, email, username, full_name, student_id, course, year_of_study, phone, role, admin_status,

             avatar_url, bio, is_active, created_at, updated_at, last_login_at, email_verified

      FROM users WHERE id = ?

    `, [req.user.id]);



    res.json({

      success: true,

      message: 'Profile updated successfully',

      data: user

    });

  } catch (error) {

    console.error('Error updating profile:', error);

    if (error && (error.code === '22001' || error.code === '23514')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid profile data. Please check field formats and lengths.'
      });
    }

    res.status(500).json({

      success: false,

      message: 'Failed to update profile',

      error: process.env.NODE_ENV === 'development' ? error.message : undefined

    });

  }

};



// Change password

const changePassword = async (req, res) => {

  try {

    // Check for validation errors

    const errors = validationResult(req);

    if (!errors.isEmpty()) {

      return res.status(400).json({

        success: false,

        message: 'Validation failed',

        errors: errors.array()

      });

    }



    const { current_password, new_password } = req.body;



    // Get current user with password

    const user = await get('SELECT password_hash FROM users WHERE id = ?', [req.user.id]);



    // Verify current password

    const isCurrentPasswordValid = await bcrypt.compare(current_password, user.password_hash);

    if (!isCurrentPasswordValid) {

      return res.status(400).json({

        success: false,

        message: 'Current password is incorrect'

      });

    }



    // Hash new password

    const saltRounds = 12;

    const newPasswordHash = await bcrypt.hash(new_password, saltRounds);



    // Update password

    await run('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [newPasswordHash, req.user.id]);
    await revokePasswordResetTokensForUser(req.user.id);
    await revokeAllAuthSessions({ userId: req.user.id, reason: 'password_changed' });



    res.json({

      success: true,

      message: 'Password changed successfully'

    });

  } catch (error) {

    console.error('Error changing password:', error);

    res.status(500).json({

      success: false,

      message: 'Failed to change password',

      error: process.env.NODE_ENV === 'development' ? error.message : undefined

    });

  }

};



module.exports = {

  register,

  login,
  forgotPassword,
  resetPassword,
  oauthLogin,
  oauthCallback,

  getProfile,

  updateProfile,

  changePassword,

  verifyToken,

  logout,
  listSessions,
  revokeSession,
  revokeAllSessions,
  requestAdminAccount,
  createAdminAccount,
  inviteAdminAccount,
  acceptAdminInvite,
  listAdminInviteAccounts,
  cancelAdminInviteAccount,
  listPendingAdmins,
  listAdminAccounts,
  listUserAccounts,
  activateUserAccount,
  deactivateUserAccount,
  approveAdminAccount,
  deactivateAdminAccount,
  listAdminAudit

};
