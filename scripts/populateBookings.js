/**
 * Script to populate Firestore database with sample booking data
 */
require('dotenv').config();
const { initializeFirebase, getFirestore } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

// Initialize Firebase
initializeFirebase();
const db = getFirestore();

async function populateBookings() {
  try {
    console.log('🚀 Starting to populate bookings database...');
    
    // Sample booking data
    const sampleBookings = [
      {
        id: uuidv4(),
        guestName: 'John Smith',
        guestEmail: 'john.smith@email.com',
        guestPhone: '+1-555-0123',
        hotelId: 'LAG001',
        hotelName: 'Lagos Marriott Hotel Ikeja',
        location: 'Lagos',
        checkInDate: '2024-10-25',
        checkOutDate: '2024-10-28',
        roomType: 'Deluxe',
        guestCount: {
          adults: 2,
          children: 0
        },
        totalNights: 3,
        pricePerNight: 500,
        totalAmount: 1500,
        status: 'confirmed',
        preferences: 'Near airport',
        createdAt: new Date('2024-10-19T10:00:00Z'),
        updatedAt: new Date('2024-10-19T10:00:00Z')
      },
      {
        id: uuidv4(),
        guestName: 'Sarah Johnson',
        guestEmail: 'sarah.j@email.com',
        guestPhone: '+234-801-234-5678',
        hotelId: 'NAI001',
        hotelName: 'Nairobi Marriott Hotel',
        location: 'Nairobi',
        checkInDate: '2024-11-15',
        checkOutDate: '2024-11-18',
        roomType: 'Suite',
        guestCount: {
          adults: 1,
          children: 1
        },
        totalNights: 3,
        pricePerNight: 400,
        totalAmount: 1200,
        status: 'pending',
        preferences: 'Pool access',
        createdAt: new Date('2024-10-18T14:30:00Z'),
        updatedAt: new Date('2024-10-18T14:30:00Z')
      },
      {
        id: uuidv4(),
        guestName: 'Michael Brown',
        guestEmail: 'm.brown@email.com',
        guestPhone: '+27-21-555-7890',
        hotelId: 'CPT001',
        hotelName: 'Cape Town Marriott Hotel',
        location: 'Cape Town',
        checkInDate: '2024-12-05',
        checkOutDate: '2024-12-10',
        roomType: 'Standard',
        guestCount: {
          adults: 2,
          children: 0
        },
        totalNights: 5,
        pricePerNight: 600,
        totalAmount: 3000,
        status: 'confirmed',
        preferences: 'Ocean view',
        createdAt: new Date('2024-10-17T09:15:00Z'),
        updatedAt: new Date('2024-10-17T09:15:00Z')
      }
    ];

    console.log(`📊 Adding ${sampleBookings.length} sample bookings...`);

    // Add bookings to database
    const bookingsRef = db.collection('bookings');
    
    for (const booking of sampleBookings) {
      await bookingsRef.doc(booking.id).set(booking);
      console.log(`✅ Added booking for: ${booking.guestName} at ${booking.hotelName}`);
    }

    console.log('🎉 Successfully populated bookings database!');
    
    // Verify the data
    const snapshot = await bookingsRef.get();
    console.log(`✅ Verification: ${snapshot.size} bookings in database`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error populating bookings:', error);
    process.exit(1);
  }
}

// Run the script
populateBookings();

