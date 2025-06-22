const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const auth = require('../middleware/auth');

// All routes in this file are protected and require authentication
router.use(auth);

// @route   POST api/reading-list
// @desc    Add a book to the user's reading list
// @access  Private
router.post('/', userController.addBookToReadingList);

// @route   GET api/reading-list
// @desc    Get the user's reading list
// @access  Private
router.get('/', userController.getReadingList);

// @route   GET api/reading-list/:listItemId
// @desc    Get a single item from the user's reading list
// @access  Private
router.get('/:listItemId', userController.getReadingListItem);

// @route   PUT api/reading-list/:listItemId
// @desc    Update an item in the user's reading list
// @access  Private
router.put('/:listItemId', userController.updateReadingListItem);

// @route   DELETE api/reading-list/:listItemId
// @desc    Delete an item from the user's reading list
// @access  Private
router.delete('/:listItemId', userController.deleteReadingListItem);

module.exports = router; 