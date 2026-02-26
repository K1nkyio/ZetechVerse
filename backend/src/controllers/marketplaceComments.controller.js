const { validationResult } = require('express-validator');
const MarketplaceComment = require('../models/MarketplaceComment');
const MarketplaceListing = require('../models/MarketplaceListing');
const { db } = require('../config/db');

// Get all comments for a marketplace listing
const getComments = async (req, res) => {
  try {
    const { listingId } = req.params;
    const options = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 10,
      status: req.query.status || 'approved',
      sort_by: req.query.sort_by || 'created_at',
      sort_order: req.query.sort_order || 'ASC'
    };

    // Check if listing exists
    const listing = await MarketplaceListing.findById(listingId);
    if (!listing) {
      return res.status(404).json({
        success: false,
        message: 'Marketplace listing not found'
      });
    }

    const result = await MarketplaceComment.findByListing(listingId, options);

    res.json({
      success: true,
      data: result.comments,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Error fetching marketplace comments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch comments',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get top-level comments only (for threaded comments)
const getTopLevelComments = async (req, res) => {
  try {
    const { listingId } = req.params;
    const options = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 10,
      status: req.query.status || 'approved',
      sort_by: req.query.sort_by || 'created_at',
      sort_order: req.query.sort_order || 'ASC'
    };

    // Check if listing exists
    const listing = await MarketplaceListing.findById(listingId);
    if (!listing) {
      return res.status(404).json({
        success: false,
        message: 'Marketplace listing not found'
      });
    }

    const result = await MarketplaceComment.findTopLevelComments(listingId, options);

    res.json({
      success: true,
      data: result.comments,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Error fetching top-level marketplace comments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch comments',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get replies for a specific comment
const getCommentReplies = async (req, res) => {
  try {
    const { commentId } = req.params;
    const options = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 10,
      status: req.query.status || 'approved',
      sort_by: req.query.sort_by || 'created_at',
      sort_order: req.query.sort_order || 'ASC'
    };

    const result = await MarketplaceComment.findReplies(commentId, options);

    res.json({
      success: true,
      data: result.comments,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Error fetching comment replies:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch replies',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Create a new comment
const createComment = async (req, res) => {
  try {

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { listingId } = req.params;
    const { content, parent_comment_id } = req.body;

    // Check if listing exists
    const listing = await MarketplaceListing.findById(listingId);
    if (!listing) {
      return res.status(404).json({
        success: false,
        message: 'Marketplace listing not found'
      });
    }

    // If replying to a comment, check if parent comment exists
    if (parent_comment_id) {
      const parentComment = await MarketplaceComment.findById(parent_comment_id);
      if (!parentComment) {
        return res.status(404).json({
          success: false,
          message: 'Parent comment not found'
        });
      }
    }

    // Handle anonymous users (no authentication required)
    let userId = null;
      console.log('Creating anonymous user...');
      // Create or get anonymous user
      try {
        const anonymousUser = await new Promise((resolve, reject) => {
          db.get('SELECT id FROM users WHERE email = ? AND role = ?', ['anonymous@zetech.ac.ke', 'user'], (err, row) => {
            if (err) reject(err);
            else resolve(row);
          });
        });

        if (anonymousUser) {
          userId = anonymousUser.id;
        } else {
          // Create anonymous user with 'user' role
          const result = await new Promise((resolve, reject) => {
            db.run(`
              INSERT INTO users (email, username, password_hash, full_name, role, is_active)
              VALUES (?, ?, ?, ?, ?, ?)
            `, ['anonymous@zetech.ac.ke', 'anonymous', 'anonymous_hash', 'Anonymous User', 'user', 1], function(err) {
              if (err) reject(err);
              else resolve(this);
            });
          });
          userId = result.lastID;
        }
      } catch (error) {
        console.error('Error creating anonymous user:', error);
        return res.status(500).json({
          success: false,
          message: 'Failed to create anonymous user',
          error: error.message
        });
      }

    const commentData = {
      listing_id: listingId,
      user_id: userId,
      content: content.trim(),
      parent_comment_id: parent_comment_id || null,
      status: 'approved' // Auto-approve for anonymous comments
    };

    const commentId = await MarketplaceComment.create(commentData);

    // Get the created comment with user information
    const comment = await MarketplaceComment.findById(commentId);

    res.status(201).json({
      success: true,
      message: 'Comment created successfully',
      data: comment
    });
  } catch (error) {
    console.error('Error creating marketplace comment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create comment',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Update a comment
const updateComment = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { commentId } = req.params;
    const { content } = req.body;

    const comment = await MarketplaceComment.findById(commentId);
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    // Check if user owns the comment or is admin
    if (comment.user_id !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update this comment'
      });
    }

    await MarketplaceComment.update(commentId, { content: content.trim() });

    // Get updated comment
    const updatedComment = await MarketplaceComment.findById(commentId);

    res.json({
      success: true,
      message: 'Comment updated successfully',
      data: updatedComment
    });
  } catch (error) {
    console.error('Error updating marketplace comment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update comment',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Delete a comment
const deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;

    const comment = await MarketplaceComment.findById(commentId);
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    // Check if user owns the comment or is admin
    if (comment.user_id !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this comment'
      });
    }

    await MarketplaceComment.delete(commentId);

    res.json({
      success: true,
      message: 'Comment deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting marketplace comment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete comment',
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

    const comment = await MarketplaceComment.findById(commentId);
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    const updateData = {
      status,
      moderated_by: req.user.id,
      moderated_at: new Date().toISOString()
    };

    await MarketplaceComment.update(commentId, updateData);

    res.json({
      success: true,
      message: 'Comment moderated successfully'
    });
  } catch (error) {
    console.error('Error moderating marketplace comment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to moderate comment',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Like a comment
const likeComment = async (req, res) => {
  try {
    const { commentId } = req.params;

    const comment = await MarketplaceComment.findById(commentId);
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    await MarketplaceComment.incrementLikes(commentId);

    res.json({
      success: true,
      message: 'Comment liked successfully'
    });
  } catch (error) {
    console.error('Error liking marketplace comment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to like comment',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Unlike a comment
const unlikeComment = async (req, res) => {
  try {
    const { commentId } = req.params;

    const comment = await MarketplaceComment.findById(commentId);
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    if (comment.likes_count > 0) {
      await MarketplaceComment.decrementLikes(commentId);
    }

    res.json({
      success: true,
      message: 'Comment unliked successfully'
    });
  } catch (error) {
    console.error('Error unliking marketplace comment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to unlike comment',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get all marketplace comments for admin moderation
const getAllCommentsForAdmin = async (req, res) => {
  try {
    const options = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 100,
      status: req.query.status || undefined, // If status is 'all', don't filter
      sort_by: req.query.sort_by || 'created_at',
      sort_order: req.query.sort_order || 'DESC'
    };

    // Remove status filter if 'all' is selected
    if (options.status === 'all') {
      delete options.status;
    }

    const result = await MarketplaceComment.findAllForAdmin(options);

    res.json({
      success: true,
      data: result.comments,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Error fetching marketplace comments for admin:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch comments',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getComments,
  getTopLevelComments,
  getCommentReplies,
  createComment,
  updateComment,
  deleteComment,
  moderateComment,
  likeComment,
  unlikeComment,
  getAllCommentsForAdmin
};