# Marriott Bonvoy Conversational Booking Backend

A conversational AI-powered backend API for the Marriott Bonvoy hotel booking platform built with Node.js, Express.js, Firebase Firestore, and OpenAI GPT.

## Features

- **🤖 Conversational AI Booking**: Natural language hotel booking through chat interface
- **🏨 Hotel Management**: Search and browse hotels with detailed information
- **📅 Booking System**: Complete booking management with availability checking
- **💬 Session Management**: Maintain conversation context across chat sessions
- **🔍 Smart Search**: AI-powered hotel recommendations and search
- **📊 Analytics**: Booking and conversation statistics

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** Firebase Firestore
- **AI:** OpenAI GPT-3.5-turbo
- **Security:** Helmet, CORS, Rate Limiting

## Prerequisites

- Node.js (v18 or higher)
- Firebase project with Firestore enabled
- OpenAI API key
- npm or yarn

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd marriott-bonvoy-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Firebase**:
   - Create a Firebase project at [Firebase Console](https://console.firebase.google.com)
   - Enable Firestore Database
   - Generate a service account key
   - Download the service account JSON file

4. **Get OpenAI API Key**:
   - Sign up at [OpenAI Platform](https://platform.openai.com)
   - Create an API key in your account settings

5. **Environment Setup**
   ```bash
   cp .env.example .env
   ```
   
   Update the `.env` file with your configuration:
   ```env
   NODE_ENV=development
   PORT=5000

   # Firebase Configuration
   FIREBASE_PROJECT_ID=your-firebase-project-id
   FIREBASE_PRIVATE_KEY_ID=your-private-key-id
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour-private-key-here\n-----END PRIVATE KEY-----\n"
   FIREBASE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
   FIREBASE_CLIENT_ID=your-client-id
   FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
   FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token
   FIREBASE_AUTH_PROVIDER_X509_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
   FIREBASE_CLIENT_X509_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/your-service-account%40your-project.iam.gserviceaccount.com
   FIREBASE_DATABASE_URL=https://your-project-id-default-rtdb.firebaseio.com/

   # OpenAI Configuration
   OPENAI_API_KEY=your_openai_api_key_here

   # Frontend URL
   FRONTEND_URL=http://localhost:3000
   ```

6. **Start the server**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

## API Endpoints

### Conversation (AI Chat)
- `POST /api/conversation/start` - Start a new conversation session
- `POST /api/conversation/message` - Send a message in the conversation
- `POST /api/conversation/complete-booking` - Complete booking from conversation
- `POST /api/conversation/search-hotels` - Search hotels for recommendations

### Hotels
- `GET /api/hotels` - Get all hotels with optional filtering
- `GET /api/hotels/search` - Search hotels by name or location
- `GET /api/hotels/:id` - Get single hotel
- `GET /api/hotels/radius/:zipcode/:distance` - Get hotels in radius
- `GET /api/hotels/stats` - Get hotel statistics

### Bookings
- `GET /api/bookings` - Get all bookings with optional filtering
- `GET /api/bookings/:id` - Get single booking
- `POST /api/bookings` - Create new booking
- `PUT /api/bookings/:id` - Update booking
- `DELETE /api/bookings/:id` - Delete booking
- `GET /api/bookings/stats` - Get booking statistics
- `GET /api/bookings/availability/:hotelId` - Check hotel availability

## How It Works

### Conversational Booking Flow

1. **Start Conversation**: User initiates a chat session
2. **Natural Chat**: AI assistant asks questions to gather booking information
3. **Information Extraction**: System extracts booking details from conversation
4. **Hotel Search**: AI searches and recommends hotels based on preferences
5. **Booking Confirmation**: User confirms details and completes booking

### Example Conversation Flow

```
User: "Hi, I need to book a hotel in New York for next week"
AI: "Hello! I'd be happy to help you book a hotel in New York. What dates are you looking for?"

User: "March 15th to 18th"
AI: "Great! For March 15-18, how many guests will be staying?"

User: "Just me, so 1 guest"
AI: "Perfect! Do you have a preference for location within New York, or any specific amenities you're looking for?"

User: "Something near Central Park would be nice"
AI: "Excellent choice! I found some great options near Central Park. What's your email address for the booking confirmation?"

User: "john@example.com"
AI: "Thank you! Here are your top hotel recommendations..."
```

## Project Structure

```
Backend/
├── config/
│   └── database.js          # Firebase configuration
├── controllers/
│   ├── conversation.js      # AI conversation controller
│   ├── hotels.js           # Hotel controller
│   └── bookings.js         # Booking controller
├── middleware/
│   └── errorHandler.js     # Error handling middleware
├── models/
│   ├── Conversation.js     # Conversation model (Firebase)
│   ├── Hotel.js           # Hotel model (Firebase)
│   └── Booking.js         # Booking model (Firebase)
├── routes/
│   ├── conversation.js     # Conversation routes
│   ├── hotels.js          # Hotel routes
│   └── bookings.js        # Booking routes
├── server.js              # Main server file
├── package.json           # Dependencies and scripts
└── README.md              # Project documentation
```

## Firebase Collections

The application uses the following Firestore collections:

- **conversations**: Chat sessions and conversation history
- **hotels**: Hotel information and details
- **bookings**: Hotel bookings and reservations

## AI Features

- **Natural Language Processing**: Understands user intent and extracts booking information
- **Context Awareness**: Maintains conversation context across messages
- **Smart Recommendations**: Suggests hotels based on user preferences
- **Information Validation**: Ensures all required booking information is collected
- **Conversational Flow**: Guides users through the booking process naturally

## Security Features

- **Rate Limiting**: 100 requests per 15 minutes per IP
- **CORS**: Configurable cross-origin resource sharing
- **Helmet**: Security headers
- **Input Validation**: Request validation and sanitization

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NODE_ENV` | Environment mode | Yes |
| `PORT` | Server port | Yes |
| `FIREBASE_PROJECT_ID` | Firebase project ID | Yes |
| `FIREBASE_PRIVATE_KEY` | Firebase private key | Yes |
| `FIREBASE_CLIENT_EMAIL` | Firebase client email | Yes |
| `OPENAI_API_KEY` | OpenAI API key | Yes |
| `FRONTEND_URL` | Frontend URL for CORS | Yes |

## Development Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm test` - Run tests
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.