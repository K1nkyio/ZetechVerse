const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

// Import controllers and middleware
const {
  getPosts,
  getPost,
  createPost,
  updatePost,
  deletePost,
  getFeaturedPosts,
  getPostsByCategory,
  getMyPosts,
  getCategories,
  getReviewQueue,
  reviewPost,
  togglePostLike
} = require('../controllers/posts.controller');

const { authenticateToken, optionalAuth } = require('../middleware/auth.middleware');
const { requireAdmin } = require('../middleware/role.middleware');

// Validation rules
const postValidation = [
  body('title')
    .trim()
    .isLength({ min: 5, max: 255 })
    .withMessage('Title must be between 5 and 255 characters'),
  body('content')
    .trim()
    .isLength({ min: 50 })
    .withMessage('Content must be at least 50 characters'),
  body('excerpt')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Excerpt must be less than 500 characters'),
  body('status')
    .optional()
    .isIn(['draft', 'pending', 'published', 'rejected'])
    .withMessage('Invalid status'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  body('featured_image')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Featured image URL must be less than 500 characters'),
  body('video_url')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Video URL must be less than 500 characters')
    .custom((value) => {
      if (!value) return true;
      if (/^https?:\/\//i.test(value) || /^\/uploads\//i.test(value)) return true;
      throw new Error('Invalid video URL format');
    })
];

const updatePostValidation = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 5, max: 255 })
    .withMessage('Title must be between 5 and 255 characters'),
  body('content')
    .optional()
    .trim()
    .isLength({ min: 50 })
    .withMessage('Content must be at least 50 characters'),
  body('excerpt')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Excerpt must be less than 500 characters'),
  body('status')
    .optional()
    .isIn(['draft', 'pending', 'published', 'rejected'])
    .withMessage('Invalid status'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  body('featured_image')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Featured image URL must be less than 500 characters'),
  body('video_url')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Video URL must be less than 500 characters')
    .custom((value) => {
      if (!value) return true;
      if (/^https?:\/\//i.test(value) || /^\/uploads\//i.test(value)) return true;
      throw new Error('Invalid video URL format');
    })
];

// Public routes - specific paths MUST come before dynamic /:id route
router.get('/', optionalAuth, getPosts); // Get all posts
router.get('/featured', optionalAuth, getFeaturedPosts); // Get featured posts - MUST be before /:id
router.get('/categories', optionalAuth, getCategories); // Get post categories
router.get('/category/:category', optionalAuth, getPostsByCategory); // Get posts by category

// Authenticated routes - specific paths MUST come before dynamic /:id route
router.get('/user/my-posts', authenticateToken, getMyPosts); // Get user's posts
router.get('/admin/review-queue', authenticateToken, requireAdmin, getReviewQueue); // Get pending posts for review

// Dynamic route with ID parameter - MUST be last among GET routes
router.get('/:id', optionalAuth, getPost); // Get single post

// Authenticated mutation routes
router.post('/', authenticateToken, postValidation, createPost); // Create post
router.put('/:id', authenticateToken, updatePostValidation, updatePost); // Update post
router.delete('/:id', authenticateToken, deletePost); // Delete post
router.post('/:id/like', authenticateToken, togglePostLike); // Like/unlike post

// Super admin routes for review workflow
router.put('/:id/review', authenticateToken, requireAdmin, reviewPost); // Approve/reject posts

module.exports = router;
