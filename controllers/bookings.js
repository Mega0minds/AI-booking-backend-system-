const Booking = require('../models/Booking');
const Hotel = require('../models/Hotel');

// @desc    Get all bookings
// @route   GET /api/bookings
// @access  Public
exports.getBookings = async (req, res, next) => {
  try {
    const bookings = await Booking.find(req.query);

    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single booking
// @route   GET /api/bookings/:id
// @access  Public
exports.getBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    res.status(200).json({
      success: true,
      data: booking
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create new booking
// @route   POST /api/bookings
// @access  Public
exports.createBooking = async (req, res, next) => {
  try {
    const {
      sessionId,
      hotelId,
      guestName,
      guestEmail,
      guestPhone,
      checkIn,
      checkOut,
      guests,
      rooms,
      specialRequests
    } = req.body;

    // Validate required fields
    if (!hotelId || !guestName || !guestEmail || !checkIn || !checkOut) {
      return res.status(400).json({
        success: false,
        message: 'Missing required booking information'
      });
    }

    // Check hotel availability
    const availability = await Hotel.checkAvailability(hotelId, checkIn, checkOut);

    if (availability.available < (rooms || 1)) {
      return res.status(400).json({
        success: false,
        message: `Only ${availability.available} rooms available for the selected dates`
      });
    }

    // Get hotel details to calculate total amount
    const hotel = await Hotel.findById(hotelId);
    if (!hotel) {
      return res.status(404).json({
        success: false,
        message: 'Hotel not found'
      });
    }

    // Calculate total amount
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
    const totalAmount = hotel.pricePerNight * nights * (rooms || 1);

    const bookingData = {
      sessionId: sessionId || '',
      hotelId,
      hotelName: hotel.name,
      guestName,
      guestEmail,
      guestPhone: guestPhone || '',
      checkIn: checkInDate,
      checkOut: checkOutDate,
      guests: guests || 1,
      rooms: rooms || 1,
      totalAmount,
      specialRequests: specialRequests || '',
      status: 'confirmed'
    };

    const booking = await Booking.create(bookingData);

    res.status(201).json({
      success: true,
      data: booking
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update booking
// @route   PUT /api/bookings/:id
// @access  Public
exports.updateBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findByIdAndUpdate(req.params.id, req.body, {
      new: true
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    res.status(200).json({
      success: true,
      data: booking
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete booking
// @route   DELETE /api/bookings/:id
// @access  Public
exports.deleteBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    await Booking.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Booking deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get booking statistics
// @route   GET /api/bookings/stats
// @access  Public
exports.getBookingStats = async (req, res, next) => {
  try {
    const stats = await Booking.getStats(req.query);

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

// @desc    Check hotel availability
// @route   GET /api/bookings/availability/:hotelId
// @access  Public
exports.checkAvailability = async (req, res, next) => {
  try {
    const { hotelId } = req.params;
    const { checkIn, checkOut } = req.query;

    if (!checkIn || !checkOut) {
      return res.status(400).json({
        success: false,
        message: 'Check-in and check-out dates are required'
      });
    }

    const availability = await Hotel.checkAvailability(hotelId, checkIn, checkOut);

    res.status(200).json({
      success: true,
      data: availability
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};