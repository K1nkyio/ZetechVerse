const { validationResult } = require('express-validator');
const MarketplaceListing = require('../models/MarketplaceListing');
const Notification = require('../models/Notification');
const { run, get, all } = require('../config/db');
const { recordUniqueView } = require('../utils/engagementTracking');
const {
  ensureCommunityFeatureSchema,
  getMarketplaceSafetyGuidance,
  getSellerTrustProfile
} = require('../utils/communityExtensions');

const attachLikedByMe = async (listings, userId) => {
  if (!userId || !Array.isArray(listings) || listings.length === 0) return listings;
  const ids = listings.map((listing) => listing.id);
  const placeholders = ids.map(() => '?').join(',');
  const rows = await all(
    `SELECT listing_id FROM marketplace_listing_likes WHERE user_id = ? AND listing_id IN (${placeholders})`,
    [userId, ...ids]
  );
  const likedSet = new Set(rows.map((row) => String(row.listing_id)));
  return listings.map((listing) => ({
    ...listing,
    likedByMe: likedSet.has(String(listing.id))
  }));
};

const enrichListingTrust = async (listing, currentUserId) => {
  if (!listing) return listing;

  await ensureCommunityFeatureSchema();

  const sellerProfile = await getSellerTrustProfile(listing.seller_id);
  const recentReviews = await all(
    `
      SELECT
        r.id,
        r.rating,
        r.review_text,
        r.created_at,
        reviewer.username AS reviewer_username,
        reviewer.full_name AS reviewer_full_name
      FROM marketplace_seller_reviews r
      INNER JOIN users reviewer ON reviewer.id = r.reviewer_id
      WHERE r.listing_id = ?
      ORDER BY r.created_at DESC
      LIMIT 4
    `,
    [listing.id]
  );

  const reportSummary = await get(
    `
      SELECT COUNT(*)::INTEGER AS open_reports
      FROM marketplace_reports
      WHERE listing_id = ? AND status <> 'resolved'
    `,
    [listing.id]
  );

  const reservationActive = Boolean(
    listing.reserved_by &&
    listing.reserved_until &&
    new Date(listing.reserved_until) > new Date() &&
    listing.status === 'active'
  );

  let transactionHistory = [];
  if (currentUserId && [String(listing.seller_id), String(listing.reserved_by || '')].includes(String(currentUserId))) {
    transactionHistory = await all(
      `
        SELECT
          t.*,
          buyer.username AS buyer_username,
          buyer.full_name AS buyer_full_name
        FROM marketplace_transactions t
        LEFT JOIN users buyer ON buyer.id = t.buyer_id
        WHERE t.listing_id = ?
        ORDER BY t.created_at DESC
        LIMIT 8
      `,
      [listing.id]
    );
  }

  return {
    ...listing,
    seller_profile: sellerProfile,
    seller_reviews: recentReviews,
    safety_guidance: getMarketplaceSafetyGuidance(listing),
    reservation: {
      is_reserved: reservationActive,
      reserved_by: reservationActive ? listing.reserved_by : null,
      reserved_at: reservationActive ? listing.reserved_at : null,
      reserved_until: reservationActive ? listing.reserved_until : null,
      reservation_message: reservationActive ? listing.reservation_message : null
    },
    report_summary: {
      open_reports: Number(reportSummary?.open_reports || 0)
    },
    transaction_history: transactionHistory
  };
};

// Get active marketplace categories
const getMarketplaceCategories = async (req, res) => {
  try {
    const categories = await all(`
      SELECT id, name, slug
      FROM categories
      WHERE type = 'marketplace' AND is_active = true
      ORDER BY sort_order ASC, name ASC
    `);

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Error fetching marketplace categories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch marketplace categories',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get all marketplace listings with filtering and pagination
const getListings = async (req, res) => {
  try {
    const options = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 10,
      category_id: req.query.category_id,
      listing_kind: req.query.listing_kind,
      location: req.query.location,
      condition: req.query.condition,
      status: req.query.status || 'active',
      search: req.query.search,
      sort_by: req.query.sort_by,
      sort_order: req.query.sort_order,
      price_min: req.query.price_min,
      price_max: req.query.price_max,
    };

    const result = await MarketplaceListing.findAll(options);
    const listingsWithLikes = await attachLikedByMe(result.listings, req.user?.id);

    res.json({
      success: true,
      data: listingsWithLikes,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Error fetching marketplace listings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch marketplace listings',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get single marketplace listing by ID
const getListing = async (req, res) => {
  try {
    const { id } = req.params;
    const listing = await MarketplaceListing.findById(id);

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: 'Marketplace listing not found'
      });
    }

    const countedView = await recordUniqueView({
      req,
      contentType: 'marketplace_listing',
      contentId: id,
      incrementView: () => MarketplaceListing.incrementViews(id)
    });
    if (countedView) {
      listing.views_count = Number(listing.views_count || 0) + 1;
    }

    let likedByMe = false;
    if (req.user?.id) {
      const row = await get(
        'SELECT id FROM marketplace_listing_likes WHERE listing_id = ? AND user_id = ?',
        [id, req.user.id]
      );
      likedByMe = !!row;
    }

    const enrichedListing = await enrichListingTrust(
      {
        ...listing,
        likedByMe
      },
      req.user?.id
    );

    res.json({
      success: true,
      data: enrichedListing
    });
  } catch (error) {
    console.error('Error fetching marketplace listing:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch marketplace listing',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Create new marketplace listing
const createListing = async (req, res) => {
  try {
    console.log('📨 CREATE MARKETPLACE LISTING REQUEST RECEIVED');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('User:', req.user?.id);
    console.log('📋 Received service_details:', JSON.stringify(req.body.service_details, null, 2));
    console.log('📋 Received hostel_details:', JSON.stringify(req.body.hostel_details, null, 2));
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorArray = errors.array();
      console.error('🔴 Marketplace validation errors:', JSON.stringify(errorArray, null, 2));
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

    // Extract only the safe fields from the request body, excluding any potentially malicious seller_id
    const { seller_id, ...safeBody } = req.body;
    
    const listingData = {
      ...safeBody,
      listing_kind: safeBody.listing_kind || 'product',
      seller_id: req.user.id,
      status: req.body.status || 'active',
      image_urls: req.body.image_urls || [],
      tags: req.body.tags || [],
      service_details: req.body.service_details && typeof req.body.service_details === 'object'
        ? req.body.service_details
        : {},
      hostel_details: req.body.hostel_details && typeof req.body.hostel_details === 'object'
        ? req.body.hostel_details
        : {}
    };

    console.log('🔄 Cleaned listing data for creation:', JSON.stringify(listingData, null, 2));

    if (listingData.listing_kind !== 'product' && !('condition' in safeBody)) {
      listingData.condition = null;
    }

    const listingId = await MarketplaceListing.create(listingData);
    console.log('✅ Listing created with ID:', listingId);

    // Verify the created listing by fetching it back
    const createdListing = await MarketplaceListing.findById(listingId);
    console.log('✅ Created listing verification:', JSON.stringify(createdListing, null, 2));

    // Trigger notification for new marketplace listing
    try {
      await Notification.createSystemNotification(
        'marketplace',
        'New Marketplace Item',
        `A new item titled "${listingData.title}" has been listed in the marketplace. Check it out now!`,
        listingId
      );
    } catch (notificationError) {
      console.error('Failed to create notification for new marketplace listing:', notificationError);
    }

    res.status(201).json({
      success: true,
      message: 'Marketplace listing created successfully',
      data: { id: listingId }
    });
  } catch (error) {
    console.error('Error creating marketplace listing:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: error.code
    });

    const msg = (error && error.message) || '';
    if (msg.includes('FOREIGN KEY') || msg.includes('constraint') || msg.includes('NOT NULL')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid data. Please ensure required fields are provided and references exist.',
        errors: [{ field: 'general', message: msg }]
      });
    }

    // Provide more specific error messages for known issues
    if (msg.includes('SQLITE_ERROR')) {
      return res.status(500).json({
        success: false,
        message: 'Database error occurred while creating listing. Please check that all required fields are filled correctly.'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create marketplace listing',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Update marketplace listing
const updateListing = async (req, res) => {
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
    const listing = await MarketplaceListing.findById(id);

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: 'Marketplace listing not found'
      });
    }

    // Check if user owns the listing or is admin
    if (listing.seller_id !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update this listing'
      });
    }

    // Prevent users from changing the seller_id
    const { seller_id, ...updateData } = req.body;
    const normalizedUpdateData = { ...updateData };

    if (
      normalizedUpdateData.listing_kind &&
      normalizedUpdateData.listing_kind !== 'product' &&
      normalizedUpdateData.condition === undefined
    ) {
      normalizedUpdateData.condition = null;
    }

    if (
      normalizedUpdateData.service_details !== undefined &&
      normalizedUpdateData.service_details !== null &&
      typeof normalizedUpdateData.service_details !== 'object'
    ) {
      normalizedUpdateData.service_details = {};
    }

    if (
      normalizedUpdateData.hostel_details !== undefined &&
      normalizedUpdateData.hostel_details !== null &&
      typeof normalizedUpdateData.hostel_details !== 'object'
    ) {
      normalizedUpdateData.hostel_details = {};
    }

    await MarketplaceListing.update(id, normalizedUpdateData);

    res.json({
      success: true,
      message: 'Marketplace listing updated successfully'
    });
  } catch (error) {
    console.error('Error updating marketplace listing:', error);

    // Map common DB constraint errors to 400 with readable messages
    const msg = (error && error.message) || '';
    if (msg.includes('FOREIGN KEY') || msg.includes('constraint') || msg.includes('NOT NULL')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid data. Please check fields like category_id and required fields.',
        errors: [{ field: 'general', message: msg }]
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update marketplace listing',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Delete marketplace listing
const deleteListing = async (req, res) => {
  try {
    const { id } = req.params;
    const listing = await MarketplaceListing.findById(id);

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: 'Marketplace listing not found'
      });
    }

    // Check if user owns the listing or is admin
    if (listing.seller_id !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this listing'
      });
    }

    await MarketplaceListing.delete(id);

    res.json({
      success: true,
      message: 'Marketplace listing deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting marketplace listing:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete marketplace listing',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get user's marketplace listings
const getMyListings = async (req, res) => {
  try {
    const options = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 10,
      status: req.query.status,
      seller_id: req.user.id
    };

    const result = await MarketplaceListing.findByUser(req.user.id, options);

    res.json({
      success: true,
      data: result.listings,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Error fetching user marketplace listings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch your marketplace listings',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get marketplace statistics
const getMarketplaceStats = async (req, res) => {
  try {
    const { get } = require('../config/db');

    const totalActive = await get("SELECT COUNT(*) as count FROM marketplace_listings WHERE status = 'active'");
    const totalSold = await get("SELECT COUNT(*) as count FROM marketplace_listings WHERE status = 'sold'");
    const totalViews = await get("SELECT SUM(views_count) as count FROM marketplace_listings");

    res.json({
      success: true,
      data: {
        total_active: totalActive.count || 0,
        total_sold: totalSold.count || 0,
        total_views: totalViews.count || 0
      }
    });
  } catch (error) {
    console.error('Error fetching marketplace stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch marketplace statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Like/unlike a marketplace listing
const toggleListingLike = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const listing = await get('SELECT id FROM marketplace_listings WHERE id = ?', [id]);
    if (!listing) {
      return res.status(404).json({
        success: false,
        message: 'Marketplace listing not found'
      });
    }

    const existingLike = await get(
      'SELECT id FROM marketplace_listing_likes WHERE listing_id = ? AND user_id = ?',
      [id, userId]
    );
    let liked = false;

    if (existingLike) {
      await run('DELETE FROM marketplace_listing_likes WHERE listing_id = ? AND user_id = ?', [id, userId]);
    } else {
      await run('INSERT INTO marketplace_listing_likes (listing_id, user_id) VALUES (?, ?)', [id, userId]);
      liked = true;
    }

    const updated = await get(
      'SELECT COUNT(*)::INTEGER as likes_count FROM marketplace_listing_likes WHERE listing_id = ?',
      [id]
    );
    const likesCount = Number(updated?.likes_count || 0);
    await run('UPDATE marketplace_listings SET likes_count = ? WHERE id = ?', [likesCount, id]);

    res.json({
      success: true,
      message: liked ? 'Listing liked successfully' : 'Listing unliked successfully',
      liked,
      likes_count: likesCount,
      data: {
        liked,
        likes_count: likesCount
      }
    });
  } catch (error) {
    console.error('Error liking marketplace listing:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to like marketplace listing',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const reserveListing = async (req, res) => {
  try {
    await ensureCommunityFeatureSchema();

    const { id } = req.params;
    const listing = await MarketplaceListing.findById(id);

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: 'Marketplace listing not found'
      });
    }

    if (String(listing.seller_id) === String(req.user.id)) {
      return res.status(400).json({
        success: false,
        message: 'You cannot reserve your own listing'
      });
    }

    if (listing.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Only active listings can be reserved'
      });
    }

    const now = new Date();
    const reservedUntil = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
    const currentlyReserved = Boolean(
      listing.reserved_by &&
      listing.reserved_until &&
      new Date(listing.reserved_until) > now &&
      String(listing.reserved_by) !== String(req.user.id)
    );

    if (currentlyReserved) {
      return res.status(409).json({
        success: false,
        message: 'This item is already reserved'
      });
    }

    await run(
      `
        UPDATE marketplace_listings
        SET reserved_by = ?, reserved_at = ?, reserved_until = ?, reservation_message = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [
        req.user.id,
        now.toISOString(),
        reservedUntil,
        req.body.message ? String(req.body.message).trim() : null,
        id
      ]
    );

    res.json({
      success: true,
      message: 'Listing reserved successfully',
      data: {
        reserved_by: req.user.id,
        reserved_at: now.toISOString(),
        reserved_until: reservedUntil
      }
    });
  } catch (error) {
    console.error('Error reserving listing:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reserve listing',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const releaseReservation = async (req, res) => {
  try {
    await ensureCommunityFeatureSchema();

    const { id } = req.params;
    const listing = await MarketplaceListing.findById(id);

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: 'Marketplace listing not found'
      });
    }

    const canRelease =
      String(listing.seller_id) === String(req.user.id) ||
      String(listing.reserved_by || '') === String(req.user.id) ||
      ['admin', 'super_admin'].includes(req.user.role);

    if (!canRelease) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to release this reservation'
      });
    }

    await run(
      `
        UPDATE marketplace_listings
        SET reserved_by = NULL, reserved_at = NULL, reserved_until = NULL, reservation_message = NULL, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [id]
    );

    res.json({
      success: true,
      message: 'Reservation released successfully'
    });
  } catch (error) {
    console.error('Error releasing reservation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to release reservation',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const submitSellerReview = async (req, res) => {
  try {
    await ensureCommunityFeatureSchema();

    const { id } = req.params;
    const listing = await MarketplaceListing.findById(id);

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: 'Marketplace listing not found'
      });
    }

    if (String(listing.seller_id) === String(req.user.id)) {
      return res.status(400).json({
        success: false,
        message: 'You cannot review your own listing'
      });
    }

    const rating = Number(req.body.rating);
    const reviewText = req.body.review_text ? String(req.body.review_text).trim() : null;
    const existing = await get(
      'SELECT id FROM marketplace_seller_reviews WHERE listing_id = ? AND reviewer_id = ?',
      [id, req.user.id]
    );

    if (existing) {
      await run(
        `
          UPDATE marketplace_seller_reviews
          SET rating = ?, review_text = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `,
        [rating, reviewText, existing.id]
      );
    } else {
      await run(
        `
          INSERT INTO marketplace_seller_reviews (listing_id, seller_id, reviewer_id, rating, review_text)
          VALUES (?, ?, ?, ?, ?)
        `,
        [id, listing.seller_id, req.user.id, rating, reviewText]
      );
    }

    const sellerProfile = await getSellerTrustProfile(listing.seller_id);
    res.json({
      success: true,
      message: 'Seller review saved successfully',
      data: sellerProfile
    });
  } catch (error) {
    console.error('Error reviewing seller:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit review',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const reportListing = async (req, res) => {
  try {
    await ensureCommunityFeatureSchema();

    const { id } = req.params;
    const listing = await MarketplaceListing.findById(id);

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: 'Marketplace listing not found'
      });
    }

    await run(
      `
        INSERT INTO marketplace_reports (listing_id, reporter_id, reason, details, risk_level)
        VALUES (?, ?, ?, ?, ?)
      `,
      [
        id,
        req.user.id,
        String(req.body.reason || 'Suspicious activity').trim(),
        req.body.details ? String(req.body.details).trim() : null,
        req.body.risk_level || 'medium'
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Listing report submitted successfully'
    });
  } catch (error) {
    console.error('Error reporting listing:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to report listing',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const recordTransaction = async (req, res) => {
  try {
    await ensureCommunityFeatureSchema();

    const { id } = req.params;
    const listing = await MarketplaceListing.findById(id);

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: 'Marketplace listing not found'
      });
    }

    const isSeller = String(listing.seller_id) === String(req.user.id);
    const isReservedBuyer = String(listing.reserved_by || '') === String(req.user.id);
    const isAdmin = ['admin', 'super_admin'].includes(req.user.role);

    if (!isSeller && !isReservedBuyer && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to record this transaction'
      });
    }

    const buyerId = req.body.buyer_id || listing.reserved_by || (isSeller ? null : req.user.id);
    const amount = Number(req.body.amount || listing.price || 0);

    await run(
      `
        INSERT INTO marketplace_transactions (
          listing_id, seller_id, buyer_id, amount, payment_status, meetup_status, note, completed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        id,
        listing.seller_id,
        buyerId,
        amount,
        req.body.payment_status || 'paid',
        req.body.meetup_status || 'completed',
        req.body.note ? String(req.body.note).trim() : null,
        new Date().toISOString()
      ]
    );

    await run(
      `
        UPDATE marketplace_listings
        SET status = ?, reserved_by = NULL, reserved_at = NULL, reserved_until = NULL, reservation_message = NULL, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [req.body.mark_sold === false ? listing.status : 'sold', id]
    );

    res.status(201).json({
      success: true,
      message: 'Transaction recorded successfully'
    });
  } catch (error) {
    console.error('Error recording marketplace transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to record transaction',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const getUserTransactions = async (req, res) => {
  try {
    await ensureCommunityFeatureSchema();

    const rows = await all(
      `
        SELECT
          t.*,
          m.title AS listing_title,
          seller.username AS seller_username,
          buyer.username AS buyer_username
        FROM marketplace_transactions t
        INNER JOIN marketplace_listings m ON m.id = t.listing_id
        LEFT JOIN users seller ON seller.id = t.seller_id
        LEFT JOIN users buyer ON buyer.id = t.buyer_id
        WHERE t.seller_id = ? OR t.buyer_id = ?
        ORDER BY t.created_at DESC
      `,
      [req.user.id, req.user.id]
    );

    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('Error fetching user transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transaction history',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getMarketplaceCategories,
  getListings,
  getListing,
  createListing,
  updateListing,
  deleteListing,
  getMyListings,
  getMarketplaceStats,
  toggleListingLike,
  reserveListing,
  releaseReservation,
  submitSellerReview,
  reportListing,
  recordTransaction,
  getUserTransactions
};
