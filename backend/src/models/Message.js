const { run, get, all } = require('../config/db');

class Message {
  // Create a new message
  static async create(messageData) {
    const {
      sender_id,
      receiver_id,
      listing_id,
      subject,
      content
    } = messageData;

    const sql = `
      INSERT INTO messages (
        sender_id, receiver_id, listing_id, subject, content, is_read
      ) VALUES (?, ?, ?, ?, ?, 0)
    `;

    const params = [sender_id, receiver_id, listing_id, subject, content];

    const result = await run(sql, params);
    return result.id;
  }

  // Get message by ID
  static async findById(id) {
    const sql = `
      SELECT
        m.*,
        sender.username as sender_username,
        sender.full_name as sender_full_name,
        sender.avatar_url as sender_avatar,
        receiver.username as receiver_username,
        receiver.full_name as receiver_full_name,
        receiver.avatar_url as receiver_avatar
      FROM messages m
      LEFT JOIN users sender ON m.sender_id = sender.id
      LEFT JOIN users receiver ON m.receiver_id = receiver.id
      WHERE m.id = ?
    `;

    return await get(sql, [id]);
  }

  // Get conversation between two users for a listing
  static async getConversation(userId1, userId2, listingId = null) {
    let sql = `
      SELECT
        m.*,
        sender.username as sender_username,
        sender.full_name as sender_full_name,
        sender.avatar_url as sender_avatar,
        receiver.username as receiver_username,
        receiver.full_name as receiver_full_name,
        receiver.avatar_url as receiver_avatar
      FROM messages m
      LEFT JOIN users sender ON m.sender_id = sender.id
      LEFT JOIN users receiver ON m.receiver_id = receiver.id
      WHERE (
        (m.sender_id = ? AND m.receiver_id = ?) OR
        (m.sender_id = ? AND m.receiver_id = ?)
      )
    `;

    const params = [userId1, userId2, userId2, userId1];

    if (listingId) {
      sql += ` AND m.listing_id = ?`;
      params.push(listingId);
    }

    sql += ` ORDER BY m.created_at ASC`;

    return await all(sql, params);
  }

  // Get user's inbox (unique conversations)
  static async getUserInbox(userId, options = {}) {
    const {
      page = 1,
      limit = 20,
      unreadOnly = false
    } = options;

    const offset = (page - 1) * limit;

    // Get unique conversations
    let sql = `
      SELECT
        m.*,
        sender.username as sender_username,
        sender.full_name as sender_full_name,
        sender.avatar_url as sender_avatar,
        receiver.username as receiver_username,
        receiver.full_name as receiver_full_name,
        receiver.avatar_url as receiver_avatar,
        CASE
          WHEN m.sender_id = ? THEN receiver.id
          ELSE sender.id
        END as other_user_id,
        CASE
          WHEN m.sender_id = ? THEN receiver.username
          ELSE sender.username
        END as other_user_username,
        CASE
          WHEN m.sender_id = ? THEN receiver.full_name
          ELSE sender.full_name
        END as other_user_full_name,
        CASE
          WHEN m.sender_id = ? THEN receiver.avatar_url
          ELSE sender.avatar_url
        END as other_user_avatar,
        (SELECT COUNT(*) FROM messages WHERE (receiver_id = ? AND sender_id = CASE WHEN m.sender_id = ? THEN receiver.id ELSE sender.id END AND is_read = 0)) as unread_count
      FROM messages m
      LEFT JOIN users sender ON m.sender_id = sender.id
      LEFT JOIN users receiver ON m.receiver_id = receiver.id
      WHERE m.sender_id = ? OR m.receiver_id = ?
    `;

    const params = [
      userId, userId, userId, userId, userId, userId, userId, userId
    ];

    if (unreadOnly) {
      sql += ` AND m.is_read = 0`;
    }

    sql += ` ORDER BY m.created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const messages = await all(sql, params);

    // Get total count
    let countSql = `SELECT COUNT(*) as count FROM messages WHERE sender_id = ? OR receiver_id = ?`;
    const countParams = [userId, userId];

    if (unreadOnly) {
      countSql += ` AND is_read = 0`;
    }

    const countResult = await get(countSql, countParams);
    const total = countResult?.count || 0;
    const pages = Math.ceil(total / limit);

    return {
      messages,
      pagination: { page, limit, total, pages }
    };
  }

  // Mark message as read
  static async markAsRead(messageId) {
    const sql = `
      UPDATE messages
      SET is_read = 1, read_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    await run(sql, [messageId]);
  }

  // Mark all messages from sender as read
  static async markConversationAsRead(userId, senderId, listingId = null) {
    let sql = `
      UPDATE messages
      SET is_read = 1, read_at = CURRENT_TIMESTAMP
      WHERE receiver_id = ? AND sender_id = ?
    `;

    const params = [userId, senderId];

    if (listingId) {
      sql += ` AND listing_id = ?`;
      params.push(listingId);
    }

    await run(sql, params);
  }

  // Get unread count for user
  static async getUnreadCount(userId) {
    const sql = `
      SELECT COUNT(*) as count FROM messages
      WHERE receiver_id = ? AND is_read = 0
    `;

    const result = await get(sql, [userId]);
    return result?.count || 0;
  }

  // Delete message
  static async delete(messageId) {
    const sql = 'DELETE FROM messages WHERE id = ?';
    await run(sql, [messageId]);
  }

  // Clear conversation
  static async clearConversation(userId1, userId2, listingId = null) {
    let sql = `
      DELETE FROM messages
      WHERE (
        (sender_id = ? AND receiver_id = ?) OR
        (sender_id = ? AND receiver_id = ?)
      )
    `;

    const params = [userId1, userId2, userId2, userId1];

    if (listingId) {
      sql += ` AND listing_id = ?`;
      params.push(listingId);
    }

    await run(sql, params);
  }
}

module.exports = Message;
