const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analytics.controller');
const { authenticateToken } = require('../middleware/auth.middleware');
const { requireSuperAdmin } = require('../middleware/role.middleware');

// Get platform analytics
router.get('/', authenticateToken, requireSuperAdmin, analyticsController.getAnalytics);
router.get('/drilldown', authenticateToken, requireSuperAdmin, analyticsController.getAnalyticsDrilldown);
router.post('/events', analyticsController.trackEvent);

module.exports = router;
