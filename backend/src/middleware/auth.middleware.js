const jwt = require('jsonwebtoken');

const { get } = require('../config/db');



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



    // Check if user still exists and is active

    const user = await get('SELECT id, email, username, role, is_active, admin_status FROM users WHERE id = ?', [decoded.userId]);



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

    const user = await get('SELECT id, email, username, role, is_active, admin_status FROM users WHERE id = ?', [decoded.userId]);



    if (user && user.is_active && (user.role !== 'admin' || user.admin_status === 'approved')) {

      req.user = user;

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

