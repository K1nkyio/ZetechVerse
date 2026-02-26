const { validationResult } = require('express-validator');
const Confession = require('../models/Confession');
const Notification = require('../models/Notification');

// Get all confessions with filtering and pagination (only approved ones for public)
const getConfessions = async (req, res) => {
  try {
    const isAdmin = req.user && (req.user.role === 'admin' || req.user.role === 'super_admin');

    console.log('🎯 GET CONFESSIONS REQUEST');
    console.log('User:', req.user);
    console.log('Is Admin:', isAdmin);
    console.log('Query params:', req.query);

    const options = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 10,
      category_id: req.query.category_id,
      search: req.query.search,
      is_hot: req.query.is_hot ? (req.query.is_hot === 'true') : undefined,
      sort_by: req.query.sort_by,
      sort_order: req.query.sort_order
    };

    // Only set status filter if explicitly provided, otherwise let admins see all
    if (req.query.status) {
      options.status = req.query.status;
    } else if (!isAdmin) {
      // For non-admins, default to approved only
      options.status = 'approved';
    }
    // For admins with no status filter, don't set status (show all)

    console.log('Query options:', options);

    const result = await Confession.findAll(options);
    let confessions = result.confessions;
    if (req.user?.id) {
      const { all } = require('../config/db');
      const ids = confessions.map((c) => c.id);
      if (ids.length) {
        const placeholders = ids.map(() => '?').join(',');
        const rows = await all(
          `SELECT confession_id FROM confession_likes WHERE user_id = ? AND confession_id IN (${placeholders})`,
          [req.user.id, ...ids]
        );
        const likedSet = new Set(rows.map((row) => String(row.confession_id)));
        confessions = confessions.map((c) => ({
          ...c,
          likedByMe: likedSet.has(String(c.id))
        }));
      }
    }
    console.log('Query result:', { count: result.confessions.length, total: result.total });

    res.json({
      success: true,
      data: confessions,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Error fetching confessions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch confessions',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get single confession by ID
const getConfession = async (req, res) => {
  try {
    const { id } = req.params;
    const confession = await Confession.findById(id);

    if (!confession) {
      return res.status(404).json({
        success: false,
        message: 'Confession not found'
      });
    }

    // Only show approved confessions to non-admins
    if (confession.status !== 'approved' && req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
      return res.status(404).json({
        success: false,
        message: 'Confession not found'
      });
    }

    // Increment view count for authenticated users (only for approved confessions)
    if (req.user && confession.status === 'approved') {
      await Confession.incrementViews(id);
    }

    let likedByMe = false;
    if (req.user?.id) {
      const { get } = require('../config/db');
      const row = await get('SELECT id FROM confession_likes WHERE confession_id = ? AND user_id = ?', [id, req.user.id]);
      likedByMe = !!row;
    }

    res.json({
      success: true,
      data: {
        ...confession,
        likedByMe
      }
    });
  } catch (error) {
    console.error('Error fetching confession:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch confession',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Create new confession
const createConfession = async (req, res) => {
  try {
    console.log('📨 CREATE CONFESSION REQUEST RECEIVED');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('User:', req.user?.id);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorArray = errors.array();
      console.error('🔴 Confession validation errors:', JSON.stringify(errorArray, null, 2));
      
      const mappedErrors = errorArray.map(err => {
        const fieldName = err.param || err.path || err.field || 'unknown';
        console.error(`✅ Mapped field name: "${fieldName}" from error:`, err);
        return {
          field: fieldName,
          message: err.msg || err.message || 'Validation failed',
          value: err.value
        };
      });
      
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: mappedErrors
      });
    }

    const confessionData = {
      ...req.body,
      author_id: req.body.is_anonymous ? null : (req.user?.id || null),
      status: 'pending' // All new confessions start as pending
    };

    const confessionId = await Confession.create(confessionData);

    res.status(201).json({
      success: true,
      message: 'Confession submitted successfully',
      data: { id: confessionId }
    });
  } catch (error) {
    console.error('Error creating confession:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create confession',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Update confession (admin moderation)
const updateConfession = async (req, res) => {
  try {
    console.log('📨 UPDATE CONFESSION REQUEST RECEIVED');
    console.log('Confession ID:', req.params.id);
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorArray = errors.array();
      console.error('🔴 Confession update validation errors:', JSON.stringify(errorArray, null, 2));
      
      const mappedErrors = errorArray.map(err => {
        const fieldName = err.param || err.path || err.field || 'unknown';
        return {
          field: fieldName,
          message: err.msg || err.message || 'Validation failed',
          value: err.value
        };
      });
      
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: mappedErrors
      });
    }

    const { id } = req.params;
    const confession = await Confession.findById(id);

    if (!confession) {
      return res.status(404).json({
        success: false,
        message: 'Confession not found'
      });
    }

    const updateData = {
      ...req.body,
      moderated_by: req.user.id,
      moderated_at: new Date().toISOString()
    };

    await Confession.update(id, updateData);

    res.json({
      success: true,
      message: 'Confession updated successfully'
    });
  } catch (error) {
    console.error('Error updating confession:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update confession',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Delete confession
const deleteConfession = async (req, res) => {
  try {
    const { id } = req.params;
    const confession = await Confession.findById(id);

    if (!confession) {
      return res.status(404).json({
        success: false,
        message: 'Confession not found'
      });
    }

    await Confession.delete(id);

    res.json({
      success: true,
      message: 'Confession deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting confession:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete confession',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Approve confession
const approveConfession = async (req, res) => {
  try {
    const { id } = req.params;
    const confession = await Confession.findById(id);

    if (!confession) {
      return res.status(404).json({
        success: false,
        message: 'Confession not found'
      });
    }

    await Confession.update(id, {
      status: 'approved',
      moderated_by: req.user.id,
      moderated_at: new Date().toISOString()
    });

    // Trigger notification for approved confession
    try {
      await Notification.createSystemNotification(
        'confessions',
        'New Confession Published',
        `A new confession titled "${confession.content.substring(0, 50)}..." has been approved and published. Check it out now!`,
        id
      );
    } catch (notificationError) {
      console.error('Failed to create notification for approved confession:', notificationError);
    }

    res.json({
      success: true,
      message: 'Confession approved successfully'
    });
  } catch (error) {
    console.error('Error approving confession:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve confession',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Reject confession
const rejectConfession = async (req, res) => {
  try {
    const { id } = req.params;
    const confession = await Confession.findById(id);

    if (!confession) {
      return res.status(404).json({
        success: false,
        message: 'Confession not found'
      });
    }

    const moderation_reason = req.body.reason || 'Content violation';

    await Confession.update(id, {
      status: 'rejected',
      moderation_reason,
      moderated_by: req.user.id,
      moderated_at: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Confession rejected successfully'
    });
  } catch (error) {
    console.error('Error rejecting confession:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject confession',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Flag confession
const flagConfession = async (req, res) => {
  try {
    const { id } = req.params;
    const confession = await Confession.findById(id);

    if (!confession) {
      return res.status(404).json({
        success: false,
        message: 'Confession not found'
      });
    }

    await Confession.update(id, {
      status: 'flagged',
      moderated_by: req.user.id,
      moderated_at: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Confession flagged successfully'
    });
  } catch (error) {
    console.error('Error flagging confession:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to flag confession',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Mark confession as hot
const markAsHot = async (req, res) => {
  try {
    const { id } = req.params;
    const confession = await Confession.findById(id);

    if (!confession) {
      return res.status(404).json({
        success: false,
        message: 'Confession not found'
      });
    }

    const isHot = req.body.is_hot !== undefined ? req.body.is_hot : !confession.is_hot;

    await Confession.update(id, { is_hot: isHot });

    res.json({
      success: true,
      message: `Confession ${isHot ? 'marked as hot' : 'unmarked as hot'} successfully`
    });
  } catch (error) {
    console.error('Error updating hot status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update hot status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get confession statistics (admin only)
const getConfessionStats = async (req, res) => {
  try {
    const { get } = require('../config/db');

    const totalConfessions = await get("SELECT COUNT(*) as count FROM confessions");
    const pendingApprovals = await get("SELECT COUNT(*) as count FROM confessions WHERE status = 'pending'");
    const approvedConfessions = await get("SELECT COUNT(*) as count FROM confessions WHERE status = 'approved'");
    const rejectedConfessions = await get("SELECT COUNT(*) as count FROM confessions WHERE status = 'rejected'");
    const hotConfessions = await get("SELECT COUNT(*) as count FROM confessions WHERE is_hot = 1");

    res.json({
      success: true,
      data: {
        total_confessions: totalConfessions.count || 0,
        pending_approvals: pendingApprovals.count || 0,
        approved_confessions: approvedConfessions.count || 0,
        rejected_confessions: rejectedConfessions.count || 0,
        hot_confessions: hotConfessions.count || 0
      }
    });
  } catch (error) {
    console.error('Error fetching confession stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch confession statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get pending confessions for moderation (admin only)
const getPendingConfessions = async (req, res) => {
  try {
    const options = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 10,
      status: 'pending'
    };

    const result = await Confession.findAll(options);

    res.json({
      success: true,
      data: result.confessions,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Error fetching pending confessions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending confessions',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Like a confession
const likeConfession = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const { run, get } = require('../config/db');

    // Check if already liked
    const existingLike = await get('SELECT id FROM confession_likes WHERE confession_id = ? AND user_id = ?', [id, userId]);
    let liked = false;
    if (existingLike) {
      await run('DELETE FROM confession_likes WHERE confession_id = ? AND user_id = ?', [id, userId]);
    } else {
      await run('INSERT INTO confession_likes (confession_id, user_id) VALUES (?, ?)', [id, userId]);
      liked = true;
    }

    const updated = await get(
      'SELECT COUNT(*)::INTEGER as likes_count FROM confession_likes WHERE confession_id = ?',
      [id]
    );
    const likesCount = Number(updated?.likes_count || 0);
    await run('UPDATE confessions SET likes_count = ? WHERE id = ?', [likesCount, id]);

    res.json({
      success: true,
      message: liked ? 'Confession liked successfully' : 'Confession unliked successfully',
      liked,
      likes_count: likesCount,
      data: {
        liked,
        likes_count: likesCount
      }
    });
  } catch (error) {
    console.error('Error liking confession:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to like confession',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get comments for a confession
const getConfessionComments = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const userId = req.user?.id;

    const { all, get } = require('../config/db');
    const offset = (page - 1) * limit;

    const whereClause = userId
      ? "WHERE cc.confession_id = ? AND (cc.status = 'approved' OR cc.user_id = ?)"
      : "WHERE cc.confession_id = ? AND cc.status = 'approved'";

    const whereParams = userId ? [id, userId] : [id];

    // Get comments
    const comments = await all(`
      SELECT
        cc.*,
        u.username as author_username,
        u.full_name as author_full_name,
        parent.username as parent_author_username
      FROM confession_comments cc
      LEFT JOIN users u ON cc.user_id = u.id
      LEFT JOIN users parent ON cc.parent_comment_id IS NOT NULL AND cc.parent_comment_id = parent.id
      ${whereClause}
      ORDER BY cc.created_at ASC
      LIMIT ? OFFSET ?
    `, [...whereParams, limit, offset]);

    // Get total count
    const countSql = userId
      ? "SELECT COUNT(*) as total FROM confession_comments cc WHERE cc.confession_id = ? AND (cc.status = 'approved' OR cc.user_id = ?)"
      : "SELECT COUNT(*) as total FROM confession_comments cc WHERE cc.confession_id = ? AND cc.status = 'approved'";
    const countResult = await get(countSql, whereParams);

    res.json({
      success: true,
      data: comments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult.total,
        pages: Math.ceil(countResult.total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching confession comments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch comments',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Add comment to a confession
const addConfessionComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { content, parent_comment_id, is_anonymous } = req.body;
    const userId = req.user.id;

    const { run } = require('../config/db');

    // Insert comment
    const result = await run(`
      INSERT INTO confession_comments (
        confession_id, user_id, content, is_anonymous, parent_comment_id, status
      ) VALUES (?, ?, ?, ?, ?, 'pending')
    `, [id, userId, content, is_anonymous ? 1 : 0, parent_comment_id || null]);

    // Update comment count
    await run('UPDATE confessions SET comments_count = comments_count + 1 WHERE id = ?', [id]);

    res.status(201).json({
      success: true,
      message: 'Comment submitted successfully',
      data: { id: result.id }
    });
  } catch (error) {
    console.error('Error adding confession comment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add comment',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Approve a confession comment (admin only)
const approveConfessionComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { run } = require('../config/db');

    await run('UPDATE confession_comments SET status = ?, moderated_by = ?, moderated_at = ? WHERE id = ?',
      ['approved', req.user.id, new Date().toISOString(), id]);

    res.json({
      success: true,
      message: 'Comment approved successfully'
    });
  } catch (error) {
    console.error('Error approving confession comment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve comment',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Reject a confession comment (admin only)
const rejectConfessionComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { run } = require('../config/db');

    await run('UPDATE confession_comments SET status = ?, moderated_by = ?, moderated_at = ? WHERE id = ?',
      ['rejected', req.user.id, new Date().toISOString(), id]);

    res.json({
      success: true,
      message: 'Comment rejected successfully'
    });
  } catch (error) {
    console.error('Error rejecting confession comment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject comment',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Delete a confession comment (admin only)
const deleteConfessionComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { run, get } = require('../config/db');

    // First, get the confession comment to check if it exists and get its confession_id
    const comment = await get('SELECT id, confession_id FROM confession_comments WHERE id = ?', [id]);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    // Delete the comment
    await run('DELETE FROM confession_comments WHERE id = ?', [id]);

    // Update comment count for the confession
    await run('UPDATE confessions SET comments_count = comments_count - 1 WHERE id = ?', [comment.confession_id]);

    res.json({
      success: true,
      message: 'Comment deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting confession comment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete comment',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get all confession comments for moderation (admin only)
const getAllConfessionComments = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, confession_id } = req.query;
    const { all, get } = require('../config/db');
    const offset = (page - 1) * limit;

    let whereConditions = [];
    let params = [];

    if (confession_id) {
      whereConditions.push('cc.confession_id = ?');
      params.push(confession_id);
    }

    if (status && status !== 'all') {
      whereConditions.push('cc.status = ?');
      params.push(status);
    }

    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

    // Get comments
    const comments = await all(`
      SELECT
        cc.*,
        c.content as confession_content,
        u.username as author_username,
        u.full_name as author_full_name,
        m.username as moderated_by_username
      FROM confession_comments cc
      LEFT JOIN confessions c ON cc.confession_id = c.id
      LEFT JOIN users u ON cc.user_id = u.id
      LEFT JOIN users m ON cc.moderated_by = m.id
      ${whereClause}
      ORDER BY cc.created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, limit, offset]);

    // Get total count
    const countResult = await get(`SELECT COUNT(*) as total FROM confession_comments cc ${whereClause}`, params);
    const total = countResult ? countResult.total : 0;

    res.json({
      success: true,
      data: comments || [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching confession comments for moderation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch comments for moderation',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getConfessions,
  getConfession,
  createConfession,
  updateConfession,
  deleteConfession,
  approveConfession,
  rejectConfession,
  flagConfession,
  markAsHot,
  getConfessionStats,
  getPendingConfessions,
  likeConfession,
  getConfessionComments,
  addConfessionComment,
  approveConfessionComment,
  rejectConfessionComment,
  deleteConfessionComment,
  getAllConfessionComments
};
