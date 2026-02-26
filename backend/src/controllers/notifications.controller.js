const { validationResult } = require('express-validator');
const Notification = require('../models/Notification');

// Get notifications for the current user
const getNotifications = async (req, res) => {
  try {
    const normalizedReadFilter = req.query.filter === 'read'
      ? true
      : req.query.filter === 'unread'
        ? false
        : req.query.is_read === 'true'
          ? true
          : req.query.is_read === 'false'
            ? false
            : null;

    const options = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
      is_read: normalizedReadFilter,
      type: req.query.type || null
    };

    const result = await Notification.findByUser(req.user.id, options);

    res.json({
      success: true,
      data: result.notifications,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get unread notification count
const getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.getUnreadCount(req.user.id);

    res.json({
      success: true,
      data: { unread_count: count }
    });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch unread count',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Mark notification as read
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    await Notification.markAsRead(id, req.user.id);

    res.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Mark all notifications as read
const markAllAsRead = async (req, res) => {
  try {
    await Notification.markAllAsRead(req.user.id);

    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark all notifications as read',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Delete notification
const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;

    await Notification.delete(id, req.user.id);

    res.json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete notification',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Create system notification (admin/super admin only)
const createSystemNotification = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { type, title, message, related_id } = req.body;

    // Check if user is admin or super admin
    if (!['admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only administrators can create system notifications'
      });
    }

    const notificationIds = await Notification.createSystemNotification(
      type,
      title,
      message,
      related_id
    );

    res.status(201).json({
      success: true,
      message: 'System notification created successfully',
      data: { notification_ids: notificationIds, count: notificationIds.length }
    });
  } catch (error) {
    console.error('Error creating system notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create system notification',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Create notification for specific user (admin/super admin only)
const createUserNotification = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { user_id, type, title, message, related_id } = req.body;

    // Check if user is admin or super admin
    if (!['admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only administrators can create user notifications'
      });
    }

    const notificationId = await Notification.notifyUser(
      user_id,
      type,
      title,
      message,
      related_id
    );

    res.status(201).json({
      success: true,
      message: 'User notification created successfully',
      data: { notification_id: notificationId }
    });
  } catch (error) {
    console.error('Error creating user notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create user notification',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  createSystemNotification,
  createUserNotification
};
