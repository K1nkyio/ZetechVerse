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
    .optional({ nullable: true, checkFalsy: true })
    .isISO8601()
    .withMessage('Invalid date format for application deadline'),
  body('application_deadline')
    .optional({ nullable: true, checkFalsy: true })
    .custom((value) => {
      if (!value) return true;
      const deadline = new Date(value);
      const now = new Date();
      if (isNaN(deadline.getTime())) throw new Error('Invalid date for application deadline');
      // Must not be in the past
      if (deadline < now) {
        throw new Error('Application deadline cannot be in the past');
      }
      // Must be at least 24 hours from now
      const diffMs = deadline - now;
      if (diffMs < 24 * 60 * 60 * 1000) {
        throw new Error('Application deadline must be at least one day in the future');
      }
      return true;
    }),
  body('start_date')
    .optional({ nullable: true, checkFalsy: true })
    .isISO8601()
    .withMessage('Invalid date format for start date'),
  body('start_date')
    .optional({ nullable: true, checkFalsy: true })
    .custom((value, { req }) => {
      if (!value) return true;
      const start = new Date(value);
      if (isNaN(start.getTime())) throw new Error('Invalid start date');
      const deadlineVal = req.body.application_deadline;
      if (deadlineVal) {
        const deadline = new Date(deadlineVal);
        if (!isNaN(deadline.getTime()) && start <= deadline) {
          throw new Error('Start date must be after the application deadline');
        }
      }
      return true;
    }),
  body('end_date')
    .optional({ nullable: true, checkFalsy: true })
    .isISO8601()
    .withMessage('Invalid date format for end date'),
  body('end_date')
    .optional({ nullable: true, checkFalsy: true })
    .custom((value, { req }) => {
      if (!value) return true;
      const end = new Date(value);
      if (isNaN(end.getTime())) throw new Error('Invalid end date');
      const startVal = req.body.start_date;
      if (startVal) {
        const start = new Date(startVal);
        if (!isNaN(start.getTime())) {
          // End must be after start
          if (end <= start) {
            throw new Error('End date must be after the start date');
          }
          // Duration must not exceed two years
          const twoYearsMs = 2 * 365 * 24 * 60 * 60 * 1000; // approximate two years
          if (end - start > twoYearsMs) {
            throw new Error('Opportunity duration exceeds the allowed two year limit');
          }
        }
      }
      return true;
    }),
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
    }),
  body('responsibilities')
    .optional({ nullable: true })
    .isArray()
    .withMessage('Responsibilities must be an array')
];

// Routes

// Public routes
router.get('/', getOpportunities); // Get all opportunities with filtering
router.get('/featured', getFeaturedOpportunities); // Get featured opportunities

// Protected routes
router.get('/user/stats', authenticateToken, requireUserOrAdmin, getOpportunityStats); // Get user opportunity stats
router.get('/user/my-opportunities', authenticateToken, requireUserOrAdmin, getMyOpportunities); // Get user's opportunities

// Public detail route
router.get('/:id', getOpportunity); // Get single opportunity

// Admin/Super admin routes
router.post('/', authenticateToken, requireUserOrAdmin, opportunityValidation, createOpportunity); // Create opportunity
router.put('/:id', authenticateToken, requireUserOrAdmin, opportunityValidation, updateOpportunity); // Update opportunity
router.delete('/:id', authenticateToken, requireUserOrAdmin, deleteOpportunity); // Delete opportunity

module.exports = router;
