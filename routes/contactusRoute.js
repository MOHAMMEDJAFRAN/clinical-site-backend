// routes/contactRoutes.js
const express = require('express');
const router = express.Router();
const contactController = require('../controllers/user/contactusController');

// Public routes
router.post('/contactus', contactController.createContact);

// Admin routes
router.get('/contactus', contactController.getContacts);
router.patch('/contactus/:id', contactController.updateContactStatus);

module.exports = router;