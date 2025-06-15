const express = require('express');
const router = express.Router();
const centersController = require('../controllers/admin/layoutController');
const { check } = require('express-validator');

// Clinic Notifications
router.get('/notifications/:clinicId', centersController.getClinicNotifications);
router.post('/notifications/mark-read', centersController.markNotificationsAsRead);
router.delete('/notifications/clear-all', centersController.clearAllNotifications);

// Clinic Profile
router.get('/profile/:clinicId', centersController.getClinicProfile);

module.exports = router;