const OpenAI = require('openai');
const Conversation = require('../models/Conversation');
const Hotel = require('../models/Hotel');
const Booking = require('../models/Booking');
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

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// System prompt for the AI assistant
const SYSTEM_PROMPT = `You are a friendly and helpful hotel booking assistant for Marriott Bonvoy. Your role is to help users book hotel rooms through natural conversation.

CRITICAL: Use this EXACT starting message: "Hi there! Tell me what kind of hotel you're looking for and where. I'll handle the rest."

Required booking information to collect:
- Location (e.g., "Lagos", "New York")
- Check-in Date (e.g., "Oct 12")
- Check-out Date (e.g., "Oct 15")
- Room Type (Standard, Deluxe, Suite - suggest based on party size)
- Guest Count (Adults, Children)
- Preferences (Optional - e.g., near airport, pool, pet-friendly)
- Name (Full name)
- Email (For confirmation)
- Phone Number (For contact)

Flow:
1. Parse location and intent from user's first message
2. Prompt for dates if missing
3. Suggest 2-3 matching hotels from the database with FULL DETAILS (name, rating, stars, price)
4. Collect guest details (name, email, phone)
5. When you have ALL required information (location, dates, hotel choice, guest details), say "BOOKING_COMPLETE" to trigger booking completion
6. After saying "BOOKING_COMPLETE", provide ONLY the booking summary with hotel details. DO NOT mention "checkout link" or "shortly" - the system will automatically add the link to your message

IMPORTANT RULES:
- ALWAYS include hotel name, star rating, and price when suggesting hotels
- When you have ALL required information (location, dates, hotel choice, guest name, email), say "BOOKING_COMPLETE" to trigger booking completion
- After saying "BOOKING_COMPLETE", provide ONLY the booking summary with hotel details
- NEVER mention "checkout link" or "shortly" or "will receive" - the system automatically adds the link
- NEVER say "booking confirmed" or "reservation confirmed" until AFTER payment is completed
- Do NOT require the user to input anything in exact order. Drive the flow naturally based on what's missing. Be conversational and helpful.
- When showing hotel suggestions, format like: "🏨 [Hotel Name] ⭐⭐⭐⭐⭐ (5 stars) - $XXX/night"
- CRITICAL: If user provides name and email after hotel selection, say "BOOKING_COMPLETE" to trigger booking completion`

// @desc    Start a new conversation
// @route   POST /api/conversation/start
// @access  Public
exports.startConversation = async (req, res, next) => {
  try {
    const sessionId = req.body.sessionId || generateSessionId();
    
    // Check if conversation already exists
    let conversation = await Conversation.findBySessionId(sessionId);
    
    if (!conversation) {
      // Create new conversation with the exact starting message
      conversation = await Conversation.create({
        sessionId,
        messages: [{
          role: 'assistant',
          content: 'Hi there! Tell me what kind of hotel you\'re looking for and where. I\'ll handle the rest.',
          timestamp: new Date()
        }]
      });
    }

    res.status(200).json({
      success: true,
      sessionId: conversation.sessionId,
      conversationId: conversation.id,
      message: conversation.messages[conversation.messages.length - 1].content,
      messages: conversation.messages
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Send message in conversation
// @route   POST /api/conversation/message
// @access  Public
exports.sendMessage = async (req, res, next) => {
  try {
    const { sessionId, message } = req.body;

    console.log('Received message request:', { sessionId, message: message.substring(0, 50) + '...' });

    if (!sessionId || !message) {
      return res.status(400).json({
        success: false,
        message: 'Session ID and message are required'
      });
    }

    // Get or create conversation
    let conversation = await Conversation.findBySessionId(sessionId);
    
    console.log('Found conversation:', conversation ? 'Yes' : 'No');
    
    if (!conversation) {
      console.log('Creating new conversation...');
      // Create new conversation if it doesn't exist
      conversation = await Conversation.create({
        sessionId,
        messages: [{
          role: 'assistant',
          content: 'Hi there! Tell me what kind of hotel you\'re looking for and where. I\'ll handle the rest.',
          timestamp: new Date()
        }]
      });
      console.log('Created conversation with ID:', conversation.id);
    }

    // Add user message to conversation
    console.log('Adding user message to conversation:', conversation.id);
    await Conversation.addMessage(conversation.id, {
      role: 'user',
      content: message
    });
    console.log('User message added successfully');

    // Get updated conversation
    conversation = await Conversation.findById(conversation.id);

    // Prepare messages for OpenAI
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...conversation.messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }))
    ];

    // Get AI response
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: messages,
      max_tokens: 500,
      temperature: 0.7,
    });

    let aiResponse = completion.choices[0].message.content;

    // Add AI response to conversation
    await Conversation.addMessage(conversation.id, {
      role: 'assistant',
      content: aiResponse
    });

    // Check if this looks like a booking request and extract information
    const extractedInfo = await extractBookingInfo(conversation);
    if (extractedInfo.hasBookingInfo) {
      await Conversation.updateBookingInfo(conversation.id, extractedInfo.bookingInfo);
    }

    // Get the latest conversation and booking info first (needed for both if and else)
    const updatedConversation = await Conversation.findBySessionId(conversation.sessionId);
    const bookingInfo = updatedConversation.bookingInfo || {};
    
    // Check if AI response says "BOOKING_COMPLETE" - this triggers booking completion
    if (aiResponse.includes('BOOKING_COMPLETE')) {
      console.log('AI said BOOKING_COMPLETE, attempting to complete booking...');
      
      console.log('Booking info for completion:', {
        guestName: bookingInfo.guestName,
        guestEmail: bookingInfo.guestEmail,
        checkIn: bookingInfo.checkIn,
        checkOut: bookingInfo.checkOut,
        location: bookingInfo.location,
        isCompleted: updatedConversation.isCompleted
      });
      
      // If we have basic info but missing some details, try to extract from the conversation
      if (!bookingInfo.guestName || !bookingInfo.guestEmail) {
        console.log('Missing guest details, trying to extract from conversation...');
        const extractedInfo = await extractBookingInfo(updatedConversation);
        if (extractedInfo.hasBookingInfo) {
          await Conversation.updateBookingInfo(updatedConversation.id, extractedInfo.bookingInfo);
          // Update the bookingInfo with extracted data
          Object.assign(bookingInfo, extractedInfo.bookingInfo);
        }
      }
      
      // Try to create the booking
      try {
        const db = getFirestore();
        let bookingRef = null;
        
        // Find a matching hotel if not already selected
        if (!bookingInfo.hotelId) {
          const hotels = await findMatchingHotels(bookingInfo.location || 'Lagos');
          if (hotels.length > 0) {
            bookingInfo.hotelId = hotels[0].id;
            bookingInfo.hotelName = hotels[0].name;
          }
        }
        
        // Create the booking in Firestore
        const hotelId = bookingInfo.hotelId || 'LAG001'; // Fallback
        const hotelDoc = await db.collection('hotels').doc(hotelId).get();
        const hotel = hotelDoc.data();
        
        const checkIn = bookingInfo.checkIn ? new Date(bookingInfo.checkIn) : new Date();
        const checkOut = bookingInfo.checkOut ? new Date(bookingInfo.checkOut) : new Date(Date.now() + 86400000);
        const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
        const totalAmount = (hotel?.price_per_night || 500) * nights;
        
        const bookingData = {
          sessionId: conversation.sessionId,
          hotelId,
          hotelName: hotel?.name || bookingInfo.hotelName || bookingInfo.location + ' Hotel',
          guestName: bookingInfo.guestName || 'Guest',
          guestEmail: bookingInfo.guestEmail || 'guest@example.com',
          guestPhone: bookingInfo.guestPhone || '',
          checkIn,
          checkOut,
          guests: bookingInfo.guests || 1,
          rooms: bookingInfo.rooms || 1,
          totalAmount,
          specialRequests: bookingInfo.specialRequests || '',
          status: 'pending',
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        bookingRef = await db.collection('bookings').add(bookingData);
        console.log('✅ Booking created in Firestore with ID:', bookingRef.id);
        
        // Mark conversation as completed
        await Conversation.completeConversation(updatedConversation.id, bookingInfo);
        
        // Generate checkout link with REAL booking ID
        const checkoutLink = generatePaymentLink(bookingRef.id, req);
        console.log('Generated checkout link:', checkoutLink);
        
        // Remove "BOOKING_COMPLETE" text and append real link
        aiResponse = aiResponse.replace('BOOKING_COMPLETE', '');
        aiResponse += `\n\n🔗 **Complete Your Booking:** ${checkoutLink}`;
        
        // Update the message in conversation with the checkout link
        const lastMessageIndex = updatedConversation.messages.length - 1;
        if (lastMessageIndex >= 0) {
          updatedConversation.messages[lastMessageIndex].content = aiResponse;
        }
        
      } catch (error) {
        console.error('Error creating booking:', error);
        // Even if booking creation fails, still try to show a link
        aiResponse = aiResponse.replace('BOOKING_COMPLETE', '');
      }
    } else {
        console.log('Missing booking info or already completed');
        console.log('Missing fields:', {
          guestName: !bookingInfo.guestName,
          guestEmail: !bookingInfo.guestEmail,
          checkIn: !bookingInfo.checkIn,
          checkOut: !bookingInfo.checkOut,
          location: !bookingInfo.location
        });
        
        // Even if we don't have all info, try to extract what we can from the conversation
        console.log('Attempting to extract booking info from conversation messages...');
        const extractedInfo = await extractBookingInfo(updatedConversation);
        
        if (extractedInfo.hasBookingInfo) {
          console.log('Extracted booking info:', extractedInfo.bookingInfo);
          await Conversation.updateBookingInfo(updatedConversation.id, extractedInfo.bookingInfo);
          
          // Re-check if we now have enough info
          const finalBookingInfo = { ...bookingInfo, ...extractedInfo.bookingInfo };
          
          if (finalBookingInfo.guestName && finalBookingInfo.guestEmail && 
              (finalBookingInfo.checkIn || 'today') && (finalBookingInfo.checkOut || 'tomorrow') &&
              (finalBookingInfo.location || 'Lagos')) {
            console.log('Have enough info now, attempting booking...');
            
            try {
              const db = getFirestore();
              
              // Find a hotel
              const location = finalBookingInfo.location || 'Lagos';
              const hotels = await findMatchingHotels(location);
              const selectedHotel = hotels.length > 0 ? hotels[0] : { id: 'LAG001', name: 'Marriott Hotel ' + location };
              
              const hotelDoc = await db.collection('hotels').doc(selectedHotel.id).get();
              const hotel = hotelDoc.data();
              
              const checkIn = finalBookingInfo.checkIn ? new Date(finalBookingInfo.checkIn) : new Date();
              const checkOut = finalBookingInfo.checkOut ? new Date(finalBookingInfo.checkOut) : new Date(Date.now() + 86400000);
              const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
              const totalAmount = (hotel?.price_per_night || 500) * nights;
              
              const bookingData = {
                sessionId: conversation.sessionId,
                hotelId: selectedHotel.id,
                hotelName: selectedHotel.name,
                guestName: finalBookingInfo.guestName,
                guestEmail: finalBookingInfo.guestEmail,
                guestPhone: finalBookingInfo.guestPhone || '',
                checkIn,
                checkOut,
                guests: finalBookingInfo.guests || 1,
                rooms: 1,
                totalAmount,
                specialRequests: '',
                status: 'pending',
                createdAt: new Date(),
                updatedAt: new Date()
              };
              
              const bookingRef = await db.collection('bookings').add(bookingData);
              console.log('Booking created with ID:', bookingRef.id);
              
              await Conversation.completeConversation(updatedConversation.id, finalBookingInfo);
              
              const checkoutLink = generatePaymentLink(bookingRef.id, req);
              console.log('Generated checkout link:', checkoutLink);
              
              aiResponse = aiResponse.replace('BOOKING_COMPLETE', '');
              aiResponse += `\n\n🔗 **Complete Your Booking:** ${checkoutLink}`;
              
              const lastMessageIndex = updatedConversation.messages.length - 1;
              if (lastMessageIndex >= 0) {
                updatedConversation.messages[lastMessageIndex].content = aiResponse;
              }
            } catch (error) {
              console.error('Error creating booking from extracted info:', error);
            }
          }
        }
      }

    // Check if AI response mentions hotels and suggest matching ones
    let suggestedHotels = null;
    const location = extractedInfo.bookingInfo?.location || extractLocationFromMessages(conversation.messages);
    
    if (location && (aiResponse.toLowerCase().includes('hotel') || aiResponse.toLowerCase().includes('suggest'))) {
      suggestedHotels = await findMatchingHotels(location);
    }

    // Get final conversation state (updatedConversation already exists)
    const finalConversation = await Conversation.findById(conversation.id);

    res.status(200).json({
      success: true,
      sessionId,
      conversationId: conversation.id,
      message: aiResponse,
      messages: finalConversation.messages,
      bookingDetails: finalConversation.bookingInfo || {},
      suggestedHotels: suggestedHotels
    });
  } catch (error) {
    console.error('Error in sendMessage:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Sorry, I encountered an error. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Complete booking from conversation
// @route   POST /api/conversation/complete-booking
// @access  Public
exports.completeBooking = async (req, res, next) => {
  try {
    const { sessionId } = req.body;

    const conversation = await Conversation.findBySessionId(sessionId);
    
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    const bookingInfo = conversation.bookingInfo;

    // Validate required booking information
    if (!bookingInfo.guestName || !bookingInfo.guestEmail || 
        !bookingInfo.checkIn || !bookingInfo.checkOut || 
        !bookingInfo.hotelId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required booking information'
      });
    }

    // Check hotel availability
    const availability = await Hotel.checkAvailability(
      bookingInfo.hotelId,
      bookingInfo.checkIn,
      bookingInfo.checkOut
    );

    if (availability.available < bookingInfo.rooms) {
      return res.status(400).json({
        success: false,
        message: `Sorry, only ${availability.available} rooms are available for your selected dates.`
      });
    }

    // Get hotel details for booking
    const hotel = await Hotel.findById(bookingInfo.hotelId);
    if (!hotel) {
      return res.status(404).json({
        success: false,
        message: 'Hotel not found'
      });
    }

    // Calculate total amount
    const checkIn = new Date(bookingInfo.checkIn);
    const checkOut = new Date(bookingInfo.checkOut);
    const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
    const totalAmount = hotel.pricePerNight * nights * bookingInfo.rooms;

    // Create booking
    const bookingData = {
      sessionId,
      hotelId: bookingInfo.hotelId,
      hotelName: hotel.name,
      guestName: bookingInfo.guestName,
      guestEmail: bookingInfo.guestEmail,
      guestPhone: bookingInfo.guestPhone || '',
      checkIn: new Date(bookingInfo.checkIn),
      checkOut: new Date(bookingInfo.checkOut),
      guests: bookingInfo.guests || 1,
      rooms: bookingInfo.rooms || 1,
      totalAmount,
      specialRequests: bookingInfo.specialRequests || '',
      status: 'pending' // Changed to pending until payment
    };

    const booking = await Booking.create(bookingData);

    // Complete the conversation
    await Conversation.completeConversation(conversation.id, bookingInfo);

    // Generate payment link
    const paymentLink = generatePaymentLink(booking.id, req);

    // Add confirmation message to conversation
    await Conversation.addMessage(conversation.id, {
      role: 'assistant',
      content: `🎉 Perfect! Your booking is ready for payment!

Booking Details:
• Hotel: ${hotel.name} ⭐⭐⭐⭐⭐ (${hotel.rating} stars)
• Location: ${hotel.city}, ${hotel.state}
• Check-in: ${checkIn.toLocaleDateString()}
• Check-out: ${checkOut.toLocaleDateString()}
• Guests: ${bookingInfo.guests}
• Rooms: ${bookingInfo.rooms}
• Total: $${totalAmount}

Your booking reference is: ${booking.id}

🔗 Complete Payment & Confirm Booking: ${paymentLink}

Please complete payment to confirm your reservation. A confirmation email will be sent to ${bookingInfo.guestEmail} after payment. Thank you for choosing Marriott Bonvoy!`
    });

    const finalConversation = await Conversation.findById(conversation.id);

    res.status(200).json({
      success: true,
      data: {
        booking,
        conversation: finalConversation,
        message: 'Booking completed successfully!'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Search hotels
// @route   POST /api/conversation/search-hotels
// @access  Public
exports.searchHotels = async (req, res, next) => {
  try {
    const { searchTerm, city, minPrice, maxPrice } = req.body;
    const db = getFirestore();
    
    let query = db.collection('hotels').where('isActive', '==', true);

    // Apply location filter if provided
    if (city) {
      query = query.where('location', '==', city);
    }

    const snapshot = await query.get();
    let hotels = [];

    snapshot.forEach(doc => {
      hotels.push({
        id: doc.id,
        ...doc.data()
      });
    });

    // Apply text search filters (done in memory)
    if (searchTerm) {
      hotels = hotels.filter(hotel => 
        hotel.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        hotel.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        hotel.brand.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply price filters
    if (minPrice || maxPrice) {
      hotels = hotels.filter(hotel => {
        const price = hotel.price_per_night;
        if (minPrice && price < minPrice) return false;
        if (maxPrice && price > maxPrice) return false;
        return true;
      });
    }

    res.status(200).json({
      success: true,
      data: {
        hotels: hotels.slice(0, 10), // Limit to 10 results
        count: hotels.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Helper function to extract booking information from conversation
async function extractBookingInfo(conversation) {
  const messages = conversation.messages;
  const bookingInfo = conversation.bookingInfo || {};
  
  // This is a simplified extraction - in production, you'd use more sophisticated NLP
  const recentMessages = messages.slice(-10).join(' ');
  
  // Extract dates (simplified regex patterns)
  const datePattern = /(\d{1,2}\/\d{1,2}\/\d{4})|(\d{4}-\d{2}-\d{2})/g;
  const dates = recentMessages.match(datePattern);
  
  // Extract email
  const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const emails = recentMessages.match(emailPattern);
  
  // Extract phone
  const phonePattern = /(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/g;
  const phones = recentMessages.match(phonePattern);

  // Extract name
  const namePattern = /(?:my name is|i'm|i am|call me|name is)\s+([a-zA-Z\s]+)/i;
  const nameMatch = recentMessages.match(namePattern);
  
  // Extract location
  const location = extractLocationFromMessages(messages);

  // Update booking info if new information is found
  if (dates && dates.length >= 2) {
    bookingInfo.checkIn = dates[0];
    bookingInfo.checkOut = dates[1];
  }
  
  if (emails && emails.length > 0) {
    bookingInfo.guestEmail = emails[0];
  }
  
  if (phones && phones.length > 0) {
    bookingInfo.guestPhone = phones[0];
  }
  
  if (nameMatch && nameMatch[1]) {
    bookingInfo.guestName = nameMatch[1].trim();
  }
  
  if (location) {
    bookingInfo.location = location;
  }

  // Check if we have enough information to consider it a booking request
  const hasBookingInfo = bookingInfo.guestEmail && 
                        bookingInfo.checkIn && 
                        bookingInfo.checkOut;

  return {
    hasBookingInfo,
    bookingInfo
  };
}

// Helper function to generate session ID
function generateSessionId() {
  return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Helper function to extract location from messages
function extractLocationFromMessages(messages) {
  const recentMessages = messages.slice(-5).map(msg => msg.content).join(' ');
  const locationPattern = /\b(lagos|new york|london|paris|tokyo|dubai|singapore|miami|los angeles|chicago|toronto|sydney|mumbai|delhi|bangalore|kolkata|chennai|hyderabad|pune|ahmedabad|jaipur|lucknow|kanpur|nagpur|indore|thane|bhopal|visakhapatnam|pimpri|patna|vadodara|ghaziabad|ludhiana|agra|nashik|faridabad|meerut|rajkot|kalyan|vasai|varanasi|srinagar|aurangabad|navi mumbai|solapur|vijayawada|kolhapur|amritsar|noida|ranchi|howrah|coimbatore|raipur|jabalpur|gwalior|jodhpur|madurai|mysore|tiruchirappalli|kota|chandigarh|bhubaneswar|salem|warangal|guntur|bhiwandi|amravati|nanded|kolhapur|sangli|malegaon|ulhasnagar|jalgaon|akola|latur|ahmednagar|dhule|ichalkaranji|parbhani|jalna|bhusawal|panvel|satara|beed|yavatmal|kamptee|gondia|barshi|achalpur|osmanabad|nandurbar|wardha|udgir|hinganghat)\b/i;
  const match = recentMessages.match(locationPattern);
  return match ? match[1].toLowerCase() : null;
}

// Helper function to find matching hotels
async function findMatchingHotels(location) {
  try {
    const matchingHotels = hotelsData.filter(hotel => 
      hotel.location.toLowerCase().includes(location.toLowerCase()) ||
      location.toLowerCase().includes(hotel.location.toLowerCase())
    );
    
    // Return top 3 hotels with full details
    return matchingHotels.slice(0, 3).map(hotel => ({
      id: hotel.id,
      name: hotel.name,
      location: hotel.location,
      brand: hotel.brand,
      rating: hotel.rating,
      stars: hotel.stars,
      pricePerNight: hotel.pricePerNight,
      amenities: hotel.amenities,
      image: hotel.image,
      description: hotel.description
    }));
  } catch (error) {
    console.error('Error finding matching hotels:', error);
    return [];
  }
}

// Helper function to generate payment link
function generatePaymentLink(bookingId, req) {
  // Get the frontend URL from request origin or environment variable
  let frontendUrl;
  
  if (req && req.headers && req.headers.origin) {
    // Use the request origin (e.g., http://localhost:5500)
    frontendUrl = req.headers.origin;
  } else {
    // Fallback to environment variable or default
    frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5500';
  }
  
  // Remove trailing slash if present
  frontendUrl = frontendUrl.replace(/\/$/, '');
  
  const link = `${frontendUrl}/Frontend/checkout.html?bookingId=${bookingId}`;
  console.log('Generated payment link:', link);
  return link;
}

// @desc    Force complete booking when user provides name and email
// @route   POST /api/conversation/force-complete
// @access  Public
exports.forceCompleteBooking = async (req, res, next) => {
  try {
    const { sessionId } = req.body;

    const conversation = await Conversation.findBySessionId(sessionId);
    
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    const bookingInfo = conversation.bookingInfo;

    // Check if we have all required information
    if (!bookingInfo.guestName || !bookingInfo.guestEmail || 
        !bookingInfo.checkIn || !bookingInfo.checkOut || 
        !bookingInfo.location) {
      return res.status(400).json({
        success: false,
        message: 'Missing required booking information',
        missing: {
          guestName: !bookingInfo.guestName,
          guestEmail: !bookingInfo.guestEmail,
          checkIn: !bookingInfo.checkIn,
          checkOut: !bookingInfo.checkOut,
          location: !bookingInfo.location
        }
      });
    }

    // Auto-select a hotel if not already selected
    if (!bookingInfo.hotelId) {
      const hotels = await findMatchingHotels(bookingInfo.location);
      if (hotels.length > 0) {
        bookingInfo.hotelId = hotels[0].id;
        bookingInfo.hotelName = hotels[0].name;
        await Conversation.updateBookingInfo(conversation.id, bookingInfo);
      }
    }

    // Complete the booking
    const bookingResult = await exports.completeBooking(req, res, next);
    return bookingResult;

  } catch (error) {
    console.error('Error in force-complete booking:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to force-complete booking',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Test endpoint to manually complete booking
// @route   POST /api/conversation/test-complete
// @access  Public
exports.testCompleteBooking = async (req, res, next) => {
  try {
    const { sessionId } = req.body;

    console.log('Test complete booking for session:', sessionId);

    const conversation = await Conversation.findBySessionId(sessionId);
    
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    console.log('Found conversation:', conversation.id);
    console.log('Booking info:', conversation.bookingInfo);

    // Force complete the booking
    const bookingResult = await exports.completeBooking(req, res, next);
    return bookingResult;

  } catch (error) {
    console.error('Error in test complete booking:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to test complete booking',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  startConversation: exports.startConversation,
  sendMessage: exports.sendMessage,
  completeBooking: exports.completeBooking,
  searchHotels: exports.searchHotels,
  forceCompleteBooking: exports.forceCompleteBooking,
  testCompleteBooking: exports.testCompleteBooking
};
