// Role-based access control middleware

const requireRole = (requiredRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const userRole = req.user.role;
    const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];

    if (!roles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }

    next();
  };
};

// Specific role checks
const requireAdmin = requireRole(['admin', 'super_admin']);
const requireSuperAdmin = requireRole('super_admin');
const requireUserOrAdmin = requireRole(['user', 'admin', 'super_admin']);

module.exports = {
  requireRole,
  requireAdmin,
  requireSuperAdmin,
  requireUserOrAdmin
};
