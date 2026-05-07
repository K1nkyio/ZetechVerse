const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

// Import controllers and middleware
const {
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
} = require('../controllers/marketplaceComments.controller');

const { authenticateToken, optionalAuth } = require('../middleware/auth.middleware');
const { requireAdmin } = require('../middleware/role.middleware');
const { commentLimiter } = require('../middleware/rateLimit.middleware');

// Validation rules
const commentValidation = [
  body('content')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Comment must be between 1 and 1000 characters'),
  body('parent_comment_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Parent comment ID must be a valid integer')
];

const updateCommentValidation = [
  body('content')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Comment must be between 1 and 1000 characters')
];

// Public routes
router.get('/listings/:listingId/comments', getComments); // Get all comments for a listing
router.get('/listings/:listingId/comments/top-level', getTopLevelComments); // Get top-level comments only
router.get('/comments/:commentId/replies', getCommentReplies); // Get replies for a comment

// Authenticated routes (temporarily completely open for testing)
router.post('/listings/:listingId/comments', commentLimiter, commentValidation, createComment); // Create comment
router.put('/comments/:commentId', authenticateToken, updateCommentValidation, updateComment); // Update comment
router.delete('/comments/:commentId', authenticateToken, deleteComment); // Delete comment
router.post('/comments/:commentId/like', authenticateToken, likeComment); // Like comment
router.delete('/comments/:commentId/like', authenticateToken, unlikeComment); // Unlike comment

// Admin routes
router.get('/admin/comments', authenticateToken, requireAdmin, getAllCommentsForAdmin); // Get all comments for admin moderation
router.put('/comments/:commentId/moderate', authenticateToken, requireAdmin, moderateComment); // Moderate comment

module.exports = router;
