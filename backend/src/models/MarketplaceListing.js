const { run, get, all } = require('../config/db');

class MarketplaceListing {
  // Create a new marketplace listing
  static async create(listingData) {
    const {
      title,
      description,
      price,
      category_id,
      location,
      condition = 'used',
      image_urls = [],
      tags = [],
      phone,
      contact_method = 'in_app',
      is_negotiable = false,
      urgent = false,
      expires_at,
      seller_id,
      status = 'active'
    } = listingData;

    const sql = `
      INSERT INTO marketplace_listings (
        title, description, price, category_id, location, condition,
        image_urls, tags, phone, contact_method, is_negotiable, urgent,
        expires_at, seller_id, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      title, description, price, category_id, location, condition,
      image_urls ? JSON.stringify(image_urls) : '[]', tags ? JSON.stringify(tags) : '[]', phone, contact_method,
      is_negotiable, urgent,
      expires_at, seller_id, status
    ];

    const result = await run(sql, params);
    return result.id;
  }

  // Get marketplace listing by ID with related data
  static async findById(id) {
    const sql = `
      SELECT
        m.*,
        u.username as seller_username,
        u.full_name as seller_full_name,
        c.name as category_name,
        c.slug as category_slug
      FROM marketplace_listings m
      LEFT JOIN users u ON m.seller_id = u.id
      LEFT JOIN categories c ON m.category_id = c.id
      WHERE m.id = ?
    `;

    const listing = await get(sql, [id]);
    if (listing) {
      // Parse JSON fields
      listing.image_urls = JSON.parse(listing.image_urls || '[]');
      listing.tags = JSON.parse(listing.tags || '[]');

      // Convert boolean fields
      listing.is_negotiable = Boolean(listing.is_negotiable);
      listing.urgent = Boolean(listing.urgent);
    }

    return listing;
  }

  // Get all marketplace listings with filtering and pagination
  static async findAll(options = {}) {
    const {
      page = 1,
      limit = 10,
      category_id,
      location,
      condition,
      status = 'active',
      search,
      sort_by = 'created_at',
      sort_order = 'DESC',
      price_min,
      price_max,
      seller_id
    } = options;

    let whereConditions = [];
    let params = [];

    if (status && status !== 'all') {
      whereConditions.push('m.status = ?');
      params.push(status);
    }

    // Add filters
    if (seller_id) {
      whereConditions.push('m.seller_id = ?');
      params.push(seller_id);
    }

    if (category_id) {
      whereConditions.push('m.category_id = ?');
      params.push(category_id);
    }

    if (location) {
      whereConditions.push('m.location LIKE ?');
      params.push(`%${location}%`);
    }

    if (condition) {
      whereConditions.push('m.condition = ?');
      params.push(condition);
    }

    if (price_min !== undefined) {
      whereConditions.push('m.price >= ?');
      params.push(price_min);
    }

    if (price_max !== undefined) {
      whereConditions.push('m.price <= ?');
      params.push(price_max);
    }

    if (search) {
      whereConditions.push('(m.title LIKE ? OR m.description LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count
    const countSql = `SELECT COUNT(*) as total FROM marketplace_listings m ${whereClause}`;
    const { total } = await get(countSql, params);

    // Calculate pagination
    const offset = (page - 1) * limit;
    const totalPages = Math.ceil(total / limit);

    // Get listings with pagination
    const sql = `
      SELECT
        m.*,
        u.username as seller_username,
        u.full_name as seller_full_name,
        c.name as category_name,
        c.slug as category_slug
      FROM marketplace_listings m
      LEFT JOIN users u ON m.seller_id = u.id
      LEFT JOIN categories c ON m.category_id = c.id
      ${whereClause}
      ORDER BY m.${sort_by} ${sort_order}
      LIMIT ? OFFSET ?
    `;

    const listingParams = [...params, limit, offset];
    const listings = await all(sql, listingParams);

    // Parse JSON fields for each listing
    const processedListings = listings.map(listing => ({
      ...listing,
      image_urls: JSON.parse(listing.image_urls || '[]'),
      tags: JSON.parse(listing.tags || '[]'),
      is_negotiable: Boolean(listing.is_negotiable),
      urgent: Boolean(listing.urgent)
    }));

    return {
      listings: processedListings,
      pagination: {
        page,
        limit,
        total,
        pages: totalPages
      }
    };
  }

  // Get marketplace listings by user
  static async findByUser(userId, options = {}) {
    return this.findAll({ ...options, seller_id: userId });
  }

  // Update marketplace listing
  static async update(id, updateData) {
    const {
      title,
      description,
      price,
      category_id,
      location,
      condition,
      image_urls,
      tags,
      phone,
      contact_method,
      is_negotiable,
      urgent,
      expires_at,
      status
    } = updateData;

    const sql = `
      UPDATE marketplace_listings SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        price = COALESCE(?, price),
        category_id = COALESCE(?, category_id),
        location = COALESCE(?, location),
        condition = COALESCE(?, condition),
        image_urls = COALESCE(?, image_urls),
        tags = COALESCE(?, tags),
        phone = COALESCE(?, phone),
        contact_method = COALESCE(?, contact_method),
        is_negotiable = COALESCE(?, is_negotiable),
        urgent = COALESCE(?, urgent),
        expires_at = COALESCE(?, expires_at),
        status = COALESCE(?, status)
      WHERE id = ?
    `;

    const params = [
      title, description, price, category_id, location, condition,
      image_urls && image_urls.length > 0 ? JSON.stringify(image_urls) : '[]',
      tags && tags.length > 0 ? JSON.stringify(tags) : '[]',
      phone,
      contact_method,
      is_negotiable !== undefined ? is_negotiable : undefined,
      urgent !== undefined ? urgent : undefined,
      expires_at, status,
      id
    ];

    await run(sql, params);
  }

  // Delete marketplace listing
  static async delete(id) {
    const sql = 'DELETE FROM marketplace_listings WHERE id = ?';
    await run(sql, [id]);
  }

  // Increment view count
  static async incrementViews(id) {
    const sql = 'UPDATE marketplace_listings SET views_count = views_count + 1 WHERE id = ?';
    await run(sql, [id]);
  }
}

module.exports = MarketplaceListing;
