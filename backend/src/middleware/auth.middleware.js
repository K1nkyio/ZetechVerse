const jwt = require('jsonwebtoken');

const { get } = require('../config/db');
const { ensureAuthSecuritySchema, validateAuthSession } = require('../utils/authSecurity');



// Verify JWT token

const authenticateToken = async (req, res, next) => {

  const authHeader = req.headers['authorization'];

  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN



  if (!token) {

    return res.status(401).json({

      success: false,

      message: 'Access token is required'

    });

  }



  try {

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-super-secret-jwt-key');
    await ensureAuthSecuritySchema();



    // Check if user still exists and is active

    const user = await get('SELECT id, email, username, role, is_active, admin_status, session_invalidated_at FROM users WHERE id = ?', [decoded.userId]);



    if (!user) {

      return res.status(401).json({

        success: false,

        message: 'User not found'

      });

    }



    if (!user.is_active) {

      return res.status(401).json({

        success: false,

        message: 'Account is deactivated'

      });

    }

    if (user.role === 'admin' && user.admin_status !== 'approved') {
      return res.status(401).json({
        success: false,
        message: 'Admin account not approved'
      });
    }

    const tokenIssuedAtMs = decoded.iat ? decoded.iat * 1000 : 0;
    const invalidatedAtMs = user.session_invalidated_at ? new Date(user.session_invalidated_at).getTime() : 0;
    if (invalidatedAtMs && tokenIssuedAtMs && tokenIssuedAtMs <= invalidatedAtMs) {
      return res.status(401).json({
        success: false,
        message: 'Session has expired. Please log in again.'
      });
    }

    const sessionIsActive = await validateAuthSession({
      sessionId: decoded.sessionId,
      userId: user.id
    });

    if (!sessionIsActive) {
      return res.status(401).json({
        success: false,
        message: 'Session has expired. Please log in again.'
      });
    }

    req.auth = {
      sessionId: decoded.sessionId || null
    };
    req.user = user;

    next();

  } catch (error) {

    if (error.name === 'TokenExpiredError') {

      return res.status(401).json({

        success: false,

        message: 'Token has expired'

      });

    } else if (error.name === 'JsonWebTokenError') {

      return res.status(401).json({

        success: false,

        message: 'Invalid token'

      });

    } else {

      return res.status(500).json({

        success: false,

        message: 'Authentication error'

      });

    }

  }

};



// Optional authentication (for endpoints that work with or without auth)

const optionalAuth = async (req, res, next) => {

  const authHeader = req.headers['authorization'];

  const token = authHeader && authHeader.split(' ')[1];



  if (!token) {

    req.user = null;

    return next();

  }



  try {

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-super-secret-jwt-key');
    await ensureAuthSecuritySchema();

    const user = await get('SELECT id, email, username, role, is_active, admin_status, session_invalidated_at FROM users WHERE id = ?', [decoded.userId]);

    const tokenIssuedAtMs = decoded.iat ? decoded.iat * 1000 : 0;
    const invalidatedAtMs = user?.session_invalidated_at ? new Date(user.session_invalidated_at).getTime() : 0;
    const sessionIsActive = user
      ? await validateAuthSession({ sessionId: decoded.sessionId, userId: user.id })
      : false;

    if (
      user
      && user.is_active
      && (user.role !== 'admin' || user.admin_status === 'approved')
      && (!invalidatedAtMs || !tokenIssuedAtMs || tokenIssuedAtMs > invalidatedAtMs)
      && sessionIsActive
    ) {

      req.user = user;
      req.auth = {
        sessionId: decoded.sessionId || null
      };

    } else {

      req.user = null;

    }

    next();

  } catch (error) {

    req.user = null;

    next();

  }

};



module.exports = {

  authenticateToken,

  optionalAuth

};
