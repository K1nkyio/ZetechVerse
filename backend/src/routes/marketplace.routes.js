const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

// Import controllers and middleware
const {
  getMarketplaceCategories,
  getListings,
  getListing,
  createListing,
  updateListing,
  deleteListing,
  getMyListings,
  getMarketplaceStats,
  toggleListingLike
} = require('../controllers/marketplace.controller');

const { authenticateToken, optionalAuth } = require('../middleware/auth.middleware');
const { requireUserOrAdmin } = require('../middleware/role.middleware');

// Validation rules
const createValidation = [
  body('title')
    .trim()
    .isLength({ min: 5, max: 255 })
    .withMessage('Title must be between 5 and 255 characters'),
  body('description')
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Description must be between 10 and 2000 characters'),
  body('price')
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  body('category_id')
    .exists({ checkFalsy: true }).withMessage('category_id is required')
    .isInt().withMessage('category_id must be an integer'),
  body('condition')
    .optional()
    .isIn(['new', 'used', 'refurbished'])
    .withMessage('Invalid condition'),
  body('status')
    .optional()
    .isIn(['active', 'sold', 'inactive'])
    .withMessage('Invalid status'),
  body('contact_method')
    .optional()
    .isIn(['phone', 'email', 'in_app'])
    .withMessage('Invalid contact method'),
  body('location')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Location must be less than 255 characters'),
  body('is_negotiable')
    .optional()
    .isBoolean()
    .withMessage('is_negotiable must be a boolean'),
  body('urgent')
    .optional()
    .isBoolean()
    .withMessage('urgent must be a boolean'),
  body('expires_at')
    .optional({ checkFalsy: true })
    .isISO8601()
    .withMessage('Invalid date format for expires_at'),
];

// Update validation: all fields optional so partial updates are allowed
const updateValidation = [
  body('title').optional().trim().isLength({ min: 5, max: 255 }).withMessage('Title must be between 5 and 255 characters'),
  body('description').optional().trim().isLength({ min: 10, max: 2000 }).withMessage('Description must be between 10 and 2000 characters'),
  body('price').optional().isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('category_id').optional({ nullable: true }).isInt().withMessage('category_id must be an integer'),
  body('condition').optional().isIn(['new', 'used', 'refurbished']).withMessage('Invalid condition'),
  body('status').optional().isIn(['active', 'sold', 'inactive']).withMessage('Invalid status'),
  body('contact_method').optional().isIn(['phone', 'email', 'in_app']).withMessage('Invalid contact method'),
  body('location').optional().trim().isLength({ max: 255 }).withMessage('Location must be less than 255 characters'),
  body('is_negotiable').optional().isBoolean().withMessage('is_negotiable must be a boolean'),
  body('urgent').optional().isBoolean().withMessage('urgent must be a boolean'),
  body('expires_at').optional({ checkFalsy: true }).isISO8601().withMessage('Invalid date format for expires_at'),
];

// Public routes
router.get('/', optionalAuth, getListings); // Get all marketplace listings
router.get('/categories', optionalAuth, getMarketplaceCategories); // Get marketplace categories
router.get('/:id', optionalAuth, getListing); // Get single listing

// Authenticated routes
router.get('/user/my-listings', authenticateToken, getMyListings); // Get user's listings
router.get('/user/stats', authenticateToken, getMarketplaceStats); // Get marketplace stats
router.post('/:id/like', authenticateToken, toggleListingLike); // Like/unlike listing

// Admin routes
router.post('/', authenticateToken, requireUserOrAdmin, createValidation, createListing); // Create listing
router.put('/:id', authenticateToken, requireUserOrAdmin, updateValidation, updateListing); // Update listing
router.delete('/:id', authenticateToken, requireUserOrAdmin, deleteListing); // Delete listing

module.exports = router;
