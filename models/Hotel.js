const { getFirestore } = require('../config/database');

class Hotel {
  constructor(data) {
    this.id = data.id || '';
    this.name = data.name || '';
    this.brand = data.brand || '';
    this.location = data.location || '';
    this.address = data.address || '';
    this.latitude = data.latitude || 0;
    this.longitude = data.longitude || 0;
    this.price_per_night = data.price_per_night || 0;
    this.star_rating = data.star_rating || 0;
    this.airport_distance_km = data.airport_distance_km || 0;
    this.room_types = data.room_types || [];
    this.image_url = data.image_url || '';
    this.amenities = data.amenities || [];
    this.availableRooms = data.availableRooms || {
      standard: 10,
      deluxe: 8,
      suite: 5
    };
    this.isActive = data.isActive !== undefined ? data.isActive : true;
    this.isBooked = data.isBooked !== undefined ? data.isBooked : false;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  // Static method to create a new hotel
  static async create(hotelData) {
    try {
      const db = getFirestore();
      
      // Add timestamps
      const now = new Date();
      hotelData.createdAt = now;
      hotelData.updatedAt = now;
      hotelData.isActive = hotelData.isActive !== undefined ? hotelData.isActive : true;
      hotelData.rating = hotelData.rating || 0;
      hotelData.numReviews = hotelData.numReviews || 0;
      hotelData.amenities = hotelData.amenities || [];
      hotelData.images = hotelData.images || [];
      hotelData.totalRooms = hotelData.totalRooms || 100;

      const docRef = await db.collection('hotels').add(hotelData);
      
      return {
        id: docRef.id,
        ...hotelData
      };
    } catch (error) {
      throw new Error(`Error creating hotel: ${error.message}`);
    }
  }

  // Static method to get all hotels with filtering
  static async find(query = {}) {
    try {
      const db = getFirestore();
      let hotelsRef = db.collection('hotels');

      // Apply filters
      if (query.city) {
        hotelsRef = hotelsRef.where('city', '==', query.city);
      }
      if (query.state) {
        hotelsRef = hotelsRef.where('state', '==', query.state);
      }
      if (query.country) {
        hotelsRef = hotelsRef.where('country', '==', query.country);
      }
      if (query.isActive !== undefined) {
        hotelsRef = hotelsRef.where('isActive', '==', query.isActive);
      }
      if (query.minPrice !== undefined) {
        hotelsRef = hotelsRef.where('pricePerNight', '>=', query.minPrice);
      }
      if (query.maxPrice !== undefined) {
        hotelsRef = hotelsRef.where('pricePerNight', '<=', query.maxPrice);
      }

      // Apply pagination
      if (query.page && query.limit) {
        const page = parseInt(query.page) || 1;
        const limit = parseInt(query.limit) || 10;
        const offset = (page - 1) * limit;
        hotelsRef = hotelsRef.offset(offset).limit(limit);
      } else if (query.limit) {
        hotelsRef = hotelsRef.limit(parseInt(query.limit));
      }

      const snapshot = await hotelsRef.get();
      const hotels = [];
      
      snapshot.forEach(doc => {
        hotels.push({
          id: doc.id,
          ...doc.data()
        });
      });

      return hotels;
    } catch (error) {
      throw new Error(`Error fetching hotels: ${error.message}`);
    }
  }

  // Static method to find hotel by ID
  static async findById(id) {
    try {
      const db = getFirestore();
      const doc = await db.collection('hotels').doc(id).get();
      
      if (!doc.exists) {
        return null;
      }
      
      return {
        id: doc.id,
        ...doc.data()
      };
    } catch (error) {
      throw new Error(`Error finding hotel: ${error.message}`);
    }
  }

  // Static method to search hotels by name or city
  static async search(searchTerm) {
    try {
      const db = getFirestore();
      const hotelsRef = db.collection('hotels');
      const snapshot = await hotelsRef.where('isActive', '==', true).get();
      
      const hotels = [];
      const searchLower = searchTerm.toLowerCase();
      
      snapshot.forEach(doc => {
        const hotel = doc.data();
        const nameMatch = hotel.name.toLowerCase().includes(searchLower);
        const cityMatch = hotel.city.toLowerCase().includes(searchLower);
        const addressMatch = hotel.address.toLowerCase().includes(searchLower);
        
        if (nameMatch || cityMatch || addressMatch) {
          hotels.push({
            id: doc.id,
            ...hotel
          });
        }
      });

      return hotels;
    } catch (error) {
      throw new Error(`Error searching hotels: ${error.message}`);
    }
  }

  // Static method to find hotels within radius
  static async findByRadius(latitude, longitude, radius) {
    try {
      const db = getFirestore();
      const hotelsRef = db.collection('hotels');
      const snapshot = await hotelsRef.where('isActive', '==', true).get();
      
      const hotels = [];
      snapshot.forEach(doc => {
        const hotel = doc.data();
        if (hotel.location) {
          // Calculate distance (simplified - use proper geospatial calculation in production)
          const distance = this.calculateDistance(
            latitude,
            longitude,
            hotel.location.latitude,
            hotel.location.longitude
          );
          
          if (distance <= radius) {
            hotels.push({
              id: doc.id,
              ...hotel,
              distance
            });
          }
        }
      });

      return hotels.sort((a, b) => a.distance - b.distance);
    } catch (error) {
      throw new Error(`Error finding hotels by radius: ${error.message}`);
    }
  }

  // Helper method to calculate distance between two coordinates
  static calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in kilometers
    return d;
  }

  static deg2rad(deg) {
    return deg * (Math.PI / 180);
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

  // Static method to get hotel statistics
  static async getStats() {
    try {
      const db = getFirestore();
      const snapshot = await db.collection('hotels').get();
      
      let totalHotels = 0;
      let totalRevenue = 0;
      let averageRating = 0;
      let totalReviews = 0;
      
      snapshot.forEach(doc => {
        const hotel = doc.data();
        totalHotels++;
        totalRevenue += hotel.pricePerNight || 0;
        totalReviews += hotel.numReviews || 0;
        averageRating += (hotel.rating || 0) * (hotel.numReviews || 0);
      });
      
      return {
        totalHotels,
        totalRevenue,
        averageRating: totalReviews > 0 ? averageRating / totalReviews : 0,
        totalReviews
      };
    } catch (error) {
      throw new Error(`Error getting hotel stats: ${error.message}`);
    }
  }
}

module.exports = Hotel;