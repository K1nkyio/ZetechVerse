const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const {
  sendMessage,
  getConversation,
  getInbox,
  getUnreadCount,
  markAsRead,
  deleteMessage
} = require('../controllers/messages.controller');

const { authenticateToken } = require('../middleware/auth.middleware');
const { messageLimiter } = require('../middleware/rateLimit.middleware');

// Validation rules
const messageValidation = [
  body('receiver_id')
    .isInt()
    .withMessage('Receiver ID must be a valid number'),
  body('content')
    .trim()
    .isLength({ min: 1, max: 5000 })
    .withMessage('Message content must be between 1 and 5000 characters'),
  body('listing_id')
    .optional()
    .isInt()
    .withMessage('Listing ID must be a valid number'),
  body('subject')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Subject must not exceed 255 characters')
];

// All routes require authentication
router.use(authenticateToken);

// Get user's inbox - MUST come before :userId route
router.get(
  '/inbox',
  getInbox
);

// Get unread count - MUST come before :userId route
router.get(
  '/unread-count',
  getUnreadCount
);

// Send a message
router.post(
  '/',
  messageLimiter,
  messageValidation,
  sendMessage
);

// Get conversation with specific user for a listing
router.get(
  '/conversation/:userId/:listingId?',
  getConversation
);

// Mark message as read
router.put(
  '/:id/read',
  markAsRead
);

// Delete message
router.delete(
  '/:id',
  deleteMessage
);

module.exports = router;
