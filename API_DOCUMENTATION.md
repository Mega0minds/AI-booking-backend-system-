# Marriott Bonvoy Conversational Booking API Documentation

## Base URL
```
http://localhost:5000/api
```

---

## 🤖 Conversation Endpoints (AI Chat)

### Start New Conversation
```http
POST /api/conversation/start
```
**Description:** Initiates a new chat session with the AI booking assistant.

**Request Body:**
```json
{
  "sessionId": "optional-session-id" // If not provided, system generates one
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sessionId": "session_1234567890_abc123",
    "conversationId": "conv_xyz789",
    "messages": [
      {
        "role": "assistant",
        "content": "Hello! I'm your Marriott Bonvoy booking assistant. I'm here to help you find and book the perfect hotel room. What brings you to our service today?",
        "timestamp": "2024-01-15T10:30:00Z"
      }
    ]
  }
}
```

---

### Send Message in Conversation
```http
POST /api/conversation/message
```
**Description:** Sends a message to the AI assistant and receives a response. The AI will ask questions to gather booking information naturally.

**Request Body:**
```json
{
  "sessionId": "session_1234567890_abc123",
  "message": "I need a hotel in New York for next week"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sessionId": "session_1234567890_abc123",
    "conversationId": "conv_xyz789",
    "response": "Great! I'd love to help you find a hotel in New York. What dates are you looking for?",
    "messages": [...], // Full conversation history
    "bookingInfo": {
      "location": "New York",
      "checkIn": null,
      "checkOut": null,
      "guests": null
    }
  }
}
```

---

### Complete Booking from Conversation
```http
POST /api/conversation/complete-booking
```
**Description:** Completes a hotel booking using information gathered from the conversation. Requires all necessary booking details to be collected.

**Request Body:**
```json
{
  "sessionId": "session_1234567890_abc123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "booking": {
      "id": "booking_abc123",
      "hotelId": "hotel_xyz789",
      "hotelName": "Marriott Times Square",
      "guestName": "John Doe",
      "guestEmail": "john@example.com",
      "checkIn": "2024-03-15T15:00:00Z",
      "checkOut": "2024-03-17T11:00:00Z",
      "guests": 2,
      "rooms": 1,
      "totalAmount": 450,
      "status": "confirmed"
    },
    "conversation": {...}, // Updated conversation
    "message": "Booking completed successfully!"
  }
}
```

---

### Search Hotels (AI Recommendations)
```http
POST /api/conversation/search-hotels
```
**Description:** Searches for hotels based on user preferences gathered from conversation.

**Request Body:**
```json
{
  "searchTerm": "New York Times Square",
  "city": "New York",
  "minPrice": 200,
  "maxPrice": 500
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "hotels": [
      {
        "id": "hotel_xyz789",
        "name": "Marriott Times Square",
        "address": "234 W 42nd St, New York, NY",
        "city": "New York",
        "pricePerNight": 225,
        "rating": 4.5,
        "amenities": ["WiFi", "Pool", "Gym"]
      }
    ],
    "count": 1
  }
}
```

---

## 🏨 Hotel Endpoints

### Get All Hotels
```http
GET /api/hotels
```
**Description:** Retrieves all hotels with optional filtering.

**Query Parameters:**
- `city` - Filter by city
- `state` - Filter by state
- `country` - Filter by country
- `minPrice` - Minimum price per night
- `maxPrice` - Maximum price per night
- `limit` - Number of results to return
- `page` - Page number for pagination

**Example:**
```http
GET /api/hotels?city=New York&minPrice=200&maxPrice=400&limit=10
```

**Response:**
```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "id": "hotel_xyz789",
      "name": "Marriott Times Square",
      "address": "234 W 42nd St, New York, NY",
      "city": "New York",
      "state": "NY",
      "country": "USA",
      "description": "Luxury hotel in the heart of Times Square",
      "pricePerNight": 225,
      "rating": 4.5,
      "numReviews": 1250,
      "amenities": ["WiFi", "Pool", "Gym", "Spa"],
      "images": ["image1.jpg", "image2.jpg"]
    }
  ]
}
```

---

### Get Single Hotel
```http
GET /api/hotels/:id
```
**Description:** Retrieves detailed information about a specific hotel.

**Example:**
```http
GET /api/hotels/hotel_xyz789
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "hotel_xyz789",
    "name": "Marriott Times Square",
    "address": "234 W 42nd St, New York, NY",
    "city": "New York",
    "state": "NY",
    "country": "USA",
    "description": "Luxury hotel in the heart of Times Square",
    "pricePerNight": 225,
    "rating": 4.5,
    "numReviews": 1250,
    "amenities": ["WiFi", "Pool", "Gym", "Spa"],
    "images": ["image1.jpg", "image2.jpg"],
    "totalRooms": 500,
    "location": {
      "latitude": 40.7589,
      "longitude": -73.9851
    }
  }
}
```

---

### Search Hotels
```http
GET /api/hotels/search
```
**Description:** Search hotels by name, location, or other criteria.

**Query Parameters:**
- `q` - Search term (hotel name, location)
- `city` - Filter by city
- `minPrice` - Minimum price
- `maxPrice` - Maximum price

**Example:**
```http
GET /api/hotels/search?q=Times Square&city=New York
```

**Response:**
```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "id": "hotel_xyz789",
      "name": "Marriott Times Square",
      "address": "234 W 42nd St, New York, NY",
      "pricePerNight": 225,
      "rating": 4.5
    }
  ]
}
```

---

### Get Hotels by Radius
```http
GET /api/hotels/radius/:zipcode/:distance
```
**Description:** Find hotels within a specific radius of a zipcode.

**Example:**
```http
GET /api/hotels/radius/10001/10
```
*Finds hotels within 10 miles of zipcode 10001*

**Response:**
```json
{
  "success": true,
  "count": 8,
  "data": [
    {
      "id": "hotel_xyz789",
      "name": "Marriott Times Square",
      "distance": 2.5,
      "pricePerNight": 225
    }
  ]
}
```

---

### Get Hotel Statistics
```http
GET /api/hotels/stats
```
**Description:** Retrieves statistics about all hotels in the system.

**Response:**
```json
{
  "success": true,
  "data": {
    "totalHotels": 150,
    "totalRevenue": 125000,
    "averageRating": 4.2,
    "totalReviews": 45000
  }
}
```

---

## 📅 Booking Endpoints

### Get All Bookings
```http
GET /api/bookings
```
**Description:** Retrieves all bookings with optional filtering.

**Query Parameters:**
- `sessionId` - Filter by session ID
- `hotelId` - Filter by hotel ID
- `status` - Filter by booking status
- `guestEmail` - Filter by guest email
- `limit` - Number of results
- `page` - Page number

**Example:**
```http
GET /api/bookings?status=confirmed&limit=20
```

**Response:**
```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "id": "booking_abc123",
      "sessionId": "session_1234567890_abc123",
      "hotelId": "hotel_xyz789",
      "hotelName": "Marriott Times Square",
      "guestName": "John Doe",
      "guestEmail": "john@example.com",
      "checkIn": "2024-03-15T15:00:00Z",
      "checkOut": "2024-03-17T11:00:00Z",
      "guests": 2,
      "rooms": 1,
      "totalAmount": 450,
      "status": "confirmed"
    }
  ]
}
```

---

### Get Single Booking
```http
GET /api/bookings/:id
```
**Description:** Retrieves details of a specific booking.

**Example:**
```http
GET /api/bookings/booking_abc123
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "booking_abc123",
    "sessionId": "session_1234567890_abc123",
    "hotelId": "hotel_xyz789",
    "hotelName": "Marriott Times Square",
    "guestName": "John Doe",
    "guestEmail": "john@example.com",
    "guestPhone": "+1-555-123-4567",
    "checkIn": "2024-03-15T15:00:00Z",
    "checkOut": "2024-03-17T11:00:00Z",
    "guests": 2,
    "rooms": 1,
    "totalAmount": 450,
    "status": "confirmed",
    "specialRequests": "Late check-in requested",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

---

### Create New Booking
```http
POST /api/bookings
```
**Description:** Creates a new hotel booking directly (alternative to conversational booking).

**Request Body:**
```json
{
  "sessionId": "session_1234567890_abc123",
  "hotelId": "hotel_xyz789",
  "guestName": "John Doe",
  "guestEmail": "john@example.com",
  "guestPhone": "+1-555-123-4567",
  "checkIn": "2024-03-15",
  "checkOut": "2024-03-17",
  "guests": 2,
  "rooms": 1,
  "specialRequests": "Late check-in requested"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "booking_abc123",
    "sessionId": "session_1234567890_abc123",
    "hotelId": "hotel_xyz789",
    "hotelName": "Marriott Times Square",
    "guestName": "John Doe",
    "guestEmail": "john@example.com",
    "checkIn": "2024-03-15T15:00:00Z",
    "checkOut": "2024-03-17T11:00:00Z",
    "guests": 2,
    "rooms": 1,
    "totalAmount": 450,
    "status": "confirmed"
  }
}
```

---

### Update Booking
```http
PUT /api/bookings/:id
```
**Description:** Updates an existing booking.

**Request Body:**
```json
{
  "status": "cancelled",
  "specialRequests": "Updated special requests"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "booking_abc123",
    "status": "cancelled",
    "updatedAt": "2024-01-15T12:00:00Z"
  }
}
```

---

### Delete Booking
```http
DELETE /api/bookings/:id
```
**Description:** Deletes a booking.

**Response:**
```json
{
  "success": true,
  "message": "Booking deleted successfully"
}
```

---

### Check Hotel Availability
```http
GET /api/bookings/availability/:hotelId
```
**Description:** Checks room availability for a specific hotel and dates.

**Query Parameters:**
- `checkIn` - Check-in date (YYYY-MM-DD)
- `checkOut` - Check-out date (YYYY-MM-DD)

**Example:**
```http
GET /api/bookings/availability/hotel_xyz789?checkIn=2024-03-15&checkOut=2024-03-17
```

**Response:**
```json
{
  "success": true,
  "data": {
    "available": 15,
    "totalRooms": 500,
    "bookedRooms": 485
  }
}
```

---

### Get Booking Statistics
```http
GET /api/bookings/stats
```
**Description:** Retrieves statistics about bookings.

**Query Parameters:**
- `startDate` - Start date for statistics
- `endDate` - End date for statistics

**Example:**
```http
GET /api/bookings/stats?startDate=2024-01-01&endDate=2024-12-31
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalBookings": 1250,
    "totalRevenue": 450000,
    "statusCounts": {
      "pending": 25,
      "confirmed": 1100,
      "cancelled": 100,
      "completed": 25
    },
    "averageBookingValue": 360
  }
}
```

---

## 🔧 Utility Endpoints

### Health Check
```http
GET /health
```
**Description:** Checks if the server is running.

**Response:**
```json
{
  "status": "success",
  "message": "Server is running",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

---

## 📝 Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error description"
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request (missing/invalid data)
- `404` - Not Found
- `500` - Internal Server Error

---

## 🚀 Getting Started

1. **Start the server:**
   ```bash
   cd Backend
   npm install
   npm run dev
   ```

2. **Test the API:**
   ```bash
   # Start a conversation
   curl -X POST http://localhost:5000/api/conversation/start \
     -H "Content-Type: application/json" \
     -d '{}'
   
   # Send a message
   curl -X POST http://localhost:5000/api/conversation/message \
     -H "Content-Type: application/json" \
     -d '{"sessionId": "your-session-id", "message": "Hello!"}'
   ```

3. **View all hotels:**
   ```bash
   curl http://localhost:5000/api/hotels
   ```

---

## 🔑 Authentication

**No authentication required!** This API is designed for conversational booking without user accounts. All interactions are session-based.
