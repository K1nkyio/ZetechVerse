const crypto = require('crypto');

const { all, get, run } = require('../config/db');

let schemaReadyPromise = null;

const hashToken = (token) => crypto.createHash('sha256').update(String(token)).digest('hex');

const parseDurationMs = (value, fallbackMs) => {
  const raw = String(value || '').trim();
  if (!raw) return fallbackMs;
  const match = raw.match(/^(\d+)\s*([smhd])?$/i);
  if (!match) return fallbackMs;

  const amount = Number(match[1]);
  const unit = (match[2] || 's').toLowerCase();
  const multipliers = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000
  };

  return amount * multipliers[unit];
};

const addMs = (ms) => new Date(Date.now() + ms);

const ensureAuthSecuritySchema = async () => {
  if (!schemaReadyPromise) {
    schemaReadyPromise = (async () => {
      await run(`
        CREATE TABLE IF NOT EXISTS auth_sessions (
          id VARCHAR(64) PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          ip_address VARCHAR(45),
          user_agent TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          expires_at TIMESTAMP NOT NULL,
          revoked_at TIMESTAMP,
          revoked_reason VARCHAR(120)
        )
      `);
      await run('CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_id ON auth_sessions(user_id)');
      await run('CREATE INDEX IF NOT EXISTS idx_auth_sessions_active ON auth_sessions(user_id, revoked_at, expires_at)');

      await run(`
        CREATE TABLE IF NOT EXISTS password_reset_tokens (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          token_hash VARCHAR(64) UNIQUE NOT NULL,
          expires_at TIMESTAMP NOT NULL,
          used_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          ip_address VARCHAR(45),
          user_agent TEXT
        )
      `);
      await run('CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_hash ON password_reset_tokens(token_hash)');
      await run('CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id)');

      await run(`
        CREATE TABLE IF NOT EXISTS admin_invites (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) NOT NULL,
          role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'super_admin')),
          token_hash VARCHAR(64) UNIQUE NOT NULL,
          invited_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
          accepted_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          expires_at TIMESTAMP NOT NULL,
          accepted_at TIMESTAMP,
          cancelled_at TIMESTAMP,
          ip_address VARCHAR(45),
          user_agent TEXT
        )
      `);
      await run('CREATE INDEX IF NOT EXISTS idx_admin_invites_email ON admin_invites(email)');
      await run('CREATE INDEX IF NOT EXISTS idx_admin_invites_token_hash ON admin_invites(token_hash)');

      await run('ALTER TABLE users ADD COLUMN IF NOT EXISTS session_invalidated_at TIMESTAMP');
    })();
  }

  return schemaReadyPromise;
};

const createPasswordResetToken = async ({ userId, ip, userAgent }) => {
  await ensureAuthSecuritySchema();
  const token = crypto.randomBytes(32).toString('base64url');
  const tokenHash = hashToken(token);
  const expiresAt = addMs(15 * 60 * 1000);

  await run(
    `
      INSERT INTO password_reset_tokens (user_id, token_hash, expires_at, ip_address, user_agent)
      VALUES (?, ?, ?, ?, ?)
    `,
    [userId, tokenHash, expiresAt, ip || null, userAgent || null]
  );

  return token;
};

const consumePasswordResetToken = async (token) => {
  await ensureAuthSecuritySchema();
  const tokenHash = hashToken(token);
  const resetToken = await get(
    `
      SELECT id, user_id
      FROM password_reset_tokens
      WHERE token_hash = ?
        AND used_at IS NULL
        AND expires_at > CURRENT_TIMESTAMP
    `,
    [tokenHash]
  );

  if (!resetToken) return null;

  await run(
    'UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE id = ? AND used_at IS NULL',
    [resetToken.id]
  );

  return resetToken;
};

const revokePasswordResetTokensForUser = async (userId) => {
  await ensureAuthSecuritySchema();
  await run(
    'UPDATE password_reset_tokens SET used_at = COALESCE(used_at, CURRENT_TIMESTAMP) WHERE user_id = ? AND used_at IS NULL',
    [userId]
  );
};

const createAdminInviteToken = async ({ email, role, invitedBy, ip, userAgent }) => {
  await ensureAuthSecuritySchema();
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const token = crypto.randomBytes(32).toString('base64url');
  const tokenHash = hashToken(token);
  const expiresAt = addMs(72 * 60 * 60 * 1000);

  await run(
    `
      UPDATE admin_invites
      SET cancelled_at = CURRENT_TIMESTAMP
      WHERE LOWER(email) = LOWER(?)
        AND accepted_at IS NULL
        AND cancelled_at IS NULL
    `,
    [normalizedEmail]
  );

  const result = await run(
    `
      INSERT INTO admin_invites (email, role, token_hash, invited_by, expires_at, ip_address, user_agent)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [normalizedEmail, role, tokenHash, invitedBy, expiresAt, ip || null, userAgent || null]
  );

  return { token, inviteId: result.id, expiresAt };
};

const findActiveAdminInvite = async (token) => {
  await ensureAuthSecuritySchema();
  return get(
    `
      SELECT id, email, role, invited_by, expires_at
      FROM admin_invites
      WHERE token_hash = ?
        AND accepted_at IS NULL
        AND cancelled_at IS NULL
        AND expires_at > CURRENT_TIMESTAMP
    `,
    [hashToken(token)]
  );
};

const markAdminInviteAccepted = async ({ inviteId, userId }) => {
  await ensureAuthSecuritySchema();
  await run(
    `
      UPDATE admin_invites
      SET accepted_at = CURRENT_TIMESTAMP,
          accepted_by = ?
      WHERE id = ?
    `,
    [userId, inviteId]
  );
};

const listAdminInvites = async ({ limit = 100 } = {}) => {
  await ensureAuthSecuritySchema();
  return all(
    `
      SELECT
        i.id,
        i.email,
        i.role,
        i.created_at,
        i.expires_at,
        i.accepted_at,
        i.cancelled_at,
        inviter.email AS invited_by_email,
        inviter.username AS invited_by_username,
        accepted.email AS accepted_by_email,
        accepted.username AS accepted_by_username
      FROM admin_invites i
      LEFT JOIN users inviter ON i.invited_by = inviter.id
      LEFT JOIN users accepted ON i.accepted_by = accepted.id
      ORDER BY i.created_at DESC
      LIMIT ?
    `,
    [limit]
  );
};

const cancelAdminInvite = async ({ inviteId }) => {
  await ensureAuthSecuritySchema();
  return run(
    `
      UPDATE admin_invites
      SET cancelled_at = CURRENT_TIMESTAMP
      WHERE id = ?
        AND accepted_at IS NULL
        AND cancelled_at IS NULL
    `,
    [inviteId]
  );
};

const createAuthSession = async ({ userId, ip, userAgent }) => {
  await ensureAuthSecuritySchema();
  const sessionId = crypto.randomUUID();
  const expiresAt = addMs(parseDurationMs(process.env.JWT_EXPIRES_IN, 7 * 24 * 60 * 60 * 1000));

  await run(
    `
      INSERT INTO auth_sessions (id, user_id, ip_address, user_agent, expires_at)
      VALUES (?, ?, ?, ?, ?)
    `,
    [sessionId, userId, ip || null, userAgent || null, expiresAt]
  );

  return sessionId;
};

const validateAuthSession = async ({ sessionId, userId }) => {
  if (!sessionId) return true;
  await ensureAuthSecuritySchema();
  const session = await get(
    `
      SELECT id
      FROM auth_sessions
      WHERE id = ?
        AND user_id = ?
        AND revoked_at IS NULL
        AND expires_at > CURRENT_TIMESTAMP
    `,
    [sessionId, userId]
  );

  if (!session) return false;

  await run('UPDATE auth_sessions SET last_seen_at = CURRENT_TIMESTAMP WHERE id = ?', [sessionId]);
  return true;
};

const listAuthSessions = async (userId) => {
  await ensureAuthSecuritySchema();
  return all(
    `
      SELECT id, ip_address, user_agent, created_at, last_seen_at, expires_at, revoked_at
      FROM auth_sessions
      WHERE user_id = ?
      ORDER BY COALESCE(last_seen_at, created_at) DESC
    `,
    [userId]
  );
};

const revokeAuthSession = async ({ userId, sessionId, reason = 'user_revoked' }) => {
  await ensureAuthSecuritySchema();
  return run(
    `
      UPDATE auth_sessions
      SET revoked_at = CURRENT_TIMESTAMP,
          revoked_reason = ?
      WHERE id = ?
        AND user_id = ?
        AND revoked_at IS NULL
    `,
    [reason, sessionId, userId]
  );
};

const revokeAllAuthSessions = async ({ userId, reason = 'user_revoked_all' }) => {
  await ensureAuthSecuritySchema();
  await run(
    `
      UPDATE auth_sessions
      SET revoked_at = CURRENT_TIMESTAMP,
          revoked_reason = ?
      WHERE user_id = ?
        AND revoked_at IS NULL
    `,
    [reason, userId]
  );
  await run('UPDATE users SET session_invalidated_at = CURRENT_TIMESTAMP WHERE id = ?', [userId]);
};

module.exports = {
  cancelAdminInvite,
  consumePasswordResetToken,
  createAdminInviteToken,
  createAuthSession,
  createPasswordResetToken,
  ensureAuthSecuritySchema,
  findActiveAdminInvite,
  listAdminInvites,
  listAuthSessions,
  markAdminInviteAccepted,
  revokeAllAuthSessions,
  revokeAuthSession,
  revokePasswordResetTokensForUser,
  validateAuthSession
};
