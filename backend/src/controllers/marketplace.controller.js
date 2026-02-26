const { validationResult } = require('express-validator');
const MarketplaceListing = require('../models/MarketplaceListing');
const Notification = require('../models/Notification');
const { run, get, all } = require('../config/db');

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

    // Increment view count for authenticated users
    if (req.user) {
      await MarketplaceListing.incrementViews(id);
      listing.views_count += 1;
    }

    let likedByMe = false;
    if (req.user?.id) {
      const row = await get(
        'SELECT id FROM marketplace_listing_likes WHERE listing_id = ? AND user_id = ?',
        [id, req.user.id]
      );
      likedByMe = !!row;
    }

    res.json({
      success: true,
      data: {
        ...listing,
        likedByMe
      }
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
      seller_id: req.user.id,
      status: req.body.status || 'active',
      image_urls: req.body.image_urls || [],
      tags: req.body.tags || []
    };

    const listingId = await MarketplaceListing.create(listingData);

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
    
    await MarketplaceListing.update(id, updateData);

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

module.exports = {
  getMarketplaceCategories,
  getListings,
  getListing,
  createListing,
  updateListing,
  deleteListing,
  getMyListings,
  getMarketplaceStats,
  toggleListingLike
};
