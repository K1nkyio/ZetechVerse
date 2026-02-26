const { run, get, all } = require('../config/db');

class Opportunity {
  // Create a new opportunity
  static async create(opportunityData) {
    const {
      title,
      description,
      company,
      location,
      type,
      category_id,
      application_deadline,
      start_date,
      end_date,
      salary_min,
      salary_max,
      currency = 'KES',
      is_paid = false,
      is_remote = false,
      requirements = [],
      benefits = [],
      contact_email,
      contact_phone,
      application_url,
      posted_by
    } = opportunityData;

    const sql = `
      INSERT INTO opportunities (
        title, description, company, location, type, category_id,
        application_deadline, start_date, end_date, salary_min, salary_max, currency,
        is_paid, is_remote, requirements, benefits, contact_email, contact_phone,
        application_url, posted_by, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
    `;

    const params = [
      title, description, company, location, type, category_id,
      application_deadline, start_date, end_date, salary_min, salary_max, currency,
      is_paid, is_remote, JSON.stringify(requirements), JSON.stringify(benefits),
      contact_email, contact_phone, application_url, posted_by
    ];

    const result = await run(sql, params);
    return result.id;
  }

  // Get opportunity by ID with related data
  static async findById(id) {
    const sql = `
      SELECT
        o.*,
        u.username as posted_by_username,
        u.full_name as posted_by_full_name,
        c.name as category_name,
        c.slug as category_slug
      FROM opportunities o
      LEFT JOIN users u ON o.posted_by = u.id
      LEFT JOIN categories c ON o.category_id = c.id
      WHERE o.id = ?
    `;

    const opportunity = await get(sql, [id]);
    if (opportunity) {
      // Parse JSON fields
      opportunity.requirements = JSON.parse(opportunity.requirements || '[]');
      opportunity.benefits = JSON.parse(opportunity.benefits || '[]');

      // Add computed fields
      opportunity.days_until_deadline = this.calculateDaysUntilDeadline(opportunity.application_deadline);
      opportunity.is_expired = this.isExpired(opportunity.application_deadline);
    }

    return opportunity;
  }

  // Get all opportunities with filtering and pagination
  static async findAll(options = {}) {
    const {
      page = 1,
      limit = 10,
      type,
      category_id,
      location,
      is_remote,
      is_paid,
      status = 'active',
      search,
      sort_by = 'created_at',
      sort_order = 'DESC'
    } = options;

    let whereConditions = [];
    let params = [];

    if (status && status !== 'all') {
      whereConditions.push('o.status = ?');
      params.push(status);
    }

    // Add filters
    if (type) {
      whereConditions.push('o.type = ?');
      params.push(type);
    }

    if (category_id) {
      whereConditions.push('o.category_id = ?');
      params.push(category_id);
    }

    if (location) {
      whereConditions.push('o.location LIKE ?');
      params.push(`%${location}%`);
    }

    if (is_remote !== undefined) {
      whereConditions.push('o.is_remote = ?');
      params.push(is_remote ? 1 : 0);
    }

    if (is_paid !== undefined) {
      whereConditions.push('o.is_paid = ?');
      params.push(is_paid ? 1 : 0);
    }

    if (search) {
      whereConditions.push('(o.title LIKE ? OR o.description LIKE ? OR o.company LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Validate sort column
    const allowedSortColumns = ['created_at', 'application_deadline', 'title', 'company', 'views_count'];
    const sortColumn = allowedSortColumns.includes(sort_by) ? sort_by : 'created_at';
    const sortDirection = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Calculate offset
    const offset = (page - 1) * limit;

    // Main query
    const sql = `
      SELECT
        o.*,
        u.username as posted_by_username,
        u.full_name as posted_by_full_name,
        c.name as category_name,
        c.slug as category_slug
      FROM opportunities o
      LEFT JOIN users u ON o.posted_by = u.id
      LEFT JOIN categories c ON o.category_id = c.id
      ${whereClause}
      ORDER BY o.${sortColumn} ${sortDirection}
      LIMIT ? OFFSET ?
    `;

    params.push(limit, offset);

    const opportunities = await all(sql, params);

    // Process each opportunity
    const processedOpportunities = opportunities.map(opp => ({
      ...opp,
      requirements: JSON.parse(opp.requirements || '[]'),
      benefits: JSON.parse(opp.benefits || '[]'),
      days_until_deadline: this.calculateDaysUntilDeadline(opp.application_deadline),
      is_expired: this.isExpired(opp.application_deadline)
    }));

    // Count query for pagination
    const countSql = `SELECT COUNT(*) as total FROM opportunities o ${whereClause}`;
    const countParams = params.slice(0, -2); // Remove limit and offset
    const countResult = await get(countSql, countParams);

    return {
      opportunities: processedOpportunities,
      pagination: {
        page,
        limit,
        total: countResult.total,
        pages: Math.ceil(countResult.total / limit)
      }
    };
  }

  // Update opportunity
  static async update(id, updateData) {
    // Build dynamic update query to handle partial updates
    const fields = [];
    const params = [];
    
    // Add each field to the update if it's provided in updateData
    if (updateData.title !== undefined) {
      fields.push('title = ?');
      params.push(updateData.title);
    }
    if (updateData.description !== undefined) {
      fields.push('description = ?');
      params.push(updateData.description);
    }
    if (updateData.company !== undefined) {
      fields.push('company = ?');
      params.push(updateData.company);
    }
    if (updateData.location !== undefined) {
      fields.push('location = ?');
      params.push(updateData.location);
    }
    if (updateData.type !== undefined) {
      fields.push('type = ?');
      params.push(updateData.type);
    }
    if (updateData.category_id !== undefined) {
      fields.push('category_id = ?');
      params.push(updateData.category_id);
    }
    if (updateData.application_deadline !== undefined) {
      fields.push('application_deadline = ?');
      params.push(updateData.application_deadline);
    }
    if (updateData.start_date !== undefined) {
      fields.push('start_date = ?');
      params.push(updateData.start_date);
    }
    if (updateData.end_date !== undefined) {
      fields.push('end_date = ?');
      params.push(updateData.end_date);
    }
    if (updateData.salary_min !== undefined) {
      fields.push('salary_min = ?');
      params.push(updateData.salary_min);
    }
    if (updateData.salary_max !== undefined) {
      fields.push('salary_max = ?');
      params.push(updateData.salary_max);
    }
    if (updateData.currency !== undefined) {
      fields.push('currency = ?');
      params.push(updateData.currency);
    }
    if (updateData.is_paid !== undefined) {
      fields.push('is_paid = ?');
      params.push(updateData.is_paid ? 1 : 0);
    }
    if (updateData.is_remote !== undefined) {
      fields.push('is_remote = ?');
      params.push(updateData.is_remote ? 1 : 0);
    }
    if (updateData.requirements !== undefined) {
      fields.push('requirements = ?');
      params.push(JSON.stringify(updateData.requirements));
    }
    if (updateData.benefits !== undefined) {
      fields.push('benefits = ?');
      params.push(JSON.stringify(updateData.benefits));
    }
    if (updateData.contact_email !== undefined) {
      fields.push('contact_email = ?');
      params.push(updateData.contact_email);
    }
    if (updateData.contact_phone !== undefined) {
      fields.push('contact_phone = ?');
      params.push(updateData.contact_phone);
    }
    if (updateData.application_url !== undefined) {
      fields.push('application_url = ?');
      params.push(updateData.application_url);
    }
    if (updateData.status !== undefined) {
      fields.push('status = ?');
      params.push(updateData.status);
    }
    
    // Always update the timestamp
    fields.push('updated_at = CURRENT_TIMESTAMP');
    
    if (fields.length === 0) {
      // Nothing to update
      return true;
    }
    
    const sql = `UPDATE opportunities SET ${fields.join(', ')} WHERE id = ?`;
    params.push(id);
    
    const result = await run(sql, params);
    return result.changes > 0;
  }

  // Delete opportunity
  static async delete(id) {
    const result = await run('DELETE FROM opportunities WHERE id = ?', [id]);
    return result.changes > 0;
  }

  // Increment view count
  static async incrementViews(id) {
    await run('UPDATE opportunities SET views_count = views_count + 1 WHERE id = ?', [id]);
  }

  // Get opportunities by user
  static async findByUser(userId, options = {}) {
    const { page = 1, limit = 10, status } = options;

    let whereConditions = ['posted_by = ?'];
    let params = [userId];

    if (status) {
      whereConditions.push('status = ?');
      params.push(status);
    }

    const whereClause = whereConditions.join(' AND ');
    const offset = (page - 1) * limit;

    const sql = `
      SELECT
        o.*,
        c.name as category_name,
        c.slug as category_slug,
        (SELECT COUNT(*) FROM opportunity_applications oa WHERE oa.opportunity_id = o.id) as applications_count
      FROM opportunities o
      LEFT JOIN categories c ON o.category_id = c.id
      WHERE ${whereClause}
      ORDER BY o.created_at DESC
      LIMIT ? OFFSET ?
    `;

    params.push(limit, offset);

    const opportunities = await all(sql, params);

    // Process opportunities
    const processedOpportunities = opportunities.map(opp => ({
      ...opp,
      requirements: JSON.parse(opp.requirements || '[]'),
      benefits: JSON.parse(opp.benefits || '[]'),
      days_until_deadline: this.calculateDaysUntilDeadline(opp.application_deadline),
      is_expired: this.isExpired(opp.application_deadline)
    }));

    // Count query
    const countSql = `SELECT COUNT(*) as total FROM opportunities WHERE ${whereClause}`;
    const countParams = params.slice(0, -2);
    const countResult = await get(countSql, countParams);

    return {
      opportunities: processedOpportunities,
      pagination: {
        page,
        limit,
        total: countResult.total,
        pages: Math.ceil(countResult.total / limit)
      }
    };
  }

  // Get featured/popular opportunities
  static async getFeatured(limit = 6) {
    const sql = `
      SELECT
        o.*,
        u.username as posted_by_username,
        c.name as category_name
      FROM opportunities o
      LEFT JOIN users u ON o.posted_by = u.id
      LEFT JOIN categories c ON o.category_id = c.id
      WHERE o.status = 'active'
        AND (o.application_deadline IS NULL OR o.application_deadline > CURRENT_TIMESTAMP)
      ORDER BY o.views_count DESC, o.created_at DESC
      LIMIT ?
    `;

    const opportunities = await all(sql, [limit]);

    return opportunities.map(opp => ({
      ...opp,
      requirements: JSON.parse(opp.requirements || '[]'),
      benefits: JSON.parse(opp.benefits || '[]'),
      days_until_deadline: this.calculateDaysUntilDeadline(opp.application_deadline),
      is_expired: this.isExpired(opp.application_deadline)
    }));
  }

  // Helper methods
  static calculateDaysUntilDeadline(deadline) {
    if (!deadline) return null;

    const now = new Date();
    const deadlineDate = new Date(deadline);
    const diffTime = deadlineDate - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays > 0 ? diffDays : 0;
  }

  static isExpired(deadline) {
    if (!deadline) return false;
    return new Date(deadline) < new Date();
  }
}

module.exports = Opportunity;
