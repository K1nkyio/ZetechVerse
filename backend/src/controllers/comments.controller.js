const { db } = require('../config/db');

// Get all comments for blog posts and events
const getAllCommentsForAdmin = async (req, res) => {
  try {
    const options = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 100,
      status: req.query.status || undefined, // If status is 'all', don't filter
      sort_by: req.query.sort_by || 'created_at',
      sort_order: req.query.sort_order || 'DESC'
    };

    // Query from both blog_post_comments and events_comments tables
    let sql = `
      SELECT 
        'blog_post' as entity_type,
        c.id,
        c.content,
        c.blog_post_id as entity_id,
        c.user_id,
        c.status,
        c.created_at,
        c.updated_at,
        COALESCE(u.username, u.email) as author_username,
        u.full_name as author_full_name,
        bp.title as entity_title
      FROM blog_post_comments c
      LEFT JOIN users u ON c.user_id = u.id
      LEFT JOIN blog_posts bp ON c.blog_post_id = bp.id
    `;
    
    const params = [];
    
    if (options.status && options.status !== 'all') {
      sql += ` WHERE c.status = ? `;
      params.push(options.status);
    }
    
    sql += ` UNION ALL 
      SELECT 
        'confession' as entity_type,
        c.id,
        c.content,
        c.confession_id as entity_id,
        c.user_id,
        c.status,
        c.created_at,
        c.updated_at,
        COALESCE(u.username, u.email) as author_username,
        u.full_name as author_full_name,
        SUBSTR(cf.content, 1, 50) || '...' as entity_title
      FROM confession_comments c
      LEFT JOIN users u ON c.user_id = u.id
      LEFT JOIN confessions cf ON c.confession_id = cf.id
    `;
    
    if (options.status && options.status !== 'all') {
      sql += ` WHERE c.status = ? `;
      params.push(options.status);
    }
    
    sql += ` UNION ALL 
      SELECT 
        'marketplace' as entity_type,
        c.id,
        c.content,
        c.listing_id as entity_id,
        c.user_id,
        c.status,
        c.created_at,
        c.updated_at,
        COALESCE(u.username, u.email) as author_username,
        u.full_name as author_full_name,
        ml.title as entity_title
      FROM marketplace_comments c
      LEFT JOIN users u ON c.user_id = u.id
      LEFT JOIN marketplace_listings ml ON c.listing_id = ml.id
    `;
    
    if (options.status && options.status !== 'all') {
      sql += ` WHERE c.status = ? `;
      params.push(options.status);
    }
    
    sql += ` ORDER BY 7 ${options.sort_order} LIMIT ? OFFSET ?`;
    params.push(options.limit, (options.page - 1) * options.limit);

    const comments = await new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    // Count total records for pagination
    let totalCountSql1 = `SELECT COUNT(*) as total FROM blog_post_comments c`;
    let totalCountSql2 = `SELECT COUNT(*) as total FROM confession_comments c`;
    let totalCountSql3 = `SELECT COUNT(*) as total FROM marketplace_comments c`;
        
    const totalCountParams1 = [];
    const totalCountParams2 = [];
    const totalCountParams3 = [];
        
    if (options.status && options.status !== 'all') {
      totalCountSql1 += ' WHERE c.status = ?';
      totalCountSql2 += ' WHERE c.status = ?';
      totalCountSql3 += ' WHERE c.status = ?';
      totalCountParams1.push(options.status);
      totalCountParams2.push(options.status);
      totalCountParams3.push(options.status);
    }
        
    // Execute all count queries
    const [totalCountResult1, totalCountResult2, totalCountResult3] = await Promise.all([
      new Promise((resolve, reject) => {
        db.get(totalCountSql1, totalCountParams1, (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      }),
      new Promise((resolve, reject) => {
        db.get(totalCountSql2, totalCountParams2, (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      }),
      new Promise((resolve, reject) => {
        db.get(totalCountSql3, totalCountParams3, (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      })
    ]);
        
    const total = totalCountResult1.total + totalCountResult2.total + totalCountResult3.total;
    const pages = Math.ceil(total / options.limit);

    res.json({
      success: true,
      data: comments,
      pagination: {
        page: options.page,
        limit: options.limit,
        total: total,
        pages: pages
      }
    });
  } catch (error) {
    console.error('Error fetching comments for admin:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch comments',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Moderate a comment (admin only)
const moderateComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { status, moderated_reason } = req.body;

    if (!['approved', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    // First, try to find the comment in blog_post_comments
    let comment = null;
    let tableName = null;
    
    try {
      comment = await new Promise((resolve, reject) => {
        db.get('SELECT * FROM blog_post_comments WHERE id = ?', [commentId], (err, row) => {
          if (err && err.errno !== 1) reject(err);
          else resolve(row);
        });
      });
      
      if (comment) {
        tableName = 'blog_post_comments';
      }
    } catch (err) {
      console.error('Error checking blog_post_comments:', err);
    }
    
    if (!comment) {
      try {
        comment = await new Promise((resolve, reject) => {
          db.get('SELECT * FROM confession_comments WHERE id = ?', [commentId], (err, row) => {
            if (err && err.errno !== 1) reject(err);
            else resolve(row);
          });
        });
        
        if (comment) {
          tableName = 'confession_comments';
        }
      } catch (err) {
        console.error('Error checking confession_comments:', err);
      }
    }
    
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }
    
    const updateData = {
      status: status,
      moderated_by: req.user.id,
      moderated_at: new Date().toISOString()
    };
    
    // Update the comment in the correct table
    await new Promise((resolve, reject) => {
      db.run(`
        UPDATE ${tableName}
        SET status = ?, moderated_by = ?, moderated_at = ?
        WHERE id = ?
      `, [updateData.status, updateData.moderated_by, updateData.moderated_at, commentId], function(err) {
        if (err) reject(err);
        else resolve(this);
      });
    });

    res.json({
      success: true,
      message: 'Comment moderated successfully'
    });
  } catch (error) {
    console.error('Error moderating comment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to moderate comment',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getAllCommentsForAdmin,
  moderateComment
};