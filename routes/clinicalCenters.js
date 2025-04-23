const express = require('express');
const router = express.Router();
const {
  getClinicalCenters,
  getClinicalCenter,
  createClinicalCenter,
  updateClinicalCenter,
  deleteClinicalCenter,
  updateClinicalCenterStatus
} = require('../controllers/super_admin/clincalCenter.controller');
const { authMiddleware, requireRole } = require('../middleware/authMiddleware');

// All routes are protected and require admin role
router.use(authMiddleware);
router.use(requireRole('admin'));

router.route('/allCenters')
  .get(getClinicalCenters)
  .post(createClinicalCenter);

router.route('/:id')
  .get(getClinicalCenter)
  .put(updateClinicalCenter)
  .delete(deleteClinicalCenter);

router.route('/:id/status')
  .patch(updateClinicalCenterStatus);

module.exports = router;