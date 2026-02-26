const { run, get, all, query } = require('../config/db');

const SUPPORTED_NOTIFICATION_TYPES = [
  'system',
  'personal',
  'reminder',
  'alert',
  'maintenance',
  'update',
  'announcement',
  'marketplace',
  'opportunities',
  'events',
  'confessions',
  'posts',
  // legacy values kept for backward compatibility
  'confession_like',
  'confession_comment',
  'event_reminder',
  'application_update',
  'listing_sold',
  'blog_comment'
];

const SYSTEM_FALLBACK_NOTIFICATION_TYPE = 'system';
const NOTIFICATION_TYPES_SQL = SUPPORTED_NOTIFICATION_TYPES
  .map((type) => `'${type.replace(/'/g, "''")}'`)
  .join(', ');

class Notification {
  static schemaReady = false;

  static schemaPromise = null;

  static getSupportedTypes() {
    return [...SUPPORTED_NOTIFICATION_TYPES];
  }

  static normalizeType(type) {
    const normalized = typeof type === 'string' ? type.trim() : '';
    return SUPPORTED_NOTIFICATION_TYPES.includes(normalized)
      ? normalized
      : SYSTEM_FALLBACK_NOTIFICATION_TYPE;
  }

  static async ensureSchema() {
    if (this.schemaReady) return;
    if (this.schemaPromise) {
      await this.schemaPromise;
      return;
    }

    this.schemaPromise = (async () => {
      // Ensure baseline table/indexes exist for environments with partial migrations.
      await run(`
        CREATE TABLE IF NOT EXISTS notifications (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          type VARCHAR(30) NOT NULL,
          title VARCHAR(255) NOT NULL,
          message TEXT NOT NULL,
          related_id INTEGER,
          is_read BOOLEAN DEFAULT false,
          read_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);

      await run('CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id)');
      await run('CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read)');

      const readAtColumn = await get(`
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'notifications'
          AND column_name = 'read_at'
        LIMIT 1
      `);

      if (!readAtColumn) {
        await run('ALTER TABLE notifications ADD COLUMN read_at TIMESTAMP');
      }

      // Normalize rows before applying strict check constraint.
      await run(`
        UPDATE notifications
        SET type = '${SYSTEM_FALLBACK_NOTIFICATION_TYPE}'
        WHERE type IS NULL OR type NOT IN (${NOTIFICATION_TYPES_SQL})
      `);

      const typeConstraints = await all(`
        SELECT con.conname
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
        WHERE rel.relname = 'notifications'
          AND nsp.nspname = current_schema()
          AND con.contype = 'c'
          AND pg_get_constraintdef(con.oid) ILIKE '%type%'
      `);

      for (const constraint of typeConstraints) {
        const constraintName = String(constraint.conname || '').replace(/"/g, '""');
        if (!constraintName) continue;
        await query(`ALTER TABLE notifications DROP CONSTRAINT IF EXISTS "${constraintName}"`);
      }

      try {
        await query(`
          ALTER TABLE notifications
          ADD CONSTRAINT notifications_type_check
          CHECK (type IN (${NOTIFICATION_TYPES_SQL}))
        `);
      } catch (error) {
        const message = String(error?.message || '').toLowerCase();
        if (!message.includes('already exists')) throw error;
      }

      this.schemaReady = true;
    })();

    try {
      await this.schemaPromise;
    } finally {
      this.schemaPromise = null;
    }
  }

  // Create a new notification
  static async create(notificationData) {
    try {
      await this.ensureSchema();

      const {
        user_id,
        type,
        title,
        message,
        related_id = null
      } = notificationData;

      const sql = `
        INSERT INTO notifications (
          user_id, type, title, message, related_id
        ) VALUES (?, ?, ?, ?, ?)
      `;

      const result = await run(sql, [
        user_id,
        this.normalizeType(type),
        title,
        message,
        related_id
      ]);
      return result.id;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  // Get notifications for a user
  static async findByUser(userId, options = {}) {
    await this.ensureSchema();

    const {
      page = 1,
      limit = 20,
      is_read = null, // null = all, true = read only, false = unread only
      type = null
    } = options;

    let whereConditions = ['n.user_id = ?'];
    let params = [userId];

    // Filter by read status
    if (is_read !== null) {
      whereConditions.push('n.is_read = ?');
      params.push(Boolean(is_read));
    }

    // Filter by type
    if (type) {
      whereConditions.push('n.type = ?');
      params.push(type);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count
    const countSql = `SELECT COUNT(*) as total FROM notifications n ${whereClause}`;
    const { total } = await get(countSql, params);

    // Calculate pagination
    const offset = (page - 1) * limit;
    const totalPages = Math.ceil(total / limit);

    // Get notifications
    const sql = `
      SELECT n.* FROM notifications n
      ${whereClause}
      ORDER BY n.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const notifications = await all(sql, [...params, limit, offset]);

    return {
      notifications,
      pagination: {
        page,
        limit,
        total,
        pages: totalPages
      }
    };
  }

  // Mark notification as read
  static async markAsRead(id, userId) {
    await this.ensureSchema();

    const sql = `
      UPDATE notifications
      SET is_read = true, read_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `;
    await run(sql, [id, userId]);
  }

  // Mark all notifications as read for a user
  static async markAllAsRead(userId) {
    await this.ensureSchema();

    const sql = `
      UPDATE notifications
      SET is_read = true, read_at = CURRENT_TIMESTAMP
      WHERE user_id = ? AND is_read = false
    `;
    await run(sql, [userId]);
  }

  // Get unread count for a user
  static async getUnreadCount(userId) {
    await this.ensureSchema();

    const sql = 'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = false';
    const result = await get(sql, [userId]);
    return Number(result?.count || 0);
  }

  // Delete notification
  static async delete(id, userId) {
    await this.ensureSchema();

    const sql = 'DELETE FROM notifications WHERE id = ? AND user_id = ?';
    await run(sql, [id, userId]);
  }

  // Create system notification for all users
  static async createSystemNotification(type, title, message, relatedId = null) {
    try {
      // Get all active users (excluding anonymous users)
      const users = await all(`
        SELECT id FROM users WHERE role != 'anonymous' AND is_active = true
      `);

      // Create notification for each user
      const notifications = [];
      for (const user of users) {
        const notificationId = await this.create({
          user_id: user.id,
          type,
          title,
          message,
          related_id: relatedId
        });
        notifications.push(notificationId);
      }

      return notifications;
    } catch (error) {
      console.error('Error creating system notification:', error);
      throw error;
    }
  }

  // Create notification for specific user
  static async notifyUser(userId, type, title, message, relatedId = null) {
    return await this.create({
      user_id: userId,
      type,
      title,
      message,
      related_id: relatedId
    });
  }
}

module.exports = Notification;
