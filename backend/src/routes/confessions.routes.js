const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

// Import controllers and middleware
const {
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
  reportConfession,
  getAllConfessionComments,
  likeConfession,
  getConfessionComments,
  addConfessionComment,
  approveConfessionComment,
  rejectConfessionComment,
  deleteConfessionComment
} = require('../controllers/confessions.controller');

const { authenticateToken, optionalAuth } = require('../middleware/auth.middleware');
const { requireUserOrAdmin, requireAdmin } = require('../middleware/role.middleware');

// Validation rules
const confessionValidation = [
  body('content')
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Content must be between 10 and 2000 characters'),
  body('is_anonymous')
    .optional()
    .isBoolean()
    .withMessage('is_anonymous must be a boolean'),
];

const moderationValidation = [
  body('status')
    .optional()
    .isIn(['pending', 'approved', 'rejected', 'flagged'])
    .withMessage('Invalid status'),
  body('moderation_reason')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Moderation reason must be less than 500 characters'),
  body('is_hot')
    .optional()
    .isBoolean()
    .withMessage('is_hot must be a boolean'),
];

const commentValidation = [
  body('content')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Comment must be between 1 and 500 characters'),
  body('parent_comment_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Invalid parent comment ID'),
  body('is_anonymous')
    .optional()
    .isBoolean()
    .withMessage('is_anonymous must be a boolean'),
];

// Public routes (approved confessions for anonymous users, all confessions for admins)
router.get('/', optionalAuth, getConfessions); // Get confessions (filtered based on user role)
router.get('/:id(\\d+)', optionalAuth, getConfession); // Get single confession
router.get('/:id(\\d+)/comments', optionalAuth, getConfessionComments); // Get comments for a confession

// Public routes (allow anonymous confession submission)
router.post('/', optionalAuth, confessionValidation, createConfession); // Create confession (anonymous allowed)

// Protected routes (require authentication)
router.use(authenticateToken); // All routes below require authentication

router.post('/:id(\\d+)/like', likeConfession); // Like/unlike a confession
router.post('/:id(\\d+)/comments', commentValidation, addConfessionComment); // Add comment to confession
router.post('/:id(\\d+)/report', [
  body('reason')
    .trim()
    .isLength({ min: 3, max: 120 })
    .withMessage('reason must be between 3 and 120 characters'),
  body('details')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('details must be under 1000 characters'),
], reportConfession);

// Admin routes
router.get('/admin/pending', authenticateToken, requireAdmin, getPendingConfessions); // Get pending confessions
router.get('/admin/stats', authenticateToken, requireAdmin, getConfessionStats); // Get confession stats
router.get('/admin/comments', authenticateToken, requireAdmin, getAllConfessionComments); // Get all confession comments for moderation
// Test route before authentication middleware
router.get('/test', (req, res) => res.json({ success: true, message: 'Test endpoint works' })); // Simple test
router.put('/admin/comments/:id/approve', authenticateToken, requireAdmin, approveConfessionComment); // Approve confession comment
router.put('/admin/comments/:id/reject', authenticateToken, requireAdmin, rejectConfessionComment); // Reject confession comment
router.delete('/admin/comments/:id', authenticateToken, requireAdmin, deleteConfessionComment); // Delete confession comment
router.put('/:id(\\d+)', authenticateToken, requireAdmin, moderationValidation, updateConfession); // Update confession (moderation)
router.put('/:id(\\d+)/approve', authenticateToken, requireAdmin, approveConfession); // Approve confession
router.put('/:id(\\d+)/reject', authenticateToken, requireAdmin, rejectConfession); // Reject confession
router.put('/:id(\\d+)/flag', authenticateToken, requireAdmin, flagConfession); // Flag confession
router.put('/:id(\\d+)/hot', authenticateToken, requireAdmin, markAsHot); // Mark as hot
router.delete('/:id(\\d+)', authenticateToken, requireAdmin, deleteConfession); // Delete confession

module.exports = router;
