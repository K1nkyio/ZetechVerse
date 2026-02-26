const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const { authenticateToken } = require('../middleware/auth.middleware');
const {
  initiateMpesaStkPush,
  handleMpesaCallback,
  getMpesaTransactionStatus
} = require('../controllers/payments.controller');

const stkPushValidation = [
  body('phone_number')
    .trim()
    .notEmpty()
    .withMessage('phone_number is required'),
  body('amount')
    .isFloat({ gt: 0 })
    .withMessage('amount must be greater than 0'),
  body('account_reference')
    .optional()
    .trim()
    .isLength({ min: 2, max: 40 })
    .withMessage('account_reference must be between 2 and 40 characters'),
  body('transaction_desc')
    .optional()
    .trim()
    .isLength({ min: 2, max: 80 })
    .withMessage('transaction_desc must be between 2 and 80 characters')
];

router.post('/mpesa/stk-push', authenticateToken, stkPushValidation, initiateMpesaStkPush);
router.get('/mpesa/transactions/:checkoutRequestId', authenticateToken, getMpesaTransactionStatus);
router.post('/mpesa/callback', handleMpesaCallback);

module.exports = router;
