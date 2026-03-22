const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

// Import controllers and middleware
const {
  getEvents,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent,
  getMyEvents,
  getEventStats,
  getFeaturedEvents,
  getUpcomingEvents,
  toggleEventLike,
  upsertEventRsvp,
  checkInToEvent,
  uploadEventPhoto,
  getEventSocial
} = require('../controllers/events.controller');

const { authenticateToken, optionalAuth } = require('../middleware/auth.middleware');
const { requireUserOrAdmin } = require('../middleware/role.middleware');

// Validation rules
const eventValidation = [
  body('title')
    .trim()
    .isLength({ min: 5, max: 255 })
    .withMessage('Title must be between 5 and 255 characters'),
  body('description')
    .trim()
    .isLength({ min: 20, max: 5000 })
    .withMessage('Description must be between 20 and 5000 characters'),
  body('start_date')
    .isISO8601()
    .withMessage('Invalid date format for start date'),
  body('end_date')
    .isISO8601()
    .withMessage('Invalid date format for end date'),
  body('type')
    .notEmpty()
    .isIn(['hackathon', 'workshop', 'competition', 'social', 'seminar', 'cultural'])
    .withMessage('Invalid event type'),
  body('status')
    .optional()
    .isIn(['draft', 'published', 'cancelled', 'completed'])
    .withMessage('Invalid status'),
  body('max_attendees')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Max attendees must be a positive integer'),
  body('registration_deadline')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format for registration deadline'),
  body('ticket_price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Ticket price must be a positive number'),
  body('is_paid')
    .optional()
    .isBoolean()
    .withMessage('is_paid must be a boolean'),
  body('registration_required')
    .optional()
    .isBoolean()
    .withMessage('registration_required must be a boolean'),
  body('location')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Location must be less than 255 characters'),
  body('venue_details')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Venue details must be less than 1000 characters'),
  body('contact_email')
    .custom((value) => {
      if (!value || value.trim() === '') return true; // Allow empty
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        throw new Error('Invalid email format');
      }
      return true;
    }),
  body('contact_phone')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Contact phone must be less than 20 characters'),
  body('website_url')
    .custom((value) => {
      if (!value || value.trim() === '') return true; // Allow empty
      // Simple URL validation: must start with http:// or https://
      if (!/^https?:\/\//.test(value)) {
        throw new Error('Invalid URL format');
      }
      return true;
    }),
  body('image_url')
    .custom((value) => {
      if (!value || value.trim() === '') return true; // Allow empty
      if (!/^https?:\/\//.test(value) && !/^\/uploads\//.test(value)) {
        throw new Error('Invalid image URL format');
      }
      return true;
    }),
  body('video_url')
    .custom((value) => {
      if (!value || value.trim() === '') return true; // Allow empty
      if (!/^https?:\/\//.test(value) && !/^\/uploads\//.test(value)) {
        throw new Error('Invalid video URL format');
      }
      return true;
    }),
];

// Public routes
router.get('/', optionalAuth, getEvents); // Get all events
router.get('/featured', optionalAuth, getFeaturedEvents); // Get featured events
router.get('/upcoming', optionalAuth, getUpcomingEvents); // Get upcoming events
router.get('/:id/social', optionalAuth, getEventSocial); // Get event social data

// Authenticated routes
router.get('/user/my-events', authenticateToken, getMyEvents); // Get user's events
router.get('/user/stats', authenticateToken, getEventStats); // Get event stats
router.post('/:id/like', authenticateToken, toggleEventLike); // Like/unlike event
router.post('/:id/rsvp', authenticateToken, [
  body('group_name').optional().trim().isLength({ max: 120 }).withMessage('group_name must be under 120 characters'),
  body('guest_count').optional().isInt({ min: 1, max: 10 }).withMessage('guest_count must be between 1 and 10'),
  body('reminder_opt_in').optional().isBoolean().withMessage('reminder_opt_in must be a boolean'),
  body('reminder_minutes').optional().isInt({ min: 15, max: 10080 }).withMessage('reminder_minutes must be between 15 and 10080'),
  body('networking_note').optional().trim().isLength({ max: 300 }).withMessage('networking_note must be under 300 characters')
], upsertEventRsvp);
router.post('/:id/check-in', authenticateToken, checkInToEvent);
router.post('/:id/photos', authenticateToken, [
  body('media_url').trim().isLength({ min: 5, max: 500 }).withMessage('media_url is required'),
  body('caption').optional().trim().isLength({ max: 500 }).withMessage('caption must be under 500 characters')
], uploadEventPhoto);

// Admin routes
router.post('/', authenticateToken, requireUserOrAdmin, eventValidation, createEvent); // Create event
router.put('/:id', authenticateToken, requireUserOrAdmin, eventValidation, updateEvent); // Update event
router.delete('/:id', authenticateToken, requireUserOrAdmin, deleteEvent); // Delete event
router.get('/:id', optionalAuth, getEvent); // Get single event

module.exports = router;
