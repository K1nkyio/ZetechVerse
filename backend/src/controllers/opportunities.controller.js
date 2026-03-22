const { validationResult } = require('express-validator');
const Opportunity = require('../models/Opportunity');
const Notification = require('../models/Notification');
const { recordUniqueView } = require('../utils/engagementTracking');

// Get all opportunities with filtering and pagination
const getOpportunities = async (req, res) => {
  try {
    const options = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 10,
      type: req.query.type,
      category_id: req.query.category_id,
      location: req.query.location,
      is_remote: req.query.is_remote === 'true' ? true : req.query.is_remote === 'false' ? false : undefined,
      is_paid: req.query.is_paid === 'true' ? true : req.query.is_paid === 'false' ? false : undefined,
      status: req.query.status,
      search: req.query.search,
      sort_by: req.query.sort_by,
      sort_order: req.query.sort_order
    };

    const result = await Opportunity.findAll(options);

    res.json({
      success: true,
      data: result.opportunities,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Error fetching opportunities:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch opportunities',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get single opportunity by ID
const getOpportunity = async (req, res) => {
  try {
    const { id } = req.params;
    const opportunity = await Opportunity.findById(id);

    if (!opportunity) {
      return res.status(404).json({
        success: false,
        message: 'Opportunity not found'
      });
    }

    const countedView = await recordUniqueView({
      req,
      contentType: 'opportunity',
      contentId: id,
      incrementView: () => Opportunity.incrementViews(id)
    });
    if (countedView) {
      opportunity.views_count = Number(opportunity.views_count || 0) + 1;
    }

    res.json({
      success: true,
      data: opportunity
    });
  } catch (error) {
    console.error('Error fetching opportunity:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch opportunity',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Create new opportunity
const createOpportunity = async (req, res) => {
  try {
    console.log('📨 CREATE OPPORTUNITY REQUEST RECEIVED');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('User:', req.user?.id);
    
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorArray = errors.array();
      console.error('🔴 Opportunity validation errors:', JSON.stringify(errorArray, null, 2));
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

    const opportunityData = {
      ...req.body,
      posted_by: req.user.id
    };

    const opportunityId = await Opportunity.create(opportunityData);
    const opportunity = await Opportunity.findById(opportunityId);

    // Trigger notification for new opportunity
    try {
      await Notification.createSystemNotification(
        'opportunities',
        'New Opportunity Posted',
        `A new opportunity titled "${opportunityData.title}" has been posted. Check it out now!`,
        opportunityId
      );
    } catch (notificationError) {
      console.error('Failed to create notification for new opportunity:', notificationError);
    }

    res.status(201).json({
      success: true,
      message: 'Opportunity created successfully',
      data: opportunity
    });
  } catch (error) {
    console.error('Error creating opportunity:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create opportunity',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Update opportunity
const updateOpportunity = async (req, res) => {
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
    const opportunity = await Opportunity.findById(id);

    if (!opportunity) {
      return res.status(404).json({
        success: false,
        message: 'Opportunity not found'
      });
    }

    // Check if user owns this opportunity or is admin
    if (opportunity.posted_by !== req.user.id && !['admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You can only edit your own opportunities'
      });
    }

    const updated = await Opportunity.update(id, req.body);

    if (!updated) {
      return res.status(500).json({
        success: false,
        message: 'Failed to update opportunity'
      });
    }

    const updatedOpportunity = await Opportunity.findById(id);

    res.json({
      success: true,
      message: 'Opportunity updated successfully',
      data: updatedOpportunity
    });
  } catch (error) {
    console.error('Error updating opportunity:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update opportunity',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Delete opportunity
const deleteOpportunity = async (req, res) => {
  try {
    const { id } = req.params;
    const opportunity = await Opportunity.findById(id);

    if (!opportunity) {
      return res.status(404).json({
        success: false,
        message: 'Opportunity not found'
      });
    }

    // Check if user owns this opportunity or is admin
    if (opportunity.posted_by !== req.user.id && !['admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own opportunities'
      });
    }

    const deleted = await Opportunity.delete(id);

    if (!deleted) {
      return res.status(500).json({
        success: false,
        message: 'Failed to delete opportunity'
      });
    }

    res.json({
      success: true,
      message: 'Opportunity deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting opportunity:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete opportunity',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get opportunities posted by current user
const getMyOpportunities = async (req, res) => {
  try {
    const options = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 10,
      status: req.query.status
    };

    const result = await Opportunity.findByUser(req.user.id, options);

    res.json({
      success: true,
      data: result.opportunities,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Error fetching user opportunities:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch your opportunities',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get featured opportunities
const getFeaturedOpportunities = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 6;
    const opportunities = await Opportunity.getFeatured(limit);

    res.json({
      success: true,
      data: opportunities
    });
  } catch (error) {
    console.error('Error fetching featured opportunities:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch featured opportunities',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get opportunity statistics (for dashboard)
const getOpportunityStats = async (req, res) => {
  try {
    // This would typically involve complex queries to get stats
    // For now, returning basic counts
    const { get } = require('../config/db');

    const totalOpportunities = await get("SELECT COUNT(*) as count FROM opportunities WHERE status = 'active'");
    const userOpportunities = await get("SELECT COUNT(*) as count FROM opportunities WHERE posted_by = ? AND status = 'active'", [req.user.id]);
    const expiringSoon = await get("SELECT COUNT(*) as count FROM opportunities WHERE status = 'active' AND application_deadline > CURRENT_TIMESTAMP AND application_deadline <= datetime('now', '+7 days')");

    res.json({
      success: true,
      data: {
        total_active: totalOpportunities.count,
        my_active: userOpportunities.count,
        expiring_soon: expiringSoon.count
      }
    });
  } catch (error) {
    console.error('Error fetching opportunity stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch opportunity statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getOpportunities,
  getOpportunity,
  createOpportunity,
  updateOpportunity,
  deleteOpportunity,
  getMyOpportunities,
  getFeaturedOpportunities,
  getOpportunityStats
};
