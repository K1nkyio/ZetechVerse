const { run, get, all } = require('../config/db');

let listingKindColumnsEnsured = false;

const isDuplicateColumnError = (error) => {
  const message = (error && error.message) || '';
  return /already exists|duplicate column/i.test(message);
};

const ensureListingKindColumns = async () => {
  if (listingKindColumnsEnsured) return;

  const columns = [
    "ALTER TABLE marketplace_listings ADD COLUMN IF NOT EXISTS listing_kind VARCHAR(20) DEFAULT 'product'",
    "ALTER TABLE marketplace_listings ADD COLUMN IF NOT EXISTS service_details TEXT",
    "ALTER TABLE marketplace_listings ADD COLUMN IF NOT EXISTS hostel_details TEXT"
  ];

  for (const statement of columns) {
    try {
      await run(statement);
    } catch (error) {
      if (!isDuplicateColumnError(error)) {
        const fallbackStatement = statement.replace(' IF NOT EXISTS', '');
        try {
          await run(fallbackStatement);
        } catch (fallbackError) {
          if (!isDuplicateColumnError(fallbackError)) {
            throw fallbackError;
          }
        }
      }
    }
  }

  listingKindColumnsEnsured = true;
};

const parseJsonArray = (value) => {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
};

const parseJsonObject = (value) => {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch (error) {
    return {};
  }
};

class MarketplaceListing {
  // Create a new marketplace listing
  static async create(listingData) {
    await ensureListingKindColumns();

    const {
      title,
      description,
      price,
      category_id,
      location,
      condition,
      image_urls = [],
      tags = [],
      phone,
      contact_method = 'in_app',
      is_negotiable = false,
      urgent = false,
      expires_at,
      listing_kind = 'product',
      service_details = {},
      hostel_details = {},
      seller_id,
      status = 'active'
    } = listingData;

    const normalizedListingKind = listing_kind || 'product';
    const normalizedCondition = normalizedListingKind === 'product' ? (condition || 'used') : condition || null;

    const sql = `
      INSERT INTO marketplace_listings (
        title, description, price, category_id, location, condition,
        image_urls, tags, phone, contact_method, is_negotiable, urgent,
        expires_at, listing_kind, service_details, hostel_details, seller_id, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      title, description, price, category_id, location, normalizedCondition,
      image_urls ? JSON.stringify(image_urls) : '[]', tags ? JSON.stringify(tags) : '[]', phone, contact_method,
      is_negotiable, urgent,
      expires_at,
      normalizedListingKind,
      JSON.stringify(service_details || {}),
      JSON.stringify(hostel_details || {}),
      seller_id, status
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
      listing.image_urls = parseJsonArray(listing.image_urls);
      listing.tags = parseJsonArray(listing.tags);
      listing.service_details = parseJsonObject(listing.service_details);
      listing.hostel_details = parseJsonObject(listing.hostel_details);
      listing.listing_kind = listing.listing_kind || 'product';

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
      seller_id,
      listing_kind
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

    if (listing_kind) {
      whereConditions.push('m.listing_kind = ?');
      params.push(listing_kind);
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
      image_urls: parseJsonArray(listing.image_urls),
      tags: parseJsonArray(listing.tags),
      service_details: parseJsonObject(listing.service_details),
      hostel_details: parseJsonObject(listing.hostel_details),
      listing_kind: listing.listing_kind || 'product',
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
    await ensureListingKindColumns();

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
      listing_kind,
      service_details,
      hostel_details,
      status
    } = updateData;

    const fields = [];
    const params = [];

    if (title !== undefined) {
      fields.push('title = ?');
      params.push(title);
    }
    if (description !== undefined) {
      fields.push('description = ?');
      params.push(description);
    }
    if (price !== undefined) {
      fields.push('price = ?');
      params.push(price);
    }
    if (category_id !== undefined) {
      fields.push('category_id = ?');
      params.push(category_id);
    }
    if (location !== undefined) {
      fields.push('location = ?');
      params.push(location);
    }
    if (condition !== undefined) {
      fields.push('condition = ?');
      params.push(condition);
    }
    if (image_urls !== undefined) {
      fields.push('image_urls = ?');
      params.push(JSON.stringify(Array.isArray(image_urls) ? image_urls : []));
    }
    if (tags !== undefined) {
      fields.push('tags = ?');
      params.push(JSON.stringify(Array.isArray(tags) ? tags : []));
    }
    if (phone !== undefined) {
      fields.push('phone = ?');
      params.push(phone);
    }
    if (contact_method !== undefined) {
      fields.push('contact_method = ?');
      params.push(contact_method);
    }
    if (is_negotiable !== undefined) {
      fields.push('is_negotiable = ?');
      params.push(is_negotiable);
    }
    if (urgent !== undefined) {
      fields.push('urgent = ?');
      params.push(urgent);
    }
    if (expires_at !== undefined) {
      fields.push('expires_at = ?');
      params.push(expires_at);
    }
    if (listing_kind !== undefined) {
      fields.push('listing_kind = ?');
      params.push(listing_kind);
    }
    if (service_details !== undefined) {
      fields.push('service_details = ?');
      params.push(service_details === null ? null : JSON.stringify(service_details));
    }
    if (hostel_details !== undefined) {
      fields.push('hostel_details = ?');
      params.push(hostel_details === null ? null : JSON.stringify(hostel_details));
    }
    if (status !== undefined) {
      fields.push('status = ?');
      params.push(status);
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');

    const sql = `UPDATE marketplace_listings SET ${fields.join(', ')} WHERE id = ?`;
    params.push(id);

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
