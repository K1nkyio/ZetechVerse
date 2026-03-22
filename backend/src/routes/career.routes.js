const express = require('express');
const { body } = require('express-validator');

const {
  getCareerProfile,
  updateCareerProfile,
  getRecommendations,
  toggleSavedOpportunity,
  getSavedOpportunities,
  submitApplication,
  getApplications,
  getMentors,
  requestMentorConnection,
  getMentorConnections
} = require('../controllers/career.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(authenticateToken);

router.get('/profile', getCareerProfile);
router.put(
  '/profile',
  [
    body('linkedin_url').optional({ nullable: true }).isURL().withMessage('linkedin_url must be a valid URL'),
    body('portfolio_url').optional({ nullable: true }).isURL().withMessage('portfolio_url must be a valid URL'),
    body('resume_url').optional({ nullable: true }).isURL().withMessage('resume_url must be a valid URL'),
    body('skills').optional().isArray().withMessage('skills must be an array'),
    body('interests').optional().isArray().withMessage('interests must be an array'),
    body('mentorship_topics').optional().isArray().withMessage('mentorship_topics must be an array'),
    body('mentor_open').optional().isBoolean().withMessage('mentor_open must be a boolean')
  ],
  updateCareerProfile
);

router.get('/recommendations', getRecommendations);
router.get('/saved-opportunities', getSavedOpportunities);
router.post('/opportunities/:id/save', toggleSavedOpportunity);
router.post('/opportunities/:id/apply', submitApplication);
router.get('/applications', getApplications);
router.get('/mentors', getMentors);
router.get('/mentor-connections', getMentorConnections);
router.post(
  '/mentors/:mentorId/connect',
  [body('message').optional().trim().isLength({ max: 1000 }).withMessage('message must be under 1000 characters')],
  requestMentorConnection
);

module.exports = router;
