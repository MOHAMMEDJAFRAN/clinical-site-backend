const jwt = require('jsonwebtoken');
const userModel = require('../models/userModel');
const merchntodel = require('../models/clinical.model');
const Staff = require('../models/staff.model');

/**
 * @desc    Protect routes with JWT authentication
 * @param   {string} [role] - Optional required role (e.g., 'merchant', 'admin', 'staff')
 */
const authMiddleware = async (req, res, next) => {
  try {
    // 1) Get token from header or cookies
    let token;
    if (req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    } else if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
      });
    }

    // 2) Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 3) Check if user still exists using Mongoose
    const currentUser = await userModel.findById(decoded.id);
    if (!currentUser) {
      return res.status(401).json({
        success: false,
        message: 'User belonging to this token no longer exists.',
      });
    }

    // 4) Check if role is required (if middleware is called with a role parameter)
    if (req.requiredRole && currentUser.role !== req.requiredRole) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Requires ${req.requiredRole} role.`,
      });
    }

    // 5) Additional checks for merchants
    if (currentUser.role === 'merchant') {
      const merchant = await merchntodel.findOne({ user: currentUser._id });
      
      if (!merchant) {
        return res.status(403).json({
          success: false,
          message: 'Merchant profile not found',
        });
      }

      // Attach merchant profile to request
      req.merchant = merchant;
    }

    // 6) Additional checks for staff
    if (currentUser.role === 'staff') {
      const staff = await Staff.findOne({ user: currentUser._id });
      
      if (!staff) {
        return res.status(403).json({
          success: false,
          message: 'Staff profile not found',
        });
      }

      // Attach staff profile to request
      req.staff = staff;
    }

    // Attach user to request
    req.user = currentUser;
    next();
  } catch (err) {
    console.error('Authentication error:', err);
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
      error: err.message,
    });
  }
};

/**
 * @desc    Role-based access control wrapper
 */
const requireRole = (role) => {
  return (req, res, next) => {
    req.requiredRole = role;
    authMiddleware(req, res, next);
  };
};

module.exports = {
  authMiddleware,       // General authentication
  requireRole,          // Role-specific authentication
  merchantAuth: requireRole('merchant'),  // Pre-configured for merchants
  adminAuth: requireRole('admin'),        // Pre-configured for admins
  staffAuth: requireRole('staff')         // Pre-configured for staff
};