const { validationResult } = require('express-validator');
const Message = require('../models/Message');
const MarketplaceListing = require('../models/MarketplaceListing');

// Send a message
const sendMessage = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { receiver_id, listing_id, subject, content } = req.body;
    const sender_id = req.user.id;

    // Validate listing exists if provided
    if (listing_id) {
      const listing = await MarketplaceListing.findById(listing_id);
      if (!listing) {
        return res.status(404).json({
          success: false,
          message: 'Listing not found'
        });
      }
    }

    // Prevent users from messaging themselves
    if (sender_id === receiver_id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot message yourself'
      });
    }

    const messageId = await Message.create({
      sender_id,
      receiver_id,
      listing_id: listing_id || null,
      subject,
      content
    });

    const message = await Message.findById(messageId);

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: message
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get conversation between two users for a listing
const getConversation = async (req, res) => {
  try {
    const { userId, listingId } = req.params;
    const currentUserId = req.user.id;

    // Get conversation
    const messages = await Message.getConversation(
      currentUserId,
      parseInt(userId),
      listingId ? parseInt(listingId) : null
    );

    // Mark messages as read
    if (messages.length > 0) {
      await Message.markConversationAsRead(currentUserId, parseInt(userId), listingId ? parseInt(listingId) : null);
    }

    res.json({
      success: true,
      data: messages
    });
  } catch (error) {
    console.error('Error fetching conversation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch conversation',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get user's inbox
const getInbox = async (req, res) => {
  try {
    const { page = 1, limit = 20, unreadOnly = false } = req.query;
    const userId = req.user.id;

    const result = await Message.getUserInbox(userId, {
      page: parseInt(page),
      limit: parseInt(limit),
      unreadOnly: unreadOnly === 'true'
    });

    res.json({
      success: true,
      data: result.messages,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Error fetching inbox:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch inbox',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get unread count
const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;
    const count = await Message.getUnreadCount(userId);

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

// Mark message as read
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const message = await Message.findById(id);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Only receiver can mark as read
    if (message.receiver_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to mark this message as read'
      });
    }

    await Message.markAsRead(id);

    res.json({
      success: true,
      message: 'Message marked as read'
    });
  } catch (error) {
    console.error('Error marking message as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark message as read',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Delete message
const deleteMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const message = await Message.findById(id);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Only sender or receiver can delete
    if (message.sender_id !== userId && message.receiver_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this message'
      });
    }

    await Message.delete(id);

    res.json({
      success: true,
      message: 'Message deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete message',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  sendMessage,
  getConversation,
  getInbox,
  getUnreadCount,
  markAsRead,
  deleteMessage
};
