const { validationResult } = require('express-validator');
const Event = require('../models/Event');
const { run, get, all } = require('../config/db');
const { recordUniqueView } = require('../utils/engagementTracking');
const {
  ensureCommunityFeatureSchema,
  refreshEventAttendeeCount
} = require('../utils/communityExtensions');

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

const getEmptyEventSocialBundle = () => ({
  attendee_preview: [],
  attendee_count: 0,
  my_rsvp: null,
  photo_drops: [],
  suggested_connections: []
});

const buildEventSocialBundle = async (eventId, currentUserId) => {
  try {
    await ensureCommunityFeatureSchema();

    const attendeePreview = await all(
      `
        SELECT
          er.user_id,
          er.group_name,
          er.guest_count,
          er.status,
          er.reminder_opt_in,
          er.reminder_minutes,
          u.username,
          u.full_name,
          u.course,
          u.year_of_study,
          u.avatar_url
        FROM event_registrations er
        INNER JOIN users u ON u.id = er.user_id
        WHERE er.event_id = ?
          AND er.status IN ('registered', 'attended')
        ORDER BY er.checked_in DESC, er.registered_at ASC
        LIMIT 10
      `,
      [eventId]
    );

    const photoDrops = await all(
      `
        SELECT
          epd.*,
          u.username AS uploader_username,
          u.full_name AS uploader_full_name
        FROM event_photo_drops epd
        LEFT JOIN users u ON u.id = epd.uploader_id
        WHERE epd.event_id = ?
        ORDER BY epd.created_at DESC
        LIMIT 12
      `,
      [eventId]
    );

    let myRsvp = null;
    let suggestedConnections = [];

    if (currentUserId) {
      myRsvp = await get(
        `
          SELECT *
          FROM event_registrations
          WHERE event_id = ? AND user_id = ?
        `,
        [eventId, currentUserId]
      );

      const me = await get(
        'SELECT course, year_of_study FROM users WHERE id = ?',
        [currentUserId]
      );

      if (me?.course || me?.year_of_study) {
        suggestedConnections = await all(
          `
            SELECT
              u.id,
              u.username,
              u.full_name,
              u.course,
              u.year_of_study,
              u.avatar_url,
              CASE
                WHEN ? IS NOT NULL AND u.course = ? THEN 'Same course'
                WHEN ? IS NOT NULL AND u.year_of_study = ? THEN 'Same year of study'
                ELSE 'Also attending'
              END AS connection_reason
            FROM event_registrations er
            INNER JOIN users u ON u.id = er.user_id
            WHERE er.event_id = ?
              AND er.user_id <> ?
              AND er.status IN ('registered', 'attended')
              AND (
                (? IS NOT NULL AND u.course = ?)
                OR (? IS NOT NULL AND u.year_of_study = ?)
              )
            ORDER BY u.full_name ASC NULLS LAST, u.username ASC
            LIMIT 5
          `,
          [
            me.course || null,
            me.course || null,
            me.year_of_study || null,
            me.year_of_study || null,
            eventId,
            currentUserId,
            me.course || null,
            me.course || null,
            me.year_of_study || null,
            me.year_of_study || null
          ]
        );
      }
    }

    return {
      attendee_preview: attendeePreview,
      attendee_count: attendeePreview.reduce((sum, attendee) => sum + Math.max(1, Number(attendee.guest_count || 1)), 0),
      my_rsvp: myRsvp,
      photo_drops: photoDrops,
      suggested_connections: suggestedConnections
    };
  } catch (error) {
    console.error(`Event social bundle unavailable for event ${eventId}:`, error);
    return getEmptyEventSocialBundle();
  }
};

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

    const countedView = await recordUniqueView({
      req,
      contentType: 'event',
      contentId: id,
      incrementView: () => Event.incrementViews(id)
    });
    if (countedView) {
      event.views_count = Number(event.views_count || 0) + 1;
    }

    let likedByMe = false;
    if (req.user?.id) {
      const row = await get('SELECT id FROM event_likes WHERE event_id = ? AND user_id = ?', [id, req.user.id]);
      likedByMe = !!row;
    }

    const socialBundle = await buildEventSocialBundle(id, req.user?.id);

    res.json({
      success: true,
      data: {
        ...event,
        likedByMe,
        ...socialBundle
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

const upsertEventRsvp = async (req, res) => {
  try {
    await ensureCommunityFeatureSchema();

    const eventId = Number(req.params.id);
    const event = await Event.findById(eventId);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    const guestCount = Math.max(1, Number(req.body.guest_count || 1));
    const existing = await get(
      'SELECT * FROM event_registrations WHERE event_id = ? AND user_id = ?',
      [eventId, req.user.id]
    );

    const existingGuestCount = Number(existing?.guest_count || 0);
    const availableCapacity = event.max_attendees
      ? Number(event.max_attendees) - Number(event.current_attendees || 0) + existingGuestCount
      : null;

    if (availableCapacity !== null && guestCount > availableCapacity) {
      return res.status(400).json({
        success: false,
        message: 'This RSVP exceeds the remaining event capacity'
      });
    }

    if (existing) {
      await run(
        `
          UPDATE event_registrations
          SET status = 'registered',
              group_name = ?,
              guest_count = ?,
              reminder_opt_in = ?,
              reminder_minutes = ?,
              networking_note = ?
          WHERE id = ?
        `,
        [
          req.body.group_name ? String(req.body.group_name).trim() : null,
          guestCount,
          Boolean(req.body.reminder_opt_in),
          Number(req.body.reminder_minutes || 60),
          req.body.networking_note ? String(req.body.networking_note).trim() : null,
          existing.id
        ]
      );
    } else {
      const ticketNumber = `EVT-${eventId}-${req.user.id}-${Date.now()}`;
      await run(
        `
          INSERT INTO event_registrations (
            event_id, user_id, status, ticket_number, payment_status, group_name, guest_count,
            reminder_opt_in, reminder_minutes, networking_note
          ) VALUES (?, ?, 'registered', ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          eventId,
          req.user.id,
          ticketNumber,
          event.is_paid ? 'pending' : 'paid',
          req.body.group_name ? String(req.body.group_name).trim() : null,
          guestCount,
          Boolean(req.body.reminder_opt_in),
          Number(req.body.reminder_minutes || 60),
          req.body.networking_note ? String(req.body.networking_note).trim() : null
        ]
      );
    }

    const attendeeCount = await refreshEventAttendeeCount(eventId);
    const rsvp = await get(
      'SELECT * FROM event_registrations WHERE event_id = ? AND user_id = ?',
      [eventId, req.user.id]
    );

    res.json({
      success: true,
      message: 'RSVP saved successfully',
      data: {
        ...rsvp,
        attendee_count: attendeeCount
      }
    });
  } catch (error) {
    console.error('Error saving event RSVP:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save RSVP',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const checkInToEvent = async (req, res) => {
  try {
    await ensureCommunityFeatureSchema();

    const eventId = Number(req.params.id);
    const event = await Event.findById(eventId);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    const registration = await get(
      'SELECT * FROM event_registrations WHERE event_id = ? AND user_id = ?',
      [eventId, req.user.id]
    );

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'You need an RSVP before checking in'
      });
    }

    const now = new Date();
    const startDate = new Date(event.start_date);
    const endDate = new Date(event.end_date);
    const earlyWindow = new Date(startDate.getTime() - 12 * 60 * 60 * 1000);
    const lateWindow = new Date(endDate.getTime() + 12 * 60 * 60 * 1000);

    if (now < earlyWindow || now > lateWindow) {
      return res.status(400).json({
        success: false,
        message: 'Check-in is only available near the event time'
      });
    }

    await run(
      `
        UPDATE event_registrations
        SET status = 'attended', checked_in = true, attended_at = ?
        WHERE id = ?
      `,
      [now.toISOString(), registration.id]
    );

    res.json({
      success: true,
      message: 'Checked in successfully'
    });
  } catch (error) {
    console.error('Error checking in to event:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check in',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const uploadEventPhoto = async (req, res) => {
  try {
    await ensureCommunityFeatureSchema();

    const eventId = Number(req.params.id);
    const event = await Event.findById(eventId);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    const registration = await get(
      'SELECT id FROM event_registrations WHERE event_id = ? AND user_id = ?',
      [eventId, req.user.id]
    );
    const canUpload =
      Boolean(registration) ||
      String(event.organizer_id) === String(req.user.id) ||
      ['admin', 'super_admin'].includes(req.user.role);

    if (!canUpload) {
      return res.status(403).json({
        success: false,
        message: 'Only attendees, organizers, or admins can upload event photos'
      });
    }

    await run(
      `
        INSERT INTO event_photo_drops (event_id, uploader_id, media_url, caption)
        VALUES (?, ?, ?, ?)
      `,
      [
        eventId,
        req.user.id,
        String(req.body.media_url).trim(),
        req.body.caption ? String(req.body.caption).trim() : null
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Photo added to event drop successfully'
    });
  } catch (error) {
    console.error('Error uploading event photo:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload event photo',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const getEventSocial = async (req, res) => {
  try {
    const eventId = Number(req.params.id);
    const bundle = await buildEventSocialBundle(eventId, req.user?.id);
    res.json({
      success: true,
      data: bundle
    });
  } catch (error) {
    console.error('Error fetching event social data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch event social data',
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
  toggleEventLike,
  upsertEventRsvp,
  checkInToEvent,
  uploadEventPhoto,
  getEventSocial
};
