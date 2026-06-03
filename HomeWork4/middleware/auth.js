const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; 

    if (!token) {
      return res.status(401).json({ message: 'Access token required' });
    }

    jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
      if (err) {
        return res.status(403).json({ message: 'Invalid or expired token' });
      }

      
      const user = await User.findById(decoded.id);
      if (!user || !user.isActive) {
        return res.status(401).json({ message: 'User not found or inactive' });
      }

      req.user = user;
      req.userId = decoded.id;
      next();
    });
  } catch (error) {
    res.status(500).json({ message: 'Authentication error', error: error.message });
  }
};

const authorizeRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Access denied. Required role(s): ${allowedRoles.join(', ')}`,
      });
    }

    next();
  };
};

const authorizePermission = (...allowedPermissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    
    if (req.user.role === 'admin') {
      return next();
    }

    const { ROLE_PERMISSIONS } = require('../config/permissions');
    const userPermissions = ROLE_PERMISSIONS[req.user.role] || [];

    const hasPermission = allowedPermissions.some((permission) =>
      userPermissions.includes(permission)
    );

    if (!hasPermission) {
      return res.status(403).json({
        message: `Access denied. Required permission(s): ${allowedPermissions.join(', ')}`,
      });
    }

    next();
  };
};

module.exports = {
  authenticateToken,
  authorizeRole,
  authorizePermission,
};
