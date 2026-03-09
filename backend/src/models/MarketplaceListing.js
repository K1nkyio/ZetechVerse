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
  if (typeof value !== 'string') return {};

  let current = value;

  // Handle legacy/double-encoded JSON payloads.
  for (let i = 0; i < 2; i += 1) {
    try {
      const parsed = JSON.parse(current);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed;
      }
      if (typeof parsed === 'string') {
        current = parsed;
        continue;
      }
      return {};
    } catch (error) {
      return {};
    }
  }

  return {};
};

const asTrimmedString = (value) => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

const normalizeAmenities = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((item) => asTrimmedString(item))
      .filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(/[,\n;|]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
};

const normalizeKey = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');

const getFirstValueByKeys = (source, keys) => {
  if (!source || typeof source !== 'object' || Array.isArray(source)) return undefined;
  const directMap = new Map();
  for (const [key, value] of Object.entries(source)) {
    directMap.set(normalizeKey(key), value);
  }
  for (const key of keys) {
    const hit = directMap.get(normalizeKey(key));
    if (hit !== undefined && hit !== null && hit !== '') return hit;
  }
  return undefined;
};

const mergeDetailSources = (value, preferredNestedKeys = []) => {
  const parsedSource = parseJsonObject(value);
  const merged = { ...parsedSource };
  const sharedDetails = parseJsonObject(parsedSource.details);

  if (Object.keys(sharedDetails).length > 0) {
    Object.assign(merged, sharedDetails);
  }

  for (const key of preferredNestedKeys) {
    const nested = parseJsonObject(parsedSource[key]);
    if (Object.keys(nested).length > 0) {
      Object.assign(merged, nested);
    }
  }

  return merged;
};

const normalizeServiceDetails = (value) => {
  const source = mergeDetailSources(value, [
    'service_details',
    'serviceDetails',
    'service_setup',
    'serviceSetup',
    'service',
    'serviceInfo'
  ]);
  const normalized = {};

  const pricingModel = asTrimmedString(getFirstValueByKeys(source, [
    'pricing_model', 'pricingModel', 'pricing', 'pricing_type', 'pricingType', 'rate_model', 'rateModel', 'pricing model'
  ]));
  const serviceArea = asTrimmedString(getFirstValueByKeys(source, [
    'service_area', 'serviceArea', 'area', 'coverage_area', 'coverageArea', 'service area'
  ]));
  const availability = asTrimmedString(getFirstValueByKeys(source, [
    'availability', 'service_availability', 'serviceAvailability', 'schedule'
  ]));

  // Always include fields, even if empty, to maintain consistent structure
  normalized.pricing_model = pricingModel;
  normalized.service_area = serviceArea;
  normalized.availability = availability;

  return normalized;
};

const normalizeHostelDetails = (value) => {
  const source = mergeDetailSources(value, [
    'hostel_details',
    'hostelDetails',
    'hostel_setup',
    'hostelSetup',
    'accommodation_setup',
    'accommodationSetup',
    'accomodation_setup',
    'accomodationSetup',
    'accommodation',
    'accomodation'
  ]);
  const normalized = {};

  const roomType = asTrimmedString(getFirstValueByKeys(source, [
    'room_type', 'roomType', 'type_of_room', 'typeOfRoom', 'room', 'room type'
  ]));
  const bedsAvailableRaw = getFirstValueByKeys(source, [
    'beds_available', 'bedsAvailable', 'beds', 'bed_count', 'bedCount', 'beds available'
  ]);
  const bedsAvailable = Number(bedsAvailableRaw);
  const genderPolicy = asTrimmedString(getFirstValueByKeys(source, [
    'gender_policy', 'genderPolicy', 'gender', 'policy', 'gender policy'
  ]));
  const amenities = normalizeAmenities(getFirstValueByKeys(source, [
    'amenities', 'facilities', 'facility'
  ]));

  // Always include fields to maintain consistent structure
  normalized.room_type = roomType;
  normalized.beds_available = Number.isFinite(bedsAvailable) && bedsAvailable > 0 ? bedsAvailable : 0;
  normalized.gender_policy = genderPolicy;
  normalized.amenities = amenities;

  return normalized;
};

const hasServiceDetails = (details) =>
  Boolean(
    details &&
    (
      details.pricing_model ||
      details.service_area ||
      details.availability
    )
  );

const hasHostelDetails = (details) =>
  Boolean(
    details &&
    (
      details.room_type ||
      Number(details.beds_available || 0) > 0 ||
      details.gender_policy ||
      (Array.isArray(details.amenities) && details.amenities.length > 0)
    )
  );

const normalizeListingKind = (listingKind, serviceDetails = {}, hostelDetails = {}, categoryName = '', categorySlug = '') => {
  const rawKind = asTrimmedString(listingKind).toLowerCase();

  if (rawKind === 'service' || rawKind === 'hostel') {
    return rawKind;
  }

  // Prefer concrete details over stale/incorrect listing kind values.
  if (hasHostelDetails(hostelDetails)) return 'hostel';
  if (hasServiceDetails(serviceDetails)) return 'service';

  const categoryText = `${asTrimmedString(categoryName)} ${asTrimmedString(categorySlug)}`.toLowerCase();
  if (categoryText.includes('hostel')) return 'hostel';
  if (categoryText.includes('service')) return 'service';

  return 'product';
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

    const normalizedServiceDetails = normalizeServiceDetails(service_details);
    const normalizedHostelDetails = normalizeHostelDetails(hostel_details);
    const normalizedListingKind = normalizeListingKind(
      listing_kind,
      normalizedServiceDetails,
      normalizedHostelDetails
    );
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
      JSON.stringify(normalizedServiceDetails),
      JSON.stringify(normalizedHostelDetails),
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
      listing.service_details = normalizeServiceDetails(listing.service_details);
      listing.hostel_details = normalizeHostelDetails(listing.hostel_details);
      listing.listing_kind = normalizeListingKind(
        listing.listing_kind,
        listing.service_details,
        listing.hostel_details,
        listing.category_name,
        listing.category_slug
      );

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
    const processedListings = listings.map((listing) => {
      const normalizedService = normalizeServiceDetails(listing.service_details);
      const normalizedHostel = normalizeHostelDetails(listing.hostel_details);

      return {
        ...listing,
        image_urls: parseJsonArray(listing.image_urls),
        tags: parseJsonArray(listing.tags),
        service_details: normalizedService,
        hostel_details: normalizedHostel,
        listing_kind: normalizeListingKind(
          listing.listing_kind,
          normalizedService,
          normalizedHostel,
          listing.category_name,
          listing.category_slug
        ),
        is_negotiable: Boolean(listing.is_negotiable),
        urgent: Boolean(listing.urgent)
      };
    });

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

    const normalizedServiceDetails = service_details === undefined
      ? undefined
      : (service_details === null ? null : normalizeServiceDetails(service_details));
    const normalizedHostelDetails = hostel_details === undefined
      ? undefined
      : (hostel_details === null ? null : normalizeHostelDetails(hostel_details));

    let normalizedListingKind = listing_kind;
    if (normalizedListingKind !== undefined) {
      normalizedListingKind = normalizeListingKind(
        normalizedListingKind,
        normalizedServiceDetails || {},
        normalizedHostelDetails || {}
      );
    } else if (normalizedHostelDetails && hasHostelDetails(normalizedHostelDetails)) {
      normalizedListingKind = 'hostel';
    } else if (normalizedServiceDetails && hasServiceDetails(normalizedServiceDetails)) {
      normalizedListingKind = 'service';
    }

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
    if (normalizedListingKind !== undefined) {
      fields.push('listing_kind = ?');
      params.push(normalizedListingKind);
    }
    if (normalizedServiceDetails !== undefined) {
      fields.push('service_details = ?');
      params.push(normalizedServiceDetails === null ? null : JSON.stringify(normalizedServiceDetails));
    }
    if (normalizedHostelDetails !== undefined) {
      fields.push('hostel_details = ?');
      params.push(normalizedHostelDetails === null ? null : JSON.stringify(normalizedHostelDetails));
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
