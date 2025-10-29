const Hotel = require('../models/Hotel');
const { getFirestore } = require('../config/database');
const fs = require('fs');
const path = require('path');

// Load hotel data from JSON file
const loadHotelData = () => {
  try {
    const hotelsPath = path.join(__dirname, '../data/hotels.json');
    const hotelsData = fs.readFileSync(hotelsPath, 'utf8');
    return JSON.parse(hotelsData);
  } catch (error) {
    console.error('Error loading hotel data:', error);
    return [];
  }
};

// Cache hotel data
const hotelsData = loadHotelData();

// @desc    Get all hotels
// @route   GET /api/hotels
// @access  Public
exports.getHotels = async (req, res, next) => {
  try {
    const db = getFirestore();
    let query = db.collection('hotels').where('isActive', '==', true);

    // Apply filters if provided
    if (req.query.location) {
      query = query.where('location', '==', req.query.location);
    }

    if (req.query.brand) {
      query = query.where('brand', '==', req.query.brand);
    }

    const snapshot = await query.get();
    let hotels = [];

    snapshot.forEach(doc => {
      hotels.push({
        id: doc.id,
        ...doc.data()
      });
    });

    // Apply price filters (done in memory since Firestore doesn't support range queries easily)
    if (req.query.min_price) {
      hotels = hotels.filter(hotel => 
        hotel.price_per_night >= parseInt(req.query.min_price)
      );
    }

    if (req.query.max_price) {
      hotels = hotels.filter(hotel => 
        hotel.price_per_night <= parseInt(req.query.max_price)
      );
    }

    res.status(200).json({
      success: true,
      count: hotels.length,
      data: hotels
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single hotel
// @route   GET /api/hotels/:id
// @access  Public
exports.getHotel = async (req, res, next) => {
  try {
    const hotel = await Hotel.findById(req.params.id);

    if (!hotel) {
      return res.status(404).json({
        success: false,
        message: 'Hotel not found'
      });
    }

    res.status(200).json({
      success: true,
      data: hotel
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Search hotels by name or location
// @route   GET /api/hotels/search
// @access  Public
exports.searchHotels = async (req, res, next) => {
  try {
    const { q, city, minPrice, maxPrice } = req.query;

    let hotels = [];

    if (q) {
      hotels = await Hotel.search(q);
    } else if (city) {
      hotels = await Hotel.find({ city, isActive: true });
    } else {
      hotels = await Hotel.find({ isActive: true, limit: 20 });
    }

    // Apply price filters
    if (minPrice || maxPrice) {
      hotels = hotels.filter(hotel => {
        const price = hotel.pricePerNight;
        if (minPrice && price < parseFloat(minPrice)) return false;
        if (maxPrice && price > parseFloat(maxPrice)) return false;
        return true;
      });
    }

    res.status(200).json({
      success: true,
      count: hotels.length,
      data: hotels
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get hotels within a radius
// @route   GET /api/hotels/radius/:zipcode/:distance
// @access  Public
exports.getHotelsInRadius = async (req, res, next) => {
  try {
    const { zipcode, distance } = req.params;

    // For this example, we'll use a default location
    // In a real application, you'd geocode the zipcode to get lat/lng
    const defaultLat = 40.7128; // New York City
    const defaultLng = -74.0060;

    const hotels = await Hotel.findByRadius(defaultLat, defaultLng, distance);

    res.status(200).json({
      success: true,
      count: hotels.length,
      data: hotels
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get hotel statistics
// @route   GET /api/hotels/stats
// @access  Public
exports.getHotelStats = async (req, res, next) => {
  try {
    const stats = await Hotel.getStats();

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};