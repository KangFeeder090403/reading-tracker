const express = require('express');
const router = express.Router();
const bookController = require('../controllers/bookController');
const auth = require('../middleware/auth');

// @route   GET api/books/search
// @desc    Search for books using Google Books API
// @access  Private (user must be logged in to search)
router.get('/search', auth, bookController.search);

module.exports = router; 