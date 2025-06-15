// routes/complaintRoutes.js
const express = require('express');
const router = express.Router();
const complaintController = require('../controllers/admin/compleintController');

// Get all complaints for a merchant
router.get('/merchant/:merchantId', complaintController.getComplaints);

// Get complaints by status for a merchant
router.get('/merchant/:merchantId/status/:status', complaintController.getComplaintsByStatus);

// Get a single complaint
router.get('/:complaintId', complaintController.getComplaintById);

// Create a new complaint
router.post('/merchant/:merchantId', complaintController.createComplaint);

// Update complaint status
router.patch('/:complaintId/status', complaintController.updateComplaintStatus);

// Add a note to a complaint
router.post('/:complaintId/notes', complaintController.addNoteToComplaint);

// Assign a complaint to a user
router.patch('/:complaintId/assign', complaintController.assignComplaint);

// Update a complaint
router.put('/:complaintId', complaintController.updateComplaint);

// Delete a complaint
router.delete('/:complaintId', complaintController.deleteComplaint);

// Get complaint statistics
router.get('/stats/merchant/:merchantId', complaintController.getComplaintStats);

module.exports = router;