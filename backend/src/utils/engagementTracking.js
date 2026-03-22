const crypto = require('crypto');
const { run, get } = require('../config/db');

let schemaReady = false;
let schemaPromise = null;

const ddlStatements = [
  `CREATE TABLE IF NOT EXISTS content_view_sessions (
    id SERIAL PRIMARY KEY,
    content_type VARCHAR(60) NOT NULL,
    content_id INTEGER NOT NULL,
    viewer_key VARCHAR(255) NOT NULL,
    first_viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (content_type, content_id, viewer_key)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_content_view_sessions_lookup
    ON content_view_sessions(content_type, content_id, viewer_key)`,
  `CREATE INDEX IF NOT EXISTS idx_content_view_sessions_last_viewed
    ON content_view_sessions(last_viewed_at)`,
  `CREATE TABLE IF NOT EXISTS marketplace_comment_likes (
    id SERIAL PRIMARY KEY,
    comment_id INTEGER NOT NULL REFERENCES marketplace_comments(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    liked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (comment_id, user_id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_marketplace_comment_likes_comment_id
    ON marketplace_comment_likes(comment_id)`,
  `CREATE INDEX IF NOT EXISTS idx_marketplace_comment_likes_user_id
    ON marketplace_comment_likes(user_id)`
];

const ensureEngagementTrackingSchema = async () => {
  if (schemaReady) return;
  if (schemaPromise) {
    await schemaPromise;
    return;
  }

  schemaPromise = (async () => {
    for (const statement of ddlStatements) {
      try {
        await run(statement);
      } catch (error) {
        error.message = `Engagement schema update failed for statement "${statement.replace(/\s+/g, ' ').trim().slice(0, 140)}": ${error.message}`;
        throw error;
      }
    }
    schemaReady = true;
  })();

  try {
    await schemaPromise;
  } finally {
    schemaPromise = null;
  }
};

const getClientIp = (req) => {
  const forwarded = req?.headers?.['x-forwarded-for'];
  const firstForwarded = Array.isArray(forwarded)
    ? forwarded[0]
    : (typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : '');

  const rawIp = firstForwarded || req?.ip || req?.socket?.remoteAddress || req?.connection?.remoteAddress || 'unknown';
  return String(rawIp).replace(/^::ffff:/, '').trim() || 'unknown';
};

const getViewerKey = (req) => {
  if (req?.user?.id) {
    return `user:${req.user.id}`;
  }

  const ipAddress = getClientIp(req);
  const userAgent = String(req?.headers?.['user-agent'] || '').trim().slice(0, 255);
  const fingerprint = crypto
    .createHash('sha256')
    .update(`${ipAddress}|${userAgent}`)
    .digest('hex');

  return `guest:${fingerprint}`;
};

const recordUniqueView = async ({
  req,
  contentType,
  contentId,
  incrementView,
  windowHours = 24
}) => {
  await ensureEngagementTrackingSchema();

  const normalizedContentId = Number(contentId);
  if (!contentType || !Number.isFinite(normalizedContentId) || typeof incrementView !== 'function') {
    return false;
  }

  const viewerKey = getViewerKey(req);
  const intervalValue = `${Math.max(1, Number(windowHours) || 24)} hours`;

  const trackedSession = await get(
    `
      INSERT INTO content_view_sessions (
        content_type,
        content_id,
        viewer_key,
        first_viewed_at,
        last_viewed_at
      ) VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (content_type, content_id, viewer_key)
      DO UPDATE
      SET last_viewed_at = CURRENT_TIMESTAMP
      WHERE content_view_sessions.last_viewed_at <= CURRENT_TIMESTAMP - CAST(? AS INTERVAL)
      RETURNING id
    `,
    [contentType, normalizedContentId, viewerKey, intervalValue]
  );

  if (!trackedSession) {
    return false;
  }

  await incrementView();
  return true;
};

const refreshMarketplaceCommentLikesCount = async (commentId) => {
  await ensureEngagementTrackingSchema();

  const normalizedCommentId = Number(commentId);
  const counts = await get(
    'SELECT COUNT(*)::INTEGER AS likes_count FROM marketplace_comment_likes WHERE comment_id = ?',
    [normalizedCommentId]
  );
  const likesCount = Number(counts?.likes_count || 0);

  await run(
    'UPDATE marketplace_comments SET likes_count = ? WHERE id = ?',
    [likesCount, normalizedCommentId]
  );

  return likesCount;
};

const likeMarketplaceComment = async ({ commentId, userId }) => {
  await ensureEngagementTrackingSchema();

  await run(
    `
      INSERT INTO marketplace_comment_likes (comment_id, user_id)
      VALUES (?, ?)
      ON CONFLICT (comment_id, user_id) DO NOTHING
    `,
    [Number(commentId), Number(userId)]
  );

  return refreshMarketplaceCommentLikesCount(commentId);
};

const unlikeMarketplaceComment = async ({ commentId, userId }) => {
  await ensureEngagementTrackingSchema();

  await run(
    'DELETE FROM marketplace_comment_likes WHERE comment_id = ? AND user_id = ?',
    [Number(commentId), Number(userId)]
  );

  return refreshMarketplaceCommentLikesCount(commentId);
};

module.exports = {
  ensureEngagementTrackingSchema,
  recordUniqueView,
  refreshMarketplaceCommentLikesCount,
  likeMarketplaceComment,
  unlikeMarketplaceComment
};
