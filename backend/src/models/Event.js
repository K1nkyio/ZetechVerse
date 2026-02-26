const { run, get, all } = require('../config/db');

class Event {
  static schemaReady = false;

  static schemaPromise = null;

  static async ensureMediaSchema() {
    if (this.schemaReady) return;
    if (this.schemaPromise) {
      await this.schemaPromise;
      return;
    }

    this.schemaPromise = (async () => {
      const videoColumn = await get(`
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'events'
          AND column_name = 'video_url'
        LIMIT 1
      `);

      if (!videoColumn) {
        await run('ALTER TABLE events ADD COLUMN video_url VARCHAR(500)');
      }

      this.schemaReady = true;
    })();

    try {
      await this.schemaPromise;
    } finally {
      this.schemaPromise = null;
    }
  }

  // Create a new event
  static async create(eventData) {
    await this.ensureMediaSchema();

    const {
      title,
      description,
      start_date,
      end_date,
      location,
      venue_details,
      type,
      category_id,
      max_attendees,
      registration_deadline,
      ticket_price = 0,
      is_paid = false,
      registration_required = true,
      image_url,
      video_url,
      agenda = [],
      requirements = [],
      contact_email,
      contact_phone,
      website_url,
      organizer_id,
      status = 'draft'
    } = eventData;

    const sql = `
      INSERT INTO events (
        title, description, start_date, end_date, location, venue_details,
        type, category_id, organizer_id, max_attendees, registration_deadline,
        ticket_price, is_paid, registration_required, image_url, video_url, agenda,
        requirements, contact_email, contact_phone, website_url, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      title, description, start_date, end_date, location, venue_details,
      type, category_id, organizer_id, max_attendees, registration_deadline,
      ticket_price, is_paid ? 1 : 0, registration_required ? 1 : 0, image_url, video_url,
      JSON.stringify(agenda), JSON.stringify(requirements),
      contact_email, contact_phone, website_url, status
    ];

    const result = await run(sql, params);
    return result.id;
  }

  // Get event by ID with related data
  static async findById(id) {
    const sql = `
      SELECT
        e.*,
        u.username as organizer_username,
        u.full_name as organizer_full_name,
        c.name as category_name,
        c.slug as category_slug
      FROM events e
      LEFT JOIN users u ON e.organizer_id = u.id
      LEFT JOIN categories c ON e.category_id = c.id
      WHERE e.id = ?
    `;

    const event = await get(sql, [id]);
    if (event) {
      // Parse JSON fields
      event.agenda = JSON.parse(event.agenda || '[]');
      event.requirements = JSON.parse(event.requirements || '[]');

      // Convert boolean fields
      event.is_paid = Boolean(event.is_paid);
      event.registration_required = Boolean(event.registration_required);

      // Add computed fields
      event.is_upcoming = new Date(event.start_date) > new Date();
      event.is_ongoing = new Date(event.start_date) <= new Date() && new Date(event.end_date) >= new Date();
      event.is_past = new Date(event.end_date) < new Date();
    }

    return event;
  }

  // Get all events with filtering and pagination
  static async findAll(options = {}) {
    const {
      page = 1,
      limit = 10,
      type,
      category_id,
      status = 'published',
      search,
      start_date_from,
      start_date_to,
      sort_by = 'start_date',
      sort_order = 'ASC',
      organizer_id
    } = options;

    let whereConditions = [];
    let params = [];

    // Add filters
    if (organizer_id) {
      whereConditions.push('e.organizer_id = ?');
      params.push(organizer_id);
    }

    if (status && status !== 'all') {
      whereConditions.push('e.status = ?');
      params.push(status);
    }

    if (type) {
      whereConditions.push('e.type = ?');
      params.push(type);
    }

    if (category_id) {
      whereConditions.push('e.category_id = ?');
      params.push(category_id);
    }

    if (start_date_from) {
      whereConditions.push('e.start_date >= ?');
      params.push(start_date_from);
    }

    if (start_date_to) {
      whereConditions.push('e.start_date <= ?');
      params.push(start_date_to);
    }

    if (search) {
      whereConditions.push('(e.title LIKE ? OR e.description LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count
    const countSql = `SELECT COUNT(*) as total FROM events e ${whereClause}`;
    const { total } = await get(countSql, params);

    // Calculate pagination
    const offset = (page - 1) * limit;
    const totalPages = Math.ceil(total / limit);

    // Get events with pagination
    const sql = `
      SELECT
        e.*,
        u.username as organizer_username,
        u.full_name as organizer_full_name,
        c.name as category_name,
        c.slug as category_slug
      FROM events e
      LEFT JOIN users u ON e.organizer_id = u.id
      LEFT JOIN categories c ON e.category_id = c.id
      ${whereClause}
      ORDER BY e.${sort_by} ${sort_order}
      LIMIT ? OFFSET ?
    `;

    const eventParams = [...params, limit, offset];
    const events = await all(sql, eventParams);

    // Parse JSON fields for each event
    const processedEvents = events.map(event => ({
      ...event,
      agenda: JSON.parse(event.agenda || '[]'),
      requirements: JSON.parse(event.requirements || '[]'),
      is_paid: Boolean(event.is_paid),
      registration_required: Boolean(event.registration_required),
      is_upcoming: new Date(event.start_date) > new Date(),
      is_ongoing: new Date(event.start_date) <= new Date() && new Date(event.end_date) >= new Date(),
      is_past: new Date(event.end_date) < new Date()
    }));

    return {
      events: processedEvents,
      pagination: {
        page,
        limit,
        total,
        pages: totalPages
      }
    };
  }

  // Get events by user
  static async findByUser(userId, options = {}) {
    return this.findAll({ ...options, organizer_id: userId });
  }

  // Update event
  static async update(id, updateData) {
    await this.ensureMediaSchema();

    const {
      title,
      description,
      start_date,
      end_date,
      location,
      venue_details,
      type,
      category_id,
      max_attendees,
      registration_deadline,
      ticket_price,
      is_paid,
      registration_required,
      image_url,
      video_url,
      agenda,
      requirements,
      contact_email,
      contact_phone,
      website_url,
      status
    } = updateData;

    const sql = `
      UPDATE events SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        start_date = COALESCE(?, start_date),
        end_date = COALESCE(?, end_date),
        location = COALESCE(?, location),
        venue_details = COALESCE(?, venue_details),
        type = COALESCE(?, type),
        category_id = COALESCE(?, category_id),
        max_attendees = COALESCE(?, max_attendees),
        registration_deadline = COALESCE(?, registration_deadline),
        ticket_price = COALESCE(?, ticket_price),
        is_paid = COALESCE(?, is_paid),
        registration_required = COALESCE(?, registration_required),
        image_url = COALESCE(?, image_url),
        video_url = COALESCE(?, video_url),
        agenda = COALESCE(?, agenda),
        requirements = COALESCE(?, requirements),
        contact_email = COALESCE(?, contact_email),
        contact_phone = COALESCE(?, contact_phone),
        website_url = COALESCE(?, website_url),
        status = COALESCE(?, status)
      WHERE id = ?
    `;

    const params = [
      title, description, start_date, end_date, location, venue_details,
      type, category_id, max_attendees, registration_deadline, ticket_price,
      is_paid !== undefined ? (is_paid ? 1 : 0) : undefined,
      registration_required !== undefined ? (registration_required ? 1 : 0) : undefined,
      image_url, video_url,
      agenda ? JSON.stringify(agenda) : undefined,
      requirements ? JSON.stringify(requirements) : undefined,
      contact_email, contact_phone, website_url, status,
      id
    ];

    await run(sql, params);
  }

  // Delete event
  static async delete(id) {
    const sql = 'DELETE FROM events WHERE id = ?';
    await run(sql, [id]);
  }

  // Increment view count
  static async incrementViews(id) {
    const sql = 'UPDATE events SET views_count = views_count + 1 WHERE id = ?';
    await run(sql, [id]);
  }

  // Get featured events
  static async getFeatured(limit = 6) {
    const sql = `
      SELECT
        e.*,
        u.username as organizer_username,
        u.full_name as organizer_full_name,
        c.name as category_name,
        c.slug as category_slug
      FROM events e
      LEFT JOIN users u ON e.organizer_id = u.id
      LEFT JOIN categories c ON e.category_id = c.id
      WHERE e.status = 'published' AND e.start_date > CURRENT_TIMESTAMP
      ORDER BY e.created_at DESC
      LIMIT ?
    `;

    const events = await all(sql, [limit]);

    return events.map(event => ({
      ...event,
      agenda: JSON.parse(event.agenda || '[]'),
      requirements: JSON.parse(event.requirements || '[]'),
      is_paid: Boolean(event.is_paid),
      registration_required: Boolean(event.registration_required)
    }));
  }

  // Get upcoming events
  static async getUpcoming(limit = 10) {
    const sql = `
      SELECT
        e.*,
        u.username as organizer_username,
        u.full_name as organizer_full_name,
        c.name as category_name,
        c.slug as category_slug
      FROM events e
      LEFT JOIN users u ON e.organizer_id = u.id
      LEFT JOIN categories c ON e.category_id = c.id
      WHERE e.status = 'published' AND e.start_date > CURRENT_TIMESTAMP
      ORDER BY e.start_date ASC
      LIMIT ?
    `;

    const events = await all(sql, [limit]);

    return events.map(event => ({
      ...event,
      agenda: JSON.parse(event.agenda || '[]'),
      requirements: JSON.parse(event.requirements || '[]'),
      is_paid: Boolean(event.is_paid),
      registration_required: Boolean(event.registration_required)
    }));
  }
}

module.exports = Event;
