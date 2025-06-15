const express = require('express');
const router = express.Router();
const queryController = require('../controllers/super_admin/QueryController');



// Get all queries (clinical or user)
router.get('/all', queryController.getAllQueries);

// Get single query by ID
router.get('/:type/:id', queryController.getQueryById);

// Update query status
router.put('/:type/:id/status', queryController.updateQueryStatus);

// Add reply to query
router.post('/:type/:id/reply', queryController.addReplyToQuery);

module.exports = router;