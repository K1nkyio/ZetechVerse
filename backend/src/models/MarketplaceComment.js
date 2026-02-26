const { run, get, all } = require('../config/db');

class MarketplaceComment {
  // Create a new marketplace comment
  static async create(commentData) {
    const {
      listing_id,
      user_id,
      content,
      status = 'approved',
      parent_comment_id = null
    } = commentData;

    const sql = `
      INSERT INTO marketplace_comments (
        listing_id, user_id, content, status, parent_comment_id
      ) VALUES (?, ?, ?, ?, ?)
    `;

    const params = [listing_id, user_id, content, status, parent_comment_id];

    const result = await run(sql, params);
    return result.id;
  }

  // Get comment by ID with user information
  static async findById(id) {
    const sql = `
      SELECT
        mc.*,
        u.username,
        u.full_name,
        u.avatar_url,
        pc.content as parent_content,
        pu.username as parent_username,
        pu.full_name as parent_full_name
      FROM marketplace_comments mc
      LEFT JOIN users u ON mc.user_id = u.id
      LEFT JOIN marketplace_comments pc ON mc.parent_comment_id = pc.id
      LEFT JOIN users pu ON pc.user_id = pu.id
      WHERE mc.id = ?
    `;

    return await get(sql, [id]);
  }

  // Get all comments for a listing with pagination
  static async findByListing(listingId, options = {}) {
    const {
      page = 1,
      limit = 10,
      status = 'approved',
      sort_by = 'created_at',
      sort_order = 'ASC'
    } = options;

    let whereConditions = ['mc.status = ?'];
    let params = [status];

    whereConditions.push('mc.listing_id = ?');
    params.push(listingId);

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count
    const countSql = `SELECT COUNT(*) as total FROM marketplace_comments mc ${whereClause}`;
    const { total } = await get(countSql, params);

    // Calculate pagination
    const offset = (page - 1) * limit;
    const totalPages = Math.ceil(total / limit);

    // Get comments with user information
    const sql = `
      SELECT
        mc.*,
        u.username,
        u.full_name,
        u.avatar_url,
        pc.content as parent_content,
        pu.username as parent_username,
        pu.full_name as parent_full_name
      FROM marketplace_comments mc
      LEFT JOIN users u ON mc.user_id = u.id
      LEFT JOIN marketplace_comments pc ON mc.parent_comment_id = pc.id
      LEFT JOIN users pu ON pc.user_id = pu.id
      ${whereClause}
      ORDER BY mc.${sort_by} ${sort_order}
      LIMIT ? OFFSET ?
    `;

    const commentParams = [...params, limit, offset];
    const comments = await all(sql, commentParams);

    return {
      comments,
      pagination: {
        page,
        limit,
        total,
        pages: totalPages
      }
    };
  }

  // Get top-level comments only (no replies)
  static async findTopLevelComments(listingId, options = {}) {
    const {
      page = 1,
      limit = 10,
      status = 'approved',
      sort_by = 'created_at',
      sort_order = 'ASC'
    } = options;

    let whereConditions = ['mc.status = ?', 'mc.parent_comment_id IS NULL'];
    let params = [status];

    whereConditions.push('mc.listing_id = ?');
    params.push(listingId);

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count
    const countSql = `SELECT COUNT(*) as total FROM marketplace_comments mc ${whereClause}`;
    const { total } = await get(countSql, params);

    // Calculate pagination
    const offset = (page - 1) * limit;
    const totalPages = Math.ceil(total / limit);

    // Get comments with user information
    const sql = `
      SELECT
        mc.*,
        u.username,
        u.full_name,
        u.avatar_url,
        (SELECT COUNT(*) FROM marketplace_comments WHERE parent_comment_id = mc.id AND status = 'approved') as replies_count
      FROM marketplace_comments mc
      LEFT JOIN users u ON mc.user_id = u.id
      ${whereClause}
      ORDER BY mc.${sort_by} ${sort_order}
      LIMIT ? OFFSET ?
    `;

    const commentParams = [...params, limit, offset];
    const comments = await all(sql, commentParams);

    return {
      comments,
      pagination: {
        page,
        limit,
        total,
        pages: totalPages
      }
    };
  }

  // Get replies for a specific comment
  static async findReplies(commentId, options = {}) {
    const {
      page = 1,
      limit = 10,
      status = 'approved',
      sort_by = 'created_at',
      sort_order = 'ASC'
    } = options;

    let whereConditions = ['mc.status = ?'];
    let params = [status];

    whereConditions.push('mc.parent_comment_id = ?');
    params.push(commentId);

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count
    const countSql = `SELECT COUNT(*) as total FROM marketplace_comments mc ${whereClause}`;
    const { total } = await get(countSql, params);

    // Calculate pagination
    const offset = (page - 1) * limit;
    const totalPages = Math.ceil(total / limit);

    // Get replies with user information
    const sql = `
      SELECT
        mc.*,
        u.username,
        u.full_name,
        u.avatar_url
      FROM marketplace_comments mc
      LEFT JOIN users u ON mc.user_id = u.id
      ${whereClause}
      ORDER BY mc.${sort_by} ${sort_order}
      LIMIT ? OFFSET ?
    `;

    const commentParams = [...params, limit, offset];
    const comments = await all(sql, commentParams);

    return {
      comments,
      pagination: {
        page,
        limit,
        total,
        pages: totalPages
      }
    };
  }

  // Update a comment
  static async update(id, updateData) {
    const {
      content,
      status,
      moderated_by,
      moderated_at
    } = updateData;

    const sql = `
      UPDATE marketplace_comments SET
        content = COALESCE(?, content),
        status = COALESCE(?, status),
        moderated_by = COALESCE(?, moderated_by),
        moderated_at = COALESCE(?, moderated_at)
      WHERE id = ?
    `;

    const params = [content, status, moderated_by, moderated_at, id];
    await run(sql, params);
  }

  // Delete a comment
  static async delete(id) {
    const sql = 'DELETE FROM marketplace_comments WHERE id = ?';
    await run(sql, [id]);
  }

  // Increment likes count
  static async incrementLikes(id) {
    const sql = 'UPDATE marketplace_comments SET likes_count = likes_count + 1 WHERE id = ?';
    await run(sql, [id]);
  }

  // Decrement likes count
  static async decrementLikes(id) {
    const sql = 'UPDATE marketplace_comments SET likes_count = likes_count - 1 WHERE id = ?';
    await run(sql, [id]);
  }

  // Get comment count for a listing
  static async getCommentCount(listingId, status = 'approved') {
    const sql = 'SELECT COUNT(*) as count FROM marketplace_comments WHERE listing_id = ? AND status = ?';
    const result = await get(sql, [listingId, status]);
    return result.count || 0;
  }

  // Get all comments for admin moderation (with listing information)
  static async findAllForAdmin(options = {}) {
    const {
      page = 1,
      limit = 100,
      status,
      sort_by = 'created_at',
      sort_order = 'DESC'
    } = options;

    let whereConditions = [];
    let params = [];

    // Add status filter if provided
    if (status) {
      whereConditions.push('mc.status = ?');
      params.push(status);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count
    const countSql = `SELECT COUNT(*) as total FROM marketplace_comments mc ${whereClause}`;
    const countParams = whereConditions.length > 0 ? params : [];
    const { total } = await get(countSql, countParams);

    // Calculate pagination
    const offset = (page - 1) * limit;
    const totalPages = Math.ceil(total / limit);

    // Get comments with user and listing information
    const sql = `
      SELECT
        mc.*,
        u.username,
        u.full_name,
        u.avatar_url,
        ml.title as listing_title,
        pc.content as parent_content,
        pu.username as parent_username,
        pu.full_name as parent_full_name
      FROM marketplace_comments mc
      LEFT JOIN users u ON mc.user_id = u.id
      LEFT JOIN marketplace_listings ml ON mc.listing_id = ml.id
      LEFT JOIN marketplace_comments pc ON mc.parent_comment_id = pc.id
      LEFT JOIN users pu ON pc.user_id = pu.id
      ${whereClause}
      ORDER BY mc.${sort_by} ${sort_order}
      LIMIT ? OFFSET ?
    `;

    const commentParams = [...countParams, limit, offset];
    const comments = await all(sql, commentParams);

    return {
      comments,
      pagination: {
        page,
        limit,
        total,
        pages: totalPages
      }
    };
  }
}

module.exports = MarketplaceComment;