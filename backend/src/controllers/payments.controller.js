const { validationResult } = require('express-validator');
const { get, run, query } = require('../config/db');

let paymentsTableReadyPromise = null;
let cachedAccessToken = null;
let cachedAccessTokenExpiresAt = 0;

const getMpesaBaseUrl = () => {
  const env = (process.env.MPESA_ENV || 'sandbox').toLowerCase();
  return env === 'production' ? 'https://api.safaricom.co.ke' : 'https://sandbox.safaricom.co.ke';
};

const getMpesaCallbackUrl = () => {
  const configured = (process.env.MPESA_CALLBACK_URL || '').trim();
  if (!configured) return null;

  if (configured.includes('/api/payments/mpesa/callback')) {
    return configured;
  }

  return `${configured.replace(/\/$/, '')}/api/payments/mpesa/callback`;
};

const ensureMpesaConfig = () => {
  const required = [
    'MPESA_CONSUMER_KEY',
    'MPESA_CONSUMER_SECRET',
    'MPESA_SHORTCODE',
    'MPESA_PASSKEY',
    'MPESA_CALLBACK_URL'
  ];

  const missing = required.filter((key) => !(process.env[key] || '').trim());
  if (missing.length > 0) {
    const err = new Error(`M-Pesa is not configured. Missing: ${missing.join(', ')}`);
    err.statusCode = 503;
    throw err;
  }
};

const ensurePaymentsTable = async () => {
  if (paymentsTableReadyPromise) {
    return paymentsTableReadyPromise;
  }

  paymentsTableReadyPromise = (async () => {
    await query(`
      CREATE TABLE IF NOT EXISTS mpesa_transactions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        merchant_request_id VARCHAR(120),
        checkout_request_id VARCHAR(120) UNIQUE NOT NULL,
        phone_number VARCHAR(20) NOT NULL,
        amount DECIMAL(12,2) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'cancelled', 'timeout')),
        result_code VARCHAR(20),
        result_desc TEXT,
        mpesa_receipt_number VARCHAR(100),
        transaction_date VARCHAR(20),
        raw_request JSONB,
        raw_response JSONB,
        raw_callback JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_mpesa_transactions_user_id
      ON mpesa_transactions(user_id);
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_mpesa_transactions_status
      ON mpesa_transactions(status);
    `);
  })();

  return paymentsTableReadyPromise;
};

const normalizePhoneNumber = (input) => {
  const digits = String(input || '').replace(/\D/g, '');
  if (!digits) throw new Error('Phone number is required');

  if (digits.startsWith('254') && digits.length === 12) return digits;
  if (digits.startsWith('0') && digits.length === 10) return `254${digits.slice(1)}`;
  if (digits.startsWith('7') && digits.length === 9) return `254${digits}`;
  if (digits.startsWith('1') && digits.length === 9) return `254${digits}`;

  throw new Error('Invalid phone number format. Use 07XXXXXXXX or 2547XXXXXXXX');
};

const buildTimestamp = () => {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
};

const parseJsonResponse = async (response) => {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
};

const getAccessToken = async () => {
  if (typeof fetch !== 'function') {
    throw new Error('Global fetch is not available. Use Node.js 18+ for M-Pesa integration.');
  }

  if (cachedAccessToken && Date.now() < cachedAccessTokenExpiresAt - 60_000) {
    return cachedAccessToken;
  }

  const consumerKey = process.env.MPESA_CONSUMER_KEY;
  const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
  const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
  const tokenUrl = `${getMpesaBaseUrl()}/oauth/v1/generate?grant_type=client_credentials`;

  const tokenResponse = await fetch(tokenUrl, {
    method: 'GET',
    headers: {
      Authorization: `Basic ${auth}`
    }
  });

  const tokenPayload = await parseJsonResponse(tokenResponse);
  if (!tokenResponse.ok || !tokenPayload?.access_token) {
    const reason = tokenPayload?.errorMessage || tokenPayload?.error_description || tokenPayload?.error || 'Failed to acquire M-Pesa access token';
    throw new Error(`Failed to acquire M-Pesa access token (HTTP ${tokenResponse.status}): ${reason}`);
  }

  const expiresInSeconds = Number(tokenPayload.expires_in || 3599);
  cachedAccessToken = tokenPayload.access_token;
  cachedAccessTokenExpiresAt = Date.now() + expiresInSeconds * 1000;
  return cachedAccessToken;
};

const mapResultCodeToStatus = (resultCode) => {
  const code = Number(resultCode);
  if (code === 0) return 'success';
  if (code === 1032) return 'cancelled';
  if (code === 1037) return 'timeout';
  return 'failed';
};

const initiateMpesaStkPush = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    ensureMpesaConfig();
    await ensurePaymentsTable();

    const rawAmount = Number(req.body.amount);
    if (!Number.isFinite(rawAmount) || rawAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be greater than 0'
      });
    }

    const amount = Math.max(1, Math.round(rawAmount));
    const phoneNumber = normalizePhoneNumber(req.body.phone_number);
    const callbackUrl = getMpesaCallbackUrl();
    const timestamp = buildTimestamp();

    const shortCode = String(process.env.MPESA_SHORTCODE).trim();
    const passKey = String(process.env.MPESA_PASSKEY).trim();
    const password = Buffer.from(`${shortCode}${passKey}${timestamp}`).toString('base64');

    const payload = {
      BusinessShortCode: shortCode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: process.env.MPESA_TRANSACTION_TYPE || 'CustomerPayBillOnline',
      Amount: amount,
      PartyA: phoneNumber,
      PartyB: shortCode,
      PhoneNumber: phoneNumber,
      CallBackURL: callbackUrl,
      AccountReference: (req.body.account_reference || 'ZetechVerse').toString().slice(0, 40),
      TransactionDesc: (req.body.transaction_desc || 'Marketplace checkout').toString().slice(0, 80)
    };

    const accessToken = await getAccessToken();
    const stkResponse = await fetch(`${getMpesaBaseUrl()}/mpesa/stkpush/v1/processrequest`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const stkPayload = await parseJsonResponse(stkResponse);
    const responseCode = String(stkPayload?.ResponseCode ?? '');
    const checkoutRequestId = stkPayload?.CheckoutRequestID;

    if (!stkResponse.ok || responseCode !== '0' || !checkoutRequestId) {
      return res.status(502).json({
        success: false,
        message: stkPayload?.errorMessage || stkPayload?.ResponseDescription || 'Failed to start M-Pesa payment',
        data: stkPayload
      });
    }

    await run(
      `
        INSERT INTO mpesa_transactions (
          user_id,
          merchant_request_id,
          checkout_request_id,
          phone_number,
          amount,
          status,
          result_code,
          result_desc,
          raw_request,
          raw_response
        )
        VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?::jsonb, ?::jsonb)
      `,
      [
        req.user.id,
        stkPayload?.MerchantRequestID || null,
        checkoutRequestId,
        phoneNumber,
        amount,
        responseCode,
        stkPayload?.ResponseDescription || null,
        JSON.stringify(payload),
        JSON.stringify(stkPayload)
      ]
    );

    return res.json({
      success: true,
      message: 'STK push sent successfully',
      data: {
        checkout_request_id: checkoutRequestId,
        merchant_request_id: stkPayload?.MerchantRequestID || null,
        customer_message: stkPayload?.CustomerMessage || 'Check your phone and enter your M-Pesa PIN to complete payment.',
        status: 'pending'
      }
    });
  } catch (error) {
    console.error('Error initiating M-Pesa STK push:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to initiate M-Pesa payment',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

const handleMpesaCallback = async (req, res) => {
  try {
    await ensurePaymentsTable();

    const callback = req.body?.Body?.stkCallback;
    if (!callback?.CheckoutRequestID) {
      return res.status(400).json({
        ResultCode: 1,
        ResultDesc: 'Invalid callback payload'
      });
    }

    const metadataItems = Array.isArray(callback?.CallbackMetadata?.Item)
      ? callback.CallbackMetadata.Item
      : [];

    const metadata = {};
    for (const item of metadataItems) {
      if (!item || !item.Name) continue;
      metadata[item.Name] = item.Value;
    }

    const checkoutRequestId = callback.CheckoutRequestID;
    const transaction = await get(
      'SELECT id FROM mpesa_transactions WHERE checkout_request_id = ?',
      [checkoutRequestId]
    );

    if (transaction) {
      const amountFromCallback = Number(metadata.Amount || 0);
      const resultCode = String(callback.ResultCode ?? '');
      const status = mapResultCodeToStatus(callback.ResultCode);

      await run(
        `
          UPDATE mpesa_transactions
          SET
            status = ?,
            result_code = ?,
            result_desc = ?,
            mpesa_receipt_number = ?,
            transaction_date = ?,
            amount = COALESCE(NULLIF(?, 0), amount),
            phone_number = COALESCE(?, phone_number),
            raw_callback = ?::jsonb,
            updated_at = CURRENT_TIMESTAMP
          WHERE checkout_request_id = ?
        `,
        [
          status,
          resultCode,
          callback.ResultDesc || null,
          metadata.MpesaReceiptNumber ? String(metadata.MpesaReceiptNumber) : null,
          metadata.TransactionDate ? String(metadata.TransactionDate) : null,
          Number.isFinite(amountFromCallback) ? amountFromCallback : 0,
          metadata.PhoneNumber ? String(metadata.PhoneNumber) : null,
          JSON.stringify(req.body || {}),
          checkoutRequestId
        ]
      );
    } else {
      console.warn('M-Pesa callback received for unknown CheckoutRequestID:', checkoutRequestId);
    }

    return res.json({
      ResultCode: 0,
      ResultDesc: 'Accepted'
    });
  } catch (error) {
    console.error('Error handling M-Pesa callback:', error);
    return res.status(200).json({
      ResultCode: 0,
      ResultDesc: 'Accepted'
    });
  }
};

const getMpesaTransactionStatus = async (req, res) => {
  try {
    await ensurePaymentsTable();

    const { checkoutRequestId } = req.params;
    const transaction = await get(
      `
        SELECT
          id,
          merchant_request_id,
          checkout_request_id,
          phone_number,
          amount,
          status,
          result_code,
          result_desc,
          mpesa_receipt_number,
          transaction_date,
          created_at,
          updated_at
        FROM mpesa_transactions
        WHERE checkout_request_id = ? AND user_id = ?
      `,
      [checkoutRequestId, req.user.id]
    );

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Payment transaction not found'
      });
    }

    return res.json({
      success: true,
      data: {
        ...transaction,
        amount: Number(transaction.amount || 0)
      }
    });
  } catch (error) {
    console.error('Error fetching M-Pesa transaction status:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch payment status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  initiateMpesaStkPush,
  handleMpesaCallback,
  getMpesaTransactionStatus
};
