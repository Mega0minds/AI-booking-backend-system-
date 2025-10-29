const express = require('express');
const {
  getBookings,
  getBooking,
  createBooking,
  updateBooking,
  deleteBooking,
  getBookingStats,
  checkAvailability
} = require('../controllers/bookings');

const router = express.Router();

// @route   GET /api/bookings
// @desc    Get all bookings with optional filtering
// @access  Public
router.get('/', getBookings);

// @route   GET /api/bookings/stats
// @desc    Get booking statistics
// @access  Public
router.get('/stats', getBookingStats);

// @route   GET /api/bookings/availability/:hotelId
// @desc    Check hotel availability
// @access  Public
router.get('/availability/:hotelId', checkAvailability);

// @route   GET /api/bookings/:id
// @desc    Get single booking
// @access  Public
router.get('/:id', getBooking);

// @route   POST /api/bookings
// @desc    Create new booking
// @access  Public
router.post('/', createBooking);

// @route   PUT /api/bookings/:id
// @desc    Update booking
// @access  Public
router.put('/:id', updateBooking);

// @route   DELETE /api/bookings/:id
// @desc    Delete booking
// @access  Public
router.delete('/:id', deleteBooking);

module.exports = router;