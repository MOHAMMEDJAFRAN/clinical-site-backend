const express = require('express');
const router = express.Router();
const {
  getAdminProfile,
  updateAdminProfile,
  updateProfileImage,
  changePassword,
  getAdmins,
  createAdmin,
  updateAdmin,
  deleteAdmin
} = require('../controllers/super_admin/adminProfile.comtroller');
const { authMiddleware, requireRole } = require('../middleware/authMiddleware');

// Admin profile routes (accessible to all admin types)
router.route('/profile')
  .get(authMiddleware, requireRole('admin', 'superadmin'), getAdminProfile)
  .put(authMiddleware, requireRole('admin', 'superadmin'), updateAdminProfile);

router.put('/profile-image', 
    authMiddleware, 
    requireRole('admin', 'superadmin'), 
  updateProfileImage);

router.put('/change-password', 
    authMiddleware, 
    requireRole('admin', 'superadmin'), 
  changePassword);

// Admin management routes (superadmin only)
router.route('/')
  .get(authMiddleware, requireRole('superadmin'), getAdmins)
  .post(authMiddleware, requireRole('superadmin'), createAdmin);

router.route('/:id')
  .put(authMiddleware, requireRole('superadmin'), updateAdmin)
  .delete(authMiddleware, requireRole('superadmin'), deleteAdmin);

module.exports = router;