const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

// Import controllers and middleware
const {
  getOpportunities,
  getOpportunity,
  createOpportunity,
  updateOpportunity,
  deleteOpportunity,
  getMyOpportunities,
  getFeaturedOpportunities,
  getOpportunityStats
} = require('../controllers/opportunities.controller');

const { authenticateToken } = require('../middleware/auth.middleware');
const { requireUserOrAdmin } = require('../middleware/role.middleware');

// Validation rules
const opportunityValidation = [
  body('title')
    .trim()
    .isLength({ min: 5, max: 255 })
    .withMessage('Title must be between 5 and 255 characters'),
  body('description')
    .trim()
    .isLength({ min: 20, max: 5000 })
    .withMessage('Description must be between 20 and 5000 characters'),
  body('company')
    .trim()
    .notEmpty()
    .isLength({ min: 2, max: 255 })
    .withMessage('Company name must be between 2 and 255 characters'),
  body('type')
    .notEmpty()
    .isIn(['internship', 'attachment', 'job', 'scholarship', 'volunteer'])
    .withMessage('Invalid opportunity type'),
  body('application_deadline')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format for application deadline'),
  body('start_date')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format for start date'),
  body('end_date')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format for end date'),
  body('salary_min')
    .optional({ checkFalsy: true })
    .isFloat({ min: 0 })
    .withMessage('Minimum salary must be a positive number'),
  body('salary_max')
    .optional({ checkFalsy: true })
    .isFloat({ min: 0 })
    .withMessage('Maximum salary must be a positive number')
    .custom((value, { req }) => {
      if (value && req.body.salary_min && value < req.body.salary_min) {
        throw new Error('Maximum salary must be greater than minimum salary');
      }
      return true;
    }),
  body('contact_email')
    .custom((value) => {
      if (!value || value.trim() === '') return true; // Allow empty
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        throw new Error('Invalid email format');
      }
      return true;
    }),
  body('contact_phone')
    .custom((value) => {
      if (!value || value.trim() === '') return true; // Allow empty
      if (!/^(\+254|0)[17]\d{8}$/.test(value)) {
        throw new Error('Invalid Kenyan phone number format');
      }
      return true;
    }),
  body('application_url')
    .custom((value) => {
      if (!value || value.trim() === '') return true; // Allow empty
      // Simple URL validation: must start with http:// or https://
      if (!/^https?:\/\//.test(value)) {
        throw new Error('Invalid URL format for application link');
      }
      return true;
    })
];

// Routes

// Public routes
router.get('/', getOpportunities); // Get all opportunities with filtering
router.get('/featured', getFeaturedOpportunities); // Get featured opportunities
router.get('/:id', getOpportunity); // Get single opportunity

// Protected routes (require authentication)
router.use(authenticateToken); // All routes below require authentication

router.get('/user/stats', requireUserOrAdmin, getOpportunityStats); // Get user opportunity stats
router.get('/user/my-opportunities', requireUserOrAdmin, getMyOpportunities); // Get user's opportunities

// Admin/Super admin routes
router.post('/', requireUserOrAdmin, opportunityValidation, createOpportunity); // Create opportunity
router.put('/:id', requireUserOrAdmin, opportunityValidation, updateOpportunity); // Update opportunity
router.delete('/:id', requireUserOrAdmin, deleteOpportunity); // Delete opportunity

module.exports = router;
