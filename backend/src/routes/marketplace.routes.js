const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

// Import controllers and middleware
const {
  getMarketplaceCategories,
  getListings,
  getListing,
  createListing,
  updateListing,
  deleteListing,
  getMyListings,
  getMarketplaceStats,
  toggleListingLike
} = require('../controllers/marketplace.controller');

const { authenticateToken, optionalAuth } = require('../middleware/auth.middleware');
const { requireUserOrAdmin } = require('../middleware/role.middleware');

const LISTING_KINDS = ['product', 'service', 'hostel'];
const PRODUCT_CONDITIONS = ['new', 'used', 'refurbished'];

const normalizeDetailKeys = (details, fieldMap) => {
  if (!details || typeof details !== 'object' || Array.isArray(details)) return details;
  const normalized = { ...details };
  for (const [targetKey, sourceKeys] of Object.entries(fieldMap)) {
    if (normalized[targetKey] !== undefined) continue;
    for (const sourceKey of sourceKeys) {
      if (normalized[sourceKey] !== undefined) {
        normalized[targetKey] = normalized[sourceKey];
        break;
      }
    }
  }
  return normalized;
};

const parseMaybeJsonObject = (value) => {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  if (typeof value !== 'string' || !value.trim()) return value;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : value;
  } catch {
    return value;
  }
};

const getFirstDefinedValue = (source, keys) => {
  if (!source || typeof source !== 'object' || Array.isArray(source)) return undefined;
  for (const key of keys) {
    if (source[key] !== undefined && source[key] !== null && source[key] !== '') {
      return source[key];
    }
  }
  return undefined;
};

const buildDetailObject = (source, wrappers, fieldMap) => {
  const detailSources = [
    ...wrappers.map((key) => parseMaybeJsonObject(source[key])),
  ].filter((value) => value && typeof value === 'object' && !Array.isArray(value));

  const merged = detailSources.reduce((acc, value) => ({ ...acc, ...value }), {});

  for (const [targetKey, aliases] of Object.entries(fieldMap)) {
    if (merged[targetKey] !== undefined) continue;
    const value = getFirstDefinedValue(source, aliases);
    if (value !== undefined) {
      merged[targetKey] = value;
    }
  }

  return Object.keys(merged).length > 0 ? merged : undefined;
};

const normalizeListingPayload = (req, _res, next) => {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    return next();
  }

  const body = req.body;

  if (body.listing_kind === undefined && body.listingKind !== undefined) {
    body.listing_kind = body.listingKind;
  }
  if (body.category_id === undefined && body.categoryId !== undefined) {
    body.category_id = body.categoryId;
  }
  if (body.contact_method === undefined && body.contactMethod !== undefined) {
    body.contact_method = body.contactMethod;
  }
  if (body.is_negotiable === undefined && body.isNegotiable !== undefined) {
    body.is_negotiable = body.isNegotiable;
  }
  if (body.expires_at === undefined && body.expiresAt !== undefined) {
    body.expires_at = body.expiresAt;
  }
  if (body.image_urls === undefined && body.imageUrls !== undefined) {
    body.image_urls = body.imageUrls;
  }

  if (body.service_details === undefined && body.serviceDetails !== undefined) {
    body.service_details = body.serviceDetails;
  }
  if (body.hostel_details === undefined && body.hostelDetails !== undefined) {
    body.hostel_details = body.hostelDetails;
  }

  if (body.service_details === undefined) {
    body.service_details = buildDetailObject(
      body,
      ['serviceDetails', 'service_setup', 'serviceSetup', 'service', 'serviceInfo'],
      {
        pricing_model: ['pricing_model', 'pricingModel', 'pricing', 'pricing_type', 'pricingType', 'rate_model', 'rateModel'],
        service_area: ['service_area', 'serviceArea', 'area', 'coverage_area', 'coverageArea'],
        availability: ['availability', 'service_availability', 'serviceAvailability', 'schedule']
      }
    );
  }

  if (body.hostel_details === undefined) {
    body.hostel_details = buildDetailObject(
      body,
      [
        'hostelDetails',
        'hostel_setup',
        'hostelSetup',
        'accommodation_setup',
        'accommodationSetup',
        'accomodation_setup',
        'accomodationSetup',
        'accommodation',
        'accomodation'
      ],
      {
        room_type: ['room_type', 'roomType', 'type_of_room', 'typeOfRoom', 'room'],
        beds_available: ['beds_available', 'bedsAvailable', 'beds', 'bed_count', 'bedCount', 'available_beds'],
        gender_policy: ['gender_policy', 'genderPolicy', 'gender', 'policy'],
        amenities: ['amenities', 'facilities', 'facility']
      }
    );
  }

  body.service_details = parseMaybeJsonObject(body.service_details);
  body.hostel_details = parseMaybeJsonObject(body.hostel_details);

  body.service_details = normalizeDetailKeys(body.service_details, {
    pricing_model: ['pricingModel'],
    service_area: ['serviceArea']
  });

  body.hostel_details = normalizeDetailKeys(body.hostel_details, {
    room_type: ['roomType'],
    beds_available: ['bedsAvailable'],
    gender_policy: ['genderPolicy']
  });

  return next();
};

// Validation rules
const createValidation = [
  body('title')
    .trim()
    .isLength({ min: 5, max: 255 })
    .withMessage('Title must be between 5 and 255 characters'),
  body('description')
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Description must be between 10 and 2000 characters'),
  body('price')
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  body('category_id')
    .exists({ checkFalsy: true }).withMessage('category_id is required')
    .isInt().withMessage('category_id must be an integer'),
  body('listing_kind')
    .optional()
    .isIn(LISTING_KINDS)
    .withMessage('Invalid listing kind'),
  body('condition')
    .custom((value, { req }) => {
      const listingKind = req.body.listing_kind || 'product';

      if (listingKind === 'product') {
        if (!value) {
          throw new Error('Condition is required for product listings');
        }
        if (!PRODUCT_CONDITIONS.includes(value)) {
          throw new Error('Invalid condition');
        }
      } else if (value && !PRODUCT_CONDITIONS.includes(value)) {
        throw new Error('Invalid condition');
      }

      return true;
    }),
  body('service_details')
    .optional({ nullable: true })
    .isObject()
    .withMessage('service_details must be an object'),
  body('hostel_details')
    .optional({ nullable: true })
    .isObject()
    .withMessage('hostel_details must be an object'),
  body().custom((_, { req }) => {
    const listingKind = req.body.listing_kind || 'product';

    if (listingKind === 'service') {
      const pricingModel = req.body.service_details?.pricing_model;
      const serviceArea = req.body.service_details?.service_area;

      if (!pricingModel || !serviceArea) {
        throw new Error('Service listings require service_details.pricing_model and service_details.service_area');
      }
    }

    if (listingKind === 'hostel') {
      const roomType = req.body.hostel_details?.room_type;
      const bedsAvailable = Number(req.body.hostel_details?.beds_available || 0);

      if (!roomType || !bedsAvailable || bedsAvailable < 1) {
        throw new Error('Hostel listings require hostel_details.room_type and hostel_details.beds_available');
      }
    }

    return true;
  }),
  body('status')
    .optional()
    .isIn(['active', 'sold', 'inactive'])
    .withMessage('Invalid status'),
  body('contact_method')
    .optional()
    .isIn(['phone', 'email', 'in_app'])
    .withMessage('Invalid contact method'),
  body('location')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Location must be less than 255 characters'),
  body('is_negotiable')
    .optional()
    .isBoolean()
    .withMessage('is_negotiable must be a boolean'),
  body('urgent')
    .optional()
    .isBoolean()
    .withMessage('urgent must be a boolean'),
  body('expires_at')
    .optional({ checkFalsy: true })
    .isISO8601()
    .withMessage('Invalid date format for expires_at'),
];

// Update validation: all fields optional so partial updates are allowed
const updateValidation = [
  body('title').optional().trim().isLength({ min: 5, max: 255 }).withMessage('Title must be between 5 and 255 characters'),
  body('description').optional().trim().isLength({ min: 10, max: 2000 }).withMessage('Description must be between 10 and 2000 characters'),
  body('price').optional().isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('category_id').optional({ nullable: true }).isInt().withMessage('category_id must be an integer'),
  body('listing_kind').optional().isIn(LISTING_KINDS).withMessage('Invalid listing kind'),
  body('condition').optional({ nullable: true }).custom((value) => {
    if (value === null || value === '') return true;
    if (!PRODUCT_CONDITIONS.includes(value)) {
      throw new Error('Invalid condition');
    }
    return true;
  }),
  body('service_details').optional({ nullable: true }).isObject().withMessage('service_details must be an object'),
  body('hostel_details').optional({ nullable: true }).isObject().withMessage('hostel_details must be an object'),
  body('status').optional().isIn(['active', 'sold', 'inactive']).withMessage('Invalid status'),
  body('contact_method').optional().isIn(['phone', 'email', 'in_app']).withMessage('Invalid contact method'),
  body('location').optional().trim().isLength({ max: 255 }).withMessage('Location must be less than 255 characters'),
  body('is_negotiable').optional().isBoolean().withMessage('is_negotiable must be a boolean'),
  body('urgent').optional().isBoolean().withMessage('urgent must be a boolean'),
  body('expires_at').optional({ checkFalsy: true }).isISO8601().withMessage('Invalid date format for expires_at'),
];

// Public routes
router.get('/', optionalAuth, getListings); // Get all marketplace listings
router.get('/categories', optionalAuth, getMarketplaceCategories); // Get marketplace categories
router.get('/:id', optionalAuth, getListing); // Get single listing

// Authenticated routes
router.get('/user/my-listings', authenticateToken, getMyListings); // Get user's listings
router.get('/user/stats', authenticateToken, getMarketplaceStats); // Get marketplace stats
router.post('/:id/like', authenticateToken, toggleListingLike); // Like/unlike listing

// Admin routes
router.post('/', authenticateToken, requireUserOrAdmin, normalizeListingPayload, createValidation, createListing); // Create listing
router.put('/:id', authenticateToken, requireUserOrAdmin, normalizeListingPayload, updateValidation, updateListing); // Update listing
router.delete('/:id', authenticateToken, requireUserOrAdmin, deleteListing); // Delete listing

module.exports = router;
