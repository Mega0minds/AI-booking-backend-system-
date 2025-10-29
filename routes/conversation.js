const express = require('express');
const {
  startConversation,
  sendMessage,
  completeBooking,
  searchHotels,
  forceCompleteBooking,
  testCompleteBooking
} = require('../controllers/conversation');

const router = express.Router();

// @route   POST /api/conversation/start
// @desc    Start a new conversation session
// @access  Public
router.post('/start', startConversation);

// @route   POST /api/conversation/message
// @desc    Send a message in the conversation
// @access  Public
router.post('/message', sendMessage);

// @route   POST /api/conversation/complete-booking
// @desc    Complete booking from conversation
// @access  Public
router.post('/complete-booking', completeBooking);

// @route   POST /api/conversation/search-hotels
// @desc    Search hotels for recommendations
// @access  Public
router.post('/search-hotels', searchHotels);

// @route   POST /api/conversation/force-complete
// @desc    Force complete booking when all info is collected
// @access  Public
router.post('/force-complete', forceCompleteBooking);

// @route   POST /api/conversation/test-complete
// @desc    Test endpoint to manually complete booking
// @access  Public
router.post('/test-complete', testCompleteBooking);

module.exports = router;
