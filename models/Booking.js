const { getFirestore } = require('../config/database');

class Booking {
  constructor(data) {
    this.sessionId = data.sessionId || '';
    this.hotelId = data.hotelId || '';
    this.hotelName = data.hotelName || '';
    this.guestName = data.guestName || '';
    this.guestEmail = data.guestEmail || '';
    this.guestPhone = data.guestPhone || '';
    this.checkIn = data.checkIn || null;
    this.checkOut = data.checkOut || null;
    this.guests = data.guests || 1;
    this.rooms = data.rooms || 1;
    this.totalAmount = data.totalAmount || 0;
    this.status = data.status || 'pending'; // pending, confirmed, cancelled, completed
    this.specialRequests = data.specialRequests || '';
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  // Static method to create a new booking
  static async create(bookingData) {
    try {
      const db = getFirestore();
      
      // Add timestamps
      const now = new Date();
      bookingData.createdAt = now;
      bookingData.updatedAt = now;
      bookingData.status = bookingData.status || 'pending';

      const docRef = await db.collection('bookings').add(bookingData);
      
      return {
        id: docRef.id,
        ...bookingData
      };
    } catch (error) {
      throw new Error(`Error creating booking: ${error.message}`);
    }
  }

  // Static method to get all bookings with filtering
  static async find(query = {}) {
    try {
      const db = getFirestore();
      let bookingsRef = db.collection('bookings');

      // Apply filters
      if (query.sessionId) {
        bookingsRef = bookingsRef.where('sessionId', '==', query.sessionId);
      }
      if (query.hotelId) {
        bookingsRef = bookingsRef.where('hotelId', '==', query.hotelId);
      }
      if (query.status) {
        bookingsRef = bookingsRef.where('status', '==', query.status);
      }
      if (query.guestEmail) {
        bookingsRef = bookingsRef.where('guestEmail', '==', query.guestEmail);
      }
      if (query.checkInStart && query.checkInEnd) {
        bookingsRef = bookingsRef
          .where('checkIn', '>=', new Date(query.checkInStart))
          .where('checkIn', '<=', new Date(query.checkInEnd));
      }

      // Apply pagination
      if (query.page && query.limit) {
        const page = parseInt(query.page) || 1;
        const limit = parseInt(query.limit) || 10;
        const offset = (page - 1) * limit;
        bookingsRef = bookingsRef.offset(offset).limit(limit);
      } else if (query.limit) {
        bookingsRef = bookingsRef.limit(parseInt(query.limit));
      }

      // Order by creation date (newest first)
      bookingsRef = bookingsRef.orderBy('createdAt', 'desc');

      const snapshot = await bookingsRef.get();
      const bookings = [];
      
      snapshot.forEach(doc => {
        bookings.push({
          id: doc.id,
          ...doc.data()
        });
      });

      return bookings;
    } catch (error) {
      throw new Error(`Error fetching bookings: ${error.message}`);
    }
  }

  // Static method to find booking by ID
  static async findById(id) {
    try {
      const db = getFirestore();
      const doc = await db.collection('bookings').doc(id).get();
      
      if (!doc.exists) {
        return null;
      }
      
      return {
        id: doc.id,
        ...doc.data()
      };
    } catch (error) {
      throw new Error(`Error finding booking: ${error.message}`);
    }
  }

  // Static method to get bookings by session ID
  static async findBySessionId(sessionId) {
    try {
      const db = getFirestore();
      let bookingsRef = db.collection('bookings')
        .where('sessionId', '==', sessionId)
        .orderBy('createdAt', 'desc');

      const snapshot = await bookingsRef.get();
      const bookings = [];
      
      snapshot.forEach(doc => {
        bookings.push({
          id: doc.id,
          ...doc.data()
        });
      });

      return bookings;
    } catch (error) {
      throw new Error(`Error finding bookings by session: ${error.message}`);
    }
  }

  // Static method to update booking
  static async findByIdAndUpdate(id, updateData, options = {}) {
    try {
      const db = getFirestore();
      
      // Add updatedAt timestamp
      updateData.updatedAt = new Date();
      
      const docRef = db.collection('bookings').doc(id);
      
      if (options.new) {
        // Return updated document
        await docRef.update(updateData);
        const doc = await docRef.get();
        return {
          id: doc.id,
          ...doc.data()
        };
      } else {
        // Just update without returning
        await docRef.update(updateData);
        return { id, ...updateData };
      }
    } catch (error) {
      throw new Error(`Error updating booking: ${error.message}`);
    }
  }

  // Static method to delete booking
  static async findByIdAndDelete(id) {
    try {
      const db = getFirestore();
      await db.collection('bookings').doc(id).delete();
      return true;
    } catch (error) {
      throw new Error(`Error deleting booking: ${error.message}`);
    }
  }

  // Static method to get booking statistics
  static async getStats(options = {}) {
    try {
      const db = getFirestore();
      let bookingsRef = db.collection('bookings');

      // Apply date filter if provided
      if (options.startDate && options.endDate) {
        bookingsRef = bookingsRef
          .where('createdAt', '>=', new Date(options.startDate))
          .where('createdAt', '<=', new Date(options.endDate));
      }

      const snapshot = await bookingsRef.get();
      
      let totalBookings = 0;
      let totalRevenue = 0;
      let statusCounts = {
        pending: 0,
        confirmed: 0,
        cancelled: 0,
        completed: 0
      };
      
      snapshot.forEach(doc => {
        const booking = doc.data();
        totalBookings++;
        totalRevenue += booking.totalAmount || 0;
        
        // Count by status
        if (statusCounts.hasOwnProperty(booking.status)) {
          statusCounts[booking.status]++;
        }
      });
      
      return {
        totalBookings,
        totalRevenue,
        statusCounts,
        averageBookingValue: totalBookings > 0 ? totalRevenue / totalBookings : 0
      };
    } catch (error) {
      throw new Error(`Error getting booking stats: ${error.message}`);
    }
  }

  // Static method to check room availability
  static async checkAvailability(hotelId, checkIn, checkOut) {
    try {
      const db = getFirestore();
      
      // Get all bookings for the hotel that overlap with the requested dates
      const snapshot = await db.collection('bookings')
        .where('hotelId', '==', hotelId)
        .where('status', 'in', ['confirmed', 'pending'])
        .get();

      let totalBookedRooms = 0;
      
      snapshot.forEach(doc => {
        const booking = doc.data();
        
        // Check if booking dates overlap with requested dates
        if (this.datesOverlap(booking.checkIn.toDate(), booking.checkOut.toDate(), 
                             new Date(checkIn), new Date(checkOut))) {
          totalBookedRooms += booking.rooms || 1;
        }
      });

      // Get hotel details to check total rooms
      const hotelDoc = await db.collection('hotels').doc(hotelId).get();
      const hotel = hotelDoc.data();
      const totalRooms = hotel.totalRooms || 100; // Default to 100 if not specified

      return {
        available: Math.max(0, totalRooms - totalBookedRooms),
        totalRooms,
        bookedRooms: totalBookedRooms
      };
    } catch (error) {
      throw new Error(`Error checking availability: ${error.message}`);
    }
  }

  // Helper method to check if two date ranges overlap
  static datesOverlap(start1, end1, start2, end2) {
    return start1 < end2 && start2 < end1;
  }
}

module.exports = Booking;