const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();

// Import controllers and middleware
const {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  createSystemNotification,
  createUserNotification
} = require('../controllers/notifications.controller');
const Notification = require('../models/Notification');

const { authenticateToken } = require('../middleware/auth.middleware');

const supportedNotificationTypes = Notification.getSupportedTypes();

// Validation rules
const createSystemNotificationValidation = [
  body('type')
    .isIn(supportedNotificationTypes)
    .withMessage('Invalid notification type'),
  body('title')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Title must be between 1 and 255 characters'),
  body('message')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Message must be between 1 and 1000 characters'),
  body('related_id')
    .optional()
    .isInt()
    .withMessage('Related ID must be an integer')
];

const createUserNotificationValidation = [
  body('user_id')
    .isInt()
    .withMessage('User ID must be an integer'),
  body('type')
    .isIn(supportedNotificationTypes)
    .withMessage('Invalid notification type'),
  body('title')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Title must be between 1 and 255 characters'),
  body('message')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Message must be between 1 and 1000 characters'),
  body('related_id')
    .optional()
    .isInt()
    .withMessage('Related ID must be an integer')
];

// All routes require authentication
router.use(authenticateToken);

// User notification routes
router.get('/', getNotifications);
router.get('/unread-count', getUnreadCount);
router.put('/:id/read', [
  param('id').isInt().withMessage('Notification ID must be an integer')
], markAsRead);
router.put('/mark-all-read', markAllAsRead);
router.delete('/:id', [
  param('id').isInt().withMessage('Notification ID must be an integer')
], deleteNotification);

// Admin/Super Admin only routes
router.post('/system', createSystemNotificationValidation, createSystemNotification);
router.post('/user', createUserNotificationValidation, createUserNotification);

module.exports = router;
