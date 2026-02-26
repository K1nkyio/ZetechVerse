const express = require('express');
const router = express.Router();

// Import controllers and middleware
const {
  getAllCommentsForAdmin,
  moderateComment
} = require('../controllers/comments.controller');

const { authenticateToken } = require('../middleware/auth.middleware');
const { requireAdmin } = require('../middleware/role.middleware');

// Admin routes
router.get('/admin/comments', authenticateToken, requireAdmin, getAllCommentsForAdmin); // Get all comments for admin moderation
router.put('/comments/:commentId/moderate', authenticateToken, requireAdmin, moderateComment); // Moderate comment

module.exports = router;