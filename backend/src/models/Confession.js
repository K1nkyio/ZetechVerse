const { run, get, all } = require('../config/db');

class Confession {
  // Create a new confession
  static async create(confessionData) {
    const {
      content,
      category_id,
      author_id,
      is_anonymous = true,
      status = 'pending'
    } = confessionData;

    const sql = `
      INSERT INTO confessions (
        content, category_id, author_id, is_anonymous, status
      ) VALUES (?, ?, ?, ?, ?)
    `;

    const params = [
      content, category_id, author_id, is_anonymous, status
    ];

    const result = await run(sql, params);
    return result.id;
  }

  // Get confession by ID with related data
  static async findById(id) {
    const sql = `
      SELECT
        c.*,
        u.username as author_username,
        u.full_name as author_full_name,
        cat.name as category_name,
        cat.slug as category_slug,
        m.username as moderated_by_username
      FROM confessions c
      LEFT JOIN users u ON c.author_id = u.id
      LEFT JOIN categories cat ON c.category_id = cat.id
      LEFT JOIN users m ON c.moderated_by = m.id
      WHERE c.id = ?
    `;

    const confession = await get(sql, [id]);
    if (confession) {
      // Convert boolean fields
      confession.is_anonymous = Boolean(confession.is_anonymous);
      confession.is_hot = Boolean(confession.is_hot);
    }

    return confession;
  }

  // Get all confessions with filtering and pagination
  static async findAll(options = {}) {
    console.log('🔍 RAW OPTIONS RECEIVED:', JSON.stringify(options, null, 2));

    const {
      page = 1,
      limit = 10,
      category_id,
      status,  // No default - will be undefined if not provided
      search,
      is_hot,
      sort_by = 'created_at',
      sort_order = 'DESC',
      author_id
    } = options;

    console.log('🔍 AFTER DESTRUCTURING - status:', status, 'typeof:', typeof status);

    // For admins, status might be undefined to show all confessions
    // For regular users, default to approved only
    const effectiveStatus = status;
    console.log('🔍 EFFECTIVE STATUS:', effectiveStatus);

    let whereConditions = [];
    let params = [];

    // Add filters
    if (author_id) {
      whereConditions.push('c.author_id = ?');
      params.push(author_id);
    }

    if (effectiveStatus !== undefined && effectiveStatus !== null) {
      whereConditions.push('c.status = ?');
      params.push(effectiveStatus);
    }

    if (category_id) {
      whereConditions.push('c.category_id = ?');
      params.push(category_id);
    }

    if (is_hot !== undefined) {
      whereConditions.push('c.is_hot = ?');
      params.push(is_hot);
    }

    if (search) {
      whereConditions.push('c.content LIKE ?');
      params.push(`%${search}%`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Debug logging
    console.log('🔍 CONFESSION QUERY DEBUG:');
    console.log('Where conditions:', whereConditions);
    console.log('Params:', params);
    console.log('Where clause:', whereClause);

    // Get total count
    const countSql = `SELECT COUNT(*) as total FROM confessions c ${whereClause}`;
    console.log('Count SQL:', countSql);
    const { total } = await get(countSql, params);
    console.log('Total count result:', total);

    // Calculate pagination
    const offset = (page - 1) * limit;
    const totalPages = Math.ceil(total / limit);

    // Get confessions with pagination
    const sql = `
      SELECT
        c.*,
        u.username as author_username,
        u.full_name as author_full_name,
        cat.name as category_name,
        cat.slug as category_slug,
        m.username as moderated_by_username
      FROM confessions c
      LEFT JOIN users u ON c.author_id = u.id
      LEFT JOIN categories cat ON c.category_id = cat.id
      LEFT JOIN users m ON c.moderated_by = m.id
      ${whereClause}
      ORDER BY c.${sort_by} ${sort_order}
      LIMIT ? OFFSET ?
    `;

    const confessionParams = [...params, limit, offset];
    const confessions = await all(sql, confessionParams);

    // Process boolean fields for each confession
    const processedConfessions = confessions.map(confession => ({
      ...confession,
      is_anonymous: Boolean(confession.is_anonymous),
      is_hot: Boolean(confession.is_hot)
    }));

    return {
      confessions: processedConfessions,
      pagination: {
        page,
        limit,
        total,
        pages: totalPages
      }
    };
  }

  // Update confession
  static async update(id, updateData) {
    const {
      content,
      category_id,
      status,
      likes_count,
      comments_count,
      shares_count,
      is_hot,
      moderated_by,
      moderated_at,
      moderation_reason
    } = updateData;

    const sql = `
      UPDATE confessions SET
        content = COALESCE(?, content),
        category_id = COALESCE(?, category_id),
        status = COALESCE(?, status),
        likes_count = COALESCE(?, likes_count),
        comments_count = COALESCE(?, comments_count),
        shares_count = COALESCE(?, shares_count),
        is_hot = COALESCE(?, is_hot),
        moderated_by = COALESCE(?, moderated_by),
        moderated_at = COALESCE(?, moderated_at),
        moderation_reason = COALESCE(?, moderation_reason)
      WHERE id = ?
    `;

    const params = [
      content, category_id, status, likes_count, comments_count, shares_count,
      is_hot !== undefined ? is_hot : undefined,
      moderated_by, moderated_at, moderation_reason,
      id
    ];

    await run(sql, params);
  }

  // Delete confession
  static async delete(id) {
    const sql = 'DELETE FROM confessions WHERE id = ?';
    await run(sql, [id]);
  }

  // Increment view count
  static async incrementViews(id) {
    const sql = 'UPDATE confessions SET views_count = views_count + 1 WHERE id = ?';
    try {
      await run(sql, [id]);
    } catch (error) {
      // Some deployed schemas do not include confessions.views_count.
      // Viewing a confession should still work, so treat missing column as a no-op.
      if (error && error.code === '42703') {
        console.warn('Skipping confession view increment: views_count column is missing');
        return;
      }
      throw error;
    }
  }

  // Get confessions by user
  static async findByUser(userId, options = {}) {
    return this.findAll({ ...options, author_id: userId });
  }
}

module.exports = Confession;
