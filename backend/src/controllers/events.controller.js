const { validationResult } = require('express-validator');
const Event = require('../models/Event');
const { run, get, all } = require('../config/db');

const attachLikedByMe = async (events, userId) => {
  if (!userId || !Array.isArray(events) || events.length === 0) return events;
  const ids = events.map((event) => event.id);
  const placeholders = ids.map(() => '?').join(',');
  const rows = await all(
    `SELECT event_id FROM event_likes WHERE user_id = ? AND event_id IN (${placeholders})`,
    [userId, ...ids]
  );
  const likedSet = new Set(rows.map((row) => String(row.event_id)));
  return events.map((event) => ({
    ...event,
    likedByMe: likedSet.has(String(event.id))
  }));
};
const Notification = require('../models/Notification');

// Get all events with filtering and pagination
const getEvents = async (req, res) => {
  try {
    const options = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 10,
      type: req.query.type,
      category_id: req.query.category_id,
      status: req.query.status || 'published',
      search: req.query.search,
      start_date_from: req.query.start_date_from,
      start_date_to: req.query.start_date_to,
      sort_by: req.query.sort_by,
      sort_order: req.query.sort_order
    };

    const result = await Event.findAll(options);
    const eventsWithLikes = await attachLikedByMe(result.events, req.user?.id);

    res.json({
      success: true,
      data: eventsWithLikes,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch events',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get single event by ID
const getEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const event = await Event.findById(id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Increment view count for authenticated users
    if (req.user) {
      await Event.incrementViews(id);
      event.views_count += 1;
    }

    let likedByMe = false;
    if (req.user?.id) {
      const row = await get('SELECT id FROM event_likes WHERE event_id = ? AND user_id = ?', [id, req.user.id]);
      likedByMe = !!row;
    }

    res.json({
      success: true,
      data: {
        ...event,
        likedByMe
      }
    });
  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch event',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Create new event
const createEvent = async (req, res) => {
  try {
    console.log('📨 CREATE EVENT REQUEST RECEIVED');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('User:', req.user?.id);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorArray = errors.array();
      console.error('🔴 Event validation errors (full array):', JSON.stringify(errorArray, null, 2));
      errorArray.forEach((err, index) => {
        console.error(`Error ${index} object keys:`, Object.keys(err));
        console.error(`Error ${index} properties:`, { 
          param: err.param, 
          path: err.path, 
          field: err.field, 
          location: err.location, 
          msg: err.msg, 
          message: err.message, 
          value: err.value 
        });
      });
      
      // Map validation errors to response
      const mappedErrors = errorArray.map(err => {
        const fieldName = err.param || err.path || err.field || 'unknown';
        console.error(`✅ Mapped field name: "${fieldName}" from error:`, err);
        return {
          field: fieldName,
          message: err.msg || err.message || 'Validation failed',
          value: err.value
        };
      });
      
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: mappedErrors
      });
    }

    const defaultStatus =
      req.user?.role === 'admin' || req.user?.role === 'super_admin'
        ? 'published'
        : 'draft';

    const eventData = {
      ...req.body,
      organizer_id: req.user.id,
      status: req.body.status || defaultStatus
    };

    const eventId = await Event.create(eventData);

    // Trigger notification if event is published
    if (eventData.status === 'published') {
      try {
        await Notification.createSystemNotification(
          'events',
          'New Event Published',
          `A new event titled "${eventData.title}" has been published. Check it out now!`,
          eventId
        );
      } catch (notificationError) {
        console.error('Failed to create notification for new event:', notificationError);
      }
    }

    res.status(201).json({
      success: true,
      message: 'Event created successfully',
      data: { id: eventId }
    });
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create event',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Update event
const updateEvent = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const event = await Event.findById(id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Check if user owns the event or is admin
    if (event.organizer_id !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update this event'
      });
    }

    await Event.update(id, req.body);

    res.json({
      success: true,
      message: 'Event updated successfully'
    });
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update event',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Delete event
const deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const event = await Event.findById(id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Check if user owns the event or is admin
    if (event.organizer_id !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this event'
      });
    }

    await Event.delete(id);

    res.json({
      success: true,
      message: 'Event deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete event',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get user's events
const getMyEvents = async (req, res) => {
  try {
    const options = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 10,
      status: req.query.status,
      organizer_id: req.user.id
    };

    const result = await Event.findByUser(req.user.id, options);

    res.json({
      success: true,
      data: result.events,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Error fetching user events:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch your events',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get event statistics
const getEventStats = async (req, res) => {
  try {
    const { get } = require('../config/db');

    const totalEvents = await get("SELECT COUNT(*) as count FROM events");
    const upcomingEvents = await get("SELECT COUNT(*) as count FROM events WHERE start_date > CURRENT_TIMESTAMP AND status = 'published'");
    const totalAttendees = await get("SELECT SUM(current_attendees) as count FROM events");
    const publishedEvents = await get("SELECT COUNT(*) as count FROM events WHERE status = 'published'");

    res.json({
      success: true,
      data: {
        total_events: totalEvents.count || 0,
        upcoming_events: upcomingEvents.count || 0,
        total_attendees: totalAttendees.count || 0,
        published_events: publishedEvents.count || 0
      }
    });
  } catch (error) {
    console.error('Error fetching event stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch event statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get featured events
const getFeaturedEvents = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 6;
    const events = await Event.getFeatured(limit);
    const eventsWithLikes = await attachLikedByMe(events, req.user?.id);

    res.json({
      success: true,
      data: eventsWithLikes
    });
  } catch (error) {
    console.error('Error fetching featured events:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch featured events',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get upcoming events
const getUpcomingEvents = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const events = await Event.getUpcoming(limit);
    const eventsWithLikes = await attachLikedByMe(events, req.user?.id);

    res.json({
      success: true,
      data: eventsWithLikes
    });
  } catch (error) {
    console.error('Error fetching upcoming events:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch upcoming events',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Like/unlike an event
const toggleEventLike = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const event = await get('SELECT id FROM events WHERE id = ?', [id]);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    const existingLike = await get('SELECT id FROM event_likes WHERE event_id = ? AND user_id = ?', [id, userId]);
    let liked = false;

    if (existingLike) {
      await run('DELETE FROM event_likes WHERE event_id = ? AND user_id = ?', [id, userId]);
    } else {
      await run('INSERT INTO event_likes (event_id, user_id) VALUES (?, ?)', [id, userId]);
      liked = true;
    }

    const updated = await get(
      'SELECT COUNT(*)::INTEGER as likes_count FROM event_likes WHERE event_id = ?',
      [id]
    );
    const likesCount = Number(updated?.likes_count || 0);
    await run('UPDATE events SET likes_count = ? WHERE id = ?', [likesCount, id]);

    res.json({
      success: true,
      message: liked ? 'Event liked successfully' : 'Event unliked successfully',
      liked,
      likes_count: likesCount,
      data: {
        liked,
        likes_count: likesCount
      }
    });
  } catch (error) {
    console.error('Error liking event:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to like event',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getEvents,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent,
  getMyEvents,
  getEventStats,
  getFeaturedEvents,
  getUpcomingEvents,
  toggleEventLike
};
