const express = require('express');

const { body, param } = require('express-validator');

const router = express.Router();



// Import controllers and middleware

const {

  register,

  login,
  forgotPassword,
  resetPassword,
  oauthLogin,
  oauthCallback,

  getProfile,

  updateProfile,

  changePassword,

  verifyToken,

  logout,
  requestAdminAccount,
  createAdminAccount,
  listPendingAdmins,
  listAdminAccounts,
  listUserAccounts,
  activateUserAccount,
  deactivateUserAccount,
  approveAdminAccount,
  deactivateAdminAccount,
  listAdminAudit

} = require('../controllers/auth.controller');



const { authenticateToken } = require('../middleware/auth.middleware');
const { requireSuperAdmin } = require('../middleware/role.middleware');



// Validation rules

const registerValidation = [

  body('email')

    .isEmail()

    .normalizeEmail()

    .withMessage('Please provide a valid email address'),

  body('username')

    .trim()

    .isLength({ min: 3, max: 30 })

    .matches(/^[a-zA-Z0-9_]+$/)

    .withMessage('Username must be 3-30 characters and contain only letters, numbers, and underscores'),

  body('password')

    .isLength({ min: 8 })

    .withMessage('Password must be at least 8 characters long')

    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)

    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),

  body('full_name')

    .optional()

    .trim()

    .isLength({ min: 2, max: 255 })

    .withMessage('Full name must be between 2 and 255 characters'),

  body('student_id')

    .optional()

    .trim()

    .isLength({ min: 1, max: 50 })

    .withMessage('Student ID must be between 1 and 50 characters'),

  body('course')

    .optional()

    .trim()

    .isLength({ min: 2, max: 255 })

    .withMessage('Course must be between 2 and 255 characters'),

  body('year_of_study')

    .optional()

    .isInt({ min: 1, max: 6 })

    .withMessage('Year of study must be between 1 and 6'),

  body('phone')

    .optional()

    .matches(/^(\+254|0)[17]\d{8}$/)

    .withMessage('Invalid Kenyan phone number format')

];



const loginValidation = [

  body().custom((_, { req }) => {
    const identifier = String(req.body.identifier || req.body.email || req.body.username || '').trim();
    if (!identifier) {
      throw new Error('Username or email is required');
    }
    return true;
  }),

  body('password')

    .notEmpty()

    .withMessage('Password is required')

];

const forgotPasswordValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address')
];

const resetPasswordValidation = [
  body('token')
    .trim()
    .notEmpty()
    .withMessage('Reset token is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number')
];

const oauthCallbackValidation = [
  param('provider')
    .isIn(['google', 'github'])
    .withMessage('Unsupported OAuth provider'),
  body('code')
    .trim()
    .notEmpty()
    .withMessage('OAuth authorization code is required'),
  body('state')
    .optional({ checkFalsy: true })
    .isString()
    .withMessage('Invalid OAuth state parameter')
];

const oauthProviderValidation = [
  param('provider')
    .isIn(['google', 'github'])
    .withMessage('Unsupported OAuth provider')
];

const adminRequestValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username must be 3-30 characters and contain only letters, numbers, and underscores'),
  body('password')
    .isLength({ min: 12 })
    .withMessage('Password must be at least 12 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])/)
    .withMessage('Password must contain uppercase, lowercase, number, and symbol'),
  body('full_name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Full name must be between 2 and 255 characters')
];



const profileUpdateValidation = [

  body('full_name')

    .optional({ checkFalsy: true })

    .trim()

    .isLength({ min: 2, max: 255 })

    .withMessage('Full name must be between 2 and 255 characters'),

  body('bio')

    .optional({ checkFalsy: true })

    .trim()

    .isLength({ max: 500 })

    .withMessage('Bio must not exceed 500 characters'),

  body('avatar_url')

    .optional({ checkFalsy: true })

    .isString()
    .withMessage('Invalid format for avatar')
    .bail()
    .isLength({ max: 500 })

    .withMessage('Avatar URL must be 500 characters or less'),

  body('phone')

    .optional({ checkFalsy: true })
    .isString()
    .withMessage('Invalid phone number format')
    .bail()
    .trim()

    .isLength({ max: 20 })
    .withMessage('Phone number must be 20 characters or less')
    .bail()
    .matches(/^(\+254|0)[17]\d{8}$/)

    .withMessage('Invalid Kenyan phone number format'),

  body('course')

    .optional({ checkFalsy: true })

    .trim()

    .isLength({ min: 2, max: 255 })

    .withMessage('Course must be between 2 and 255 characters'),

  body('year_of_study')

    .optional({ nullable: true })

    .custom((value) => {

      // Skip validation if value is undefined, null, or empty string

      if (value === undefined || value === null || value === '') return true;

      // Convert to number and validate range

      const num = typeof value === 'number' ? value : parseInt(value, 10);

      if (isNaN(num)) return false;

      return num >= 1 && num <= 6;

    })

    .withMessage('Year of study must be between 1 and 6')

];



const passwordChangeValidation = [

  body('current_password')

    .notEmpty()

    .withMessage('Current password is required'),

  body('new_password')

    .isLength({ min: 8 })

    .withMessage('New password must be at least 8 characters long')

    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)

    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number')

];



// Routes



// Public routes

router.post('/register', registerValidation, register);

router.post('/login', loginValidation, login);
router.post('/forgot-password', forgotPasswordValidation, forgotPassword);
router.post('/reset-password', resetPasswordValidation, resetPassword);
router.get('/oauth/:provider', oauthProviderValidation, oauthLogin);
router.post('/oauth/:provider/callback', oauthCallbackValidation, oauthCallback);
router.post('/admin/request', adminRequestValidation, requestAdminAccount);



// Protected routes (require authentication)

router.use(authenticateToken);



router.get('/profile', getProfile);

router.put('/profile', profileUpdateValidation, updateProfile);

router.put('/change-password', passwordChangeValidation, changePassword);

router.get('/verify', verifyToken);

router.post('/logout', logout);
router.post('/admin/create', requireSuperAdmin, adminRequestValidation, createAdminAccount);
router.get('/admin/pending', requireSuperAdmin, listPendingAdmins);
router.get('/admin/accounts', requireSuperAdmin, listAdminAccounts);
router.get('/admin/audit', requireSuperAdmin, listAdminAudit);
router.post('/admin/approve', requireSuperAdmin, approveAdminAccount);
router.post('/admin/deactivate', requireSuperAdmin, deactivateAdminAccount);
router.get('/users', requireSuperAdmin, listUserAccounts);
router.post('/users/activate', requireSuperAdmin, activateUserAccount);
router.post('/users/deactivate', requireSuperAdmin, deactivateUserAccount);



module.exports = router;
