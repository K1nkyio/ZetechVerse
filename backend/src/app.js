require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Import routes
const authRoutes = require('./routes/auth.routes');
const opportunitiesRoutes = require('./routes/opportunities.routes');
const marketplaceRoutes = require('./routes/marketplace.routes');
const marketplaceCommentsRoutes = require('./routes/marketplaceComments.routes');
const postsRoutes = require('./routes/posts.routes');
const eventsRoutes = require('./routes/events.routes');
const confessionsRoutes = require('./routes/confessions.routes');
const messagesRoutes = require('./routes/messages.routes');
const notificationsRoutes = require('./routes/notifications.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const commentsRoutes = require('./routes/comments.routes');
const uploadsRoutes = require('./routes/uploads.routes');
const paymentsRoutes = require('./routes/payments.routes');
const { getUploadsRoot } = require('./config/uploads');

// Import database connection
const { db } = require('./config/db');

const app = express();
const PORT = process.env.PORT || 3000;
const uploadsRoot = getUploadsRoot();

const parseEnvInt = (value, fallback) => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const uploadMaxFileSizeMb = parseEnvInt(process.env.UPLOAD_MAX_FILE_SIZE_MB, 100);
const computedBodyLimitMb = Math.ceil(uploadMaxFileSizeMb * 1.37) + 10;
const requestBodyLimitMb = parseEnvInt(process.env.REQUEST_BODY_LIMIT_MB, computedBodyLimitMb);
const requestBodyLimit = `${requestBodyLimitMb}mb`;

// Security middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// ---------- CORS FIX ----------
const defaultAllowedOrigins = [
  'http://localhost:5173',
  'http://localhost:8080',
  'http://localhost:8081',
  'http://localhost:8082',
  'http://localhost:8083',
  'http://localhost:3000',
];

const envAllowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedOrigins = [...new Set([...defaultAllowedOrigins, ...envAllowedOrigins])];

app.use(
  cors({
    origin: function (origin, callback) {
      // allow requests with no origin (like Postman)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ---------- RATE LIMIT ----------
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: {
    success: false,
    message: 'Too many API requests from this IP, please try again later.',
  },
});

// ---------- BODY PARSING ----------
app.use(express.json({ limit: requestBodyLimit }));
app.use(express.urlencoded({ extended: true, limit: requestBodyLimit }));

// ---------- STATIC FILES ----------
app.use('/uploads', express.static(uploadsRoot));

// ---------- HEALTH CHECK ----------
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'ZetechVerse API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// ---------- API ROUTES ----------
app.use('/api/auth', apiLimiter, authRoutes);
app.use('/api/opportunities', apiLimiter, opportunitiesRoutes);
app.use('/api/marketplace', apiLimiter, marketplaceRoutes);
app.use('/api/marketplace-comments', apiLimiter, marketplaceCommentsRoutes);
app.use('/api/posts', apiLimiter, postsRoutes);
app.use('/api/events', apiLimiter, eventsRoutes);
app.use('/api/confessions', apiLimiter, confessionsRoutes);
app.use('/api/messages', apiLimiter, messagesRoutes);
app.use('/api/notifications', apiLimiter, notificationsRoutes);
app.use('/api/analytics', apiLimiter, analyticsRoutes);
app.use('/api/comments', apiLimiter, commentsRoutes);
app.use('/api/uploads', apiLimiter, uploadsRoutes);
app.use('/api/payments', apiLimiter, paymentsRoutes);

// ---------- 404 HANDLER ----------
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint not found: ${req.method} ${req.originalUrl}`,
  });
});

// ---------- GLOBAL ERROR HANDLER ----------
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);

  if (error.type === 'entity.too.large' || error.status === 413) {
    return res.status(413).json({
      success: false,
      message: `Payload too large. Maximum request size is ${requestBodyLimit}.`,
    });
  }

  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: error.errors,
    });
  }

  if (error.code && error.code.startsWith('SQLITE_')) {
    return res.status(500).json({
      success: false,
      message: 'Database error occurred',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }

  res.status(error.status || 500).json({
    success: false,
    message: error.message || 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
  });
});

// ---------- START SERVER ----------
app.listen(PORT, () => {
  console.log(`🚀 ZetechVerse API server is running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});

// ---------- GRACEFUL SHUTDOWN ----------
process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT. Gracefully shutting down...');
  db.close((err) => {
    if (err) console.error('Error closing database:', err.message);
    else console.log('✅ Database connection closed.');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM. Gracefully shutting down...');
  db.close((err) => {
    if (err) console.error('Error closing database:', err.message);
    else console.log('✅ Database connection closed.');
    process.exit(0);
  });
});

module.exports = app;
