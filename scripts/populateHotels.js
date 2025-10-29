/**
 * Script to populate Firestore database with hotel data
 */
require('dotenv').config();
const { initializeFirebase, getFirestore } = require('../config/database');
const fs = require('fs');
const path = require('path');

// Initialize Firebase
initializeFirebase();
const db = getFirestore();

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

async function populateHotels() {
  try {
    console.log('🚀 Starting to populate hotels database...');
    
    const hotelsData = loadHotelData();
    
    if (hotelsData.length === 0) {
      console.error('❌ No hotel data found to populate');
      return;
    }

    console.log(`📊 Found ${hotelsData.length} hotels to add`);

    // Clear existing hotels collection (optional - remove this if you want to keep existing data)
    console.log('🧹 Clearing existing hotels...');
    const existingHotels = await db.collection('hotels').get();
    const batch = db.batch();
    
    existingHotels.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    if (existingHotels.size > 0) {
      await batch.commit();
      console.log(`🗑️ Cleared ${existingHotels.size} existing hotels`);
    }

    // Add hotels to database
    console.log('➕ Adding hotels to database...');
    const hotelsRef = db.collection('hotels');
    
    for (const hotel of hotelsData) {
      // Add additional fields for booking management
      const hotelData = {
        ...hotel,
        isActive: true,
        isBooked: false,
        availableRooms: {
          standard: 10,
          deluxe: 8,
          suite: 5
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await hotelsRef.add(hotelData);
      console.log(`✅ Added: ${hotel.name} in ${hotel.location}`);
    }

    console.log('🎉 Successfully populated hotels database!');
    console.log(`📊 Total hotels added: ${hotelsData.length}`);
    
    // Verify the data
    const snapshot = await hotelsRef.get();
    console.log(`✅ Verification: ${snapshot.size} hotels in database`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error populating hotels:', error);
    process.exit(1);
  }
}

// Run the script
populateHotels();

