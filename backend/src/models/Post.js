const { run, get, all } = require('../config/db');

class Post {
  static schemaReady = false;

  static schemaPromise = null;

  static allowedBlogCategoryNames = new Set([
    'technology',
    'design',
    'development',
    'ai & ml',
    'startup',
    'career',
    'careers',
    'tutorial',
    'news',
    'finance',
    'health',
    'education',
    'entertainment',
    'sports',
    'travel',
    'food',
    'relationship',
    'spirituality',
    'gardening',
    'cooking',
    'beauty',
    'personal development',
    'mindfulness',
    'campus life',
    'wellness',
    'success stories',
    'all'
  ]);

  static categoryAliasMap = {
    career: { name: 'Careers', slug: 'careers' },
    careers: { name: 'Careers', slug: 'careers' },
    'ai ml': { name: 'AI & ML', slug: 'ai-ml' },
    'ai and ml': { name: 'AI & ML', slug: 'ai-ml' },
    'ai-&-ml': { name: 'AI & ML', slug: 'ai-ml' }
  };

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
          AND table_name = 'blog_posts'
          AND column_name = 'video_url'
        LIMIT 1
      `);

      if (!videoColumn) {
        await run('ALTER TABLE blog_posts ADD COLUMN video_url VARCHAR(500)');
      }

      this.schemaReady = true;
    })();

    try {
      await this.schemaPromise;
    } finally {
      this.schemaPromise = null;
    }
  }

  // Create a new post
  static async create(postData) {
    try {
      await this.ensureMediaSchema();

      const {
        title,
        content,
        excerpt,
        category,
        tags,
        featured_image,
        video_url,
        status = 'draft',
        author_id
      } = postData;


      // Support review workflow: 'draft', 'pending', 'published', 'rejected', 'archived'
      // 'pending' posts wait for super admin approval
      let dbStatus = status;
      if (!['draft', 'pending', 'published', 'rejected', 'archived'].includes(status)) {
        dbStatus = 'draft'; // Default to draft for invalid status
      }

      // Generate unique slug from title
      let baseSlug = title.toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-') // Replace multiple dashes with single dash
        .replace(/^-|-$/g, '') // Remove leading/trailing dashes
        .substring(0, 100);

      // Ensure slug is not empty - use timestamp as fallback
      if (!baseSlug || baseSlug.trim() === '') {
        baseSlug = `post-${Date.now()}`;
      }

      // Check if slug already exists and make it unique
      let slug = baseSlug;
      let counter = 1;

      while (await this.slugExists(slug)) {
        slug = `${baseSlug}-${counter}`;
        counter++;
        // Prevent infinite loop
        if (counter > 100) {
          slug = `${baseSlug}-${Date.now()}`;
          break;
        }
      }


      const categoryId = await this.resolveBlogCategoryId(category);
      
      const sql = `
        INSERT INTO blog_posts (
          title, slug, excerpt, content, category_id, tags, image_url, video_url, status, author_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const params = [
        title,
        slug,
        excerpt,
        content,
        categoryId, // Use resolved category ID
        tags ? JSON.stringify(tags) : null,
        featured_image,
        video_url,
        dbStatus, // Use mapped status
        author_id
      ];

      console.log('SQL params:', params.map(p => typeof p === 'string' ? p.substring(0, 50) + '...' : p));

      const result = await run(sql, params);
      console.log('Database insert result:', result);
      return result.id;
    } catch (error) {
      console.error('Error in Post.create:', error);
      throw error;
    }
  }

  // Get post by ID with author information
  static async findById(id) {
    const sql = `
      SELECT
        p.*,
        u.username as author_username,
        u.full_name as author_name,
        u.avatar_url as author_avatar,
        c.name as category_name
      FROM blog_posts p
      LEFT JOIN users u ON p.author_id = u.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = ?
    `;

    const post = await get(sql, [id]);
    if (post) {
      // Parse tags JSON
      post.tags = post.tags ? JSON.parse(post.tags) : [];
    }
    return post;
  }

  // Get all posts with pagination and filters
  static async findAll(options = {}) {
    const {
      page = 1,
      limit = 10,
      status = 'published',
      category,
      author_id,
      search,
      sort_by = 'created_at',
      sort_order = 'DESC'
    } = options;

    let whereConditions = [];
    let params = [];

    // Status filter
    if (status && status !== 'all') {
      whereConditions.push('p.status = ?');
      params.push(status);
    }

    // Category filter
    if (category) {
      whereConditions.push("p.category_id IN (SELECT id FROM categories WHERE type = 'blog' AND (LOWER(name) = LOWER(?) OR slug = ?))");
      params.push(category, this.slugifyCategoryName(category));
    }

    // Author filter
    if (author_id) {
      whereConditions.push('p.author_id = ?');
      params.push(author_id);
    }

    // Search filter
    if (search) {
      whereConditions.push('(p.title LIKE ? OR p.content LIKE ? OR p.excerpt LIKE ?)');
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count
    const countSql = `SELECT COUNT(*) as total FROM blog_posts p ${whereClause}`;
    const { total } = await get(countSql, params);

    // Calculate pagination
    const offset = (page - 1) * limit;
    const totalPages = Math.ceil(total / limit);

    // Get posts with author information
    const sql = `
      SELECT
        p.*,
        u.username as author_username,
        u.full_name as author_name,
        u.avatar_url as author_avatar,
        c.name as category_name
      FROM blog_posts p
      LEFT JOIN users u ON p.author_id = u.id
      LEFT JOIN categories c ON p.category_id = c.id
      ${whereClause}
      ORDER BY p.${sort_by} ${sort_order}
      LIMIT ? OFFSET ?
    `;

    const postParams = [...params, limit, offset];
    const posts = await all(sql, postParams);

    // Parse tags JSON for each post
    posts.forEach(post => {
      post.tags = post.tags ? JSON.parse(post.tags) : [];
    });

    return {
      posts,
      pagination: {
        page,
        limit,
        total,
        pages: totalPages
      }
    };
  }

  // Update a post
  static async update(id, updateData) {
    await this.ensureMediaSchema();

    const {
      title,
      content,
      excerpt,
      tags,
      featured_image,
      video_url,
      status
    } = updateData;

    const sql = `
      UPDATE blog_posts SET
        title = COALESCE(?, title),
        content = COALESCE(?, content),
        excerpt = COALESCE(?, excerpt),
        tags = COALESCE(?, tags),
        image_url = COALESCE(?, image_url),
        video_url = COALESCE(?, video_url),
        status = COALESCE(?, status),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    const params = [
      title,
      content,
      excerpt,
      tags ? JSON.stringify(tags) : undefined,
      featured_image,
      video_url,
      status,
      id
    ];

    await run(sql, params);
  }

  // Delete a post
  static async delete(id) {
    const sql = 'DELETE FROM blog_posts WHERE id = ?';
    await run(sql, [id]);
  }

  // Get posts by author
  static async findByAuthor(authorId, options = {}) {
    return this.findAll({ ...options, author_id: authorId });
  }

  // Get featured posts
  static async findFeatured(limit = 6) {
    // Return the most recently created posts as featured
    // This ensures fresh, relevant content appears on the homepage
    return this.findAll({
      status: 'published',
      sort_by: 'created_at',
      sort_order: 'DESC',
      limit
    });
  }

  // Increment view count
  static async incrementViews(id) {
    const sql = 'UPDATE blog_posts SET views_count = views_count + 1 WHERE id = ?';
    await run(sql, [id]);
  }

  // Check if slug already exists
  static async slugExists(slug) {
    const sql = 'SELECT id FROM blog_posts WHERE slug = ? LIMIT 1';
    const result = await get(sql, [slug]);
    return !!result;
  }

  static normalizeCategoryName(value) {
    if (typeof value !== 'string') return '';
    return value.trim().replace(/\s+/g, ' ');
  }

  static slugifyCategoryName(name) {
    return String(name || '')
      .toLowerCase()
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  static toTitleCase(value) {
    return String(value || '')
      .split(' ')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');
  }

  static async resolveBlogCategoryId(categoryInput) {
    const normalizedName = this.normalizeCategoryName(categoryInput);
    if (!normalizedName) return null;

    const normalizedLower = normalizedName.toLowerCase();
    const normalizedSlug = this.slugifyCategoryName(normalizedName);
    const alias = this.categoryAliasMap[normalizedLower] || this.categoryAliasMap[normalizedSlug];

    const candidateNames = [...new Set([
      normalizedName,
      alias?.name
    ].filter(Boolean))];

    const candidateSlugs = [...new Set([
      normalizedSlug,
      alias?.slug
    ].filter(Boolean))];

    const conditions = [];
    const params = [];

    for (const name of candidateNames) {
      conditions.push('LOWER(name) = ?');
      params.push(name.toLowerCase());
    }

    for (const slug of candidateSlugs) {
      conditions.push('slug = ?');
      params.push(slug);
    }

    if (conditions.length > 0) {
      const existing = await get(
        `SELECT id FROM categories WHERE type = 'blog' AND (${conditions.join(' OR ')}) LIMIT 1`,
        params
      );
      if (existing?.id) {
        return existing.id;
      }
    }

    // Only auto-create from known blog category labels to avoid arbitrary category sprawl.
    if (!this.allowedBlogCategoryNames.has(normalizedLower)) {
      return null;
    }

    const categoryName = alias?.name || normalizedName;
    const baseSlug = alias?.slug || normalizedSlug;
    return this.createBlogCategory(categoryName, baseSlug);
  }

  static async createBlogCategory(categoryName, baseSlug) {
    let slugBase = this.slugifyCategoryName(baseSlug || categoryName);
    if (!slugBase) {
      slugBase = 'blog-category';
    }

    let slug = slugBase;
    let counter = 1;
    while (await get('SELECT id FROM categories WHERE slug = ? LIMIT 1', [slug])) {
      slug = `${slugBase}-${counter}`;
      counter += 1;
    }

    const sortOrderResult = await get(
      "SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_sort_order FROM categories WHERE type = 'blog'"
    );
    const nextSortOrder = Number(sortOrderResult?.next_sort_order || 1);

    const created = await run(
      `INSERT INTO categories (name, slug, description, type, icon, color, is_active, sort_order)
       VALUES (?, ?, ?, 'blog', ?, ?, ?, ?)`,
      [
        categoryName,
        slug,
        `${this.toTitleCase(categoryName)} posts`,
        'BookOpen',
        '#3b82f6',
        true,
        nextSortOrder
      ]
    );

    if (created?.id) {
      return created.id;
    }

    const inserted = await get('SELECT id FROM categories WHERE slug = ? LIMIT 1', [slug]);
    return inserted?.id || null;
  }

  // Get categories with post counts
  static async getCategories() {
    const sql = `
      SELECT
        c.name as category,
        COUNT(bp.id) as count
      FROM categories c
      LEFT JOIN blog_posts bp ON c.id = bp.category_id AND bp.status = 'published'
      WHERE c.type = 'blog'
      GROUP BY c.id, c.name
      ORDER BY count DESC
    `;
    return await all(sql);
  }
}

module.exports = Post;
