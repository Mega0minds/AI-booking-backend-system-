const express = require('express');
const {
  getHotels,
  getHotel,
  searchHotels,
  getHotelsInRadius,
  getHotelStats
} = require('../controllers/hotels');

const router = express.Router();

// @route   GET /api/hotels
// @desc    Get all hotels with optional filtering
// @access  Public
router.get('/', getHotels);

// @route   GET /api/hotels/search
// @desc    Search hotels by name or location
// @access  Public
router.get('/search', searchHotels);

// @route   GET /api/hotels/stats
// @desc    Get hotel statistics
// @access  Public
router.get('/stats', getHotelStats);

// @route   GET /api/hotels/radius/:zipcode/:distance
// @desc    Get hotels within a radius
// @access  Public
router.get('/radius/:zipcode/:distance', getHotelsInRadius);

// @route   GET /api/hotels/:id
// @desc    Get single hotel
// @access  Public
router.get('/:id', getHotel);

module.exports = router;