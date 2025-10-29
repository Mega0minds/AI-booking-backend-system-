const admin = require('firebase-admin');
require('dotenv').config();

// Initialize Firebase Admin SDK
const initializeFirebase = () => {
  try {
    // Check if Firebase is already initialized
    if (admin.apps.length === 0) {
      // Validate required environment variables
      const requiredEnvVars = [
        'FIREBASE_PROJECT_ID',
        'FIREBASE_PRIVATE_KEY_ID',
        'FIREBASE_PRIVATE_KEY',
        'FIREBASE_CLIENT_EMAIL',
        'FIREBASE_CLIENT_ID'
      ];

      const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
      
      if (missingVars.length > 0) {
        console.error('❌ Missing required Firebase environment variables:', missingVars);
        console.error('💡 Please check your .env file and make sure all Firebase variables are set');
        console.warn('⚠️  MVP Mode: Continuing without Firebase...');
        throw new Error('Firebase credentials missing');
      }

      // Initialize with service account key
      const serviceAccount = {
        type: process.env.FIREBASE_TYPE || "service_account",
        project_id: process.env.FIREBASE_PROJECT_ID,
        private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
        private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        client_id: process.env.FIREBASE_CLIENT_ID,
        auth_uri: process.env.FIREBASE_AUTH_URI || "https://accounts.google.com/o/oauth2/auth",
        token_uri: process.env.FIREBASE_TOKEN_URI || "https://oauth2.googleapis.com/token",
        auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL || "https://www.googleapis.com/oauth2/v1/certs",
        client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL
      };

      console.log('🔧 Initializing Firebase with project:', process.env.FIREBASE_PROJECT_ID);

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: process.env.FIREBASE_DATABASE_URL
      });

      console.log('🔥 Firebase Admin SDK initialized successfully');
      console.log(`📊 Firestore Database connected: ${process.env.FIREBASE_PROJECT_ID}`);
    } else {
      console.log('🔥 Firebase Admin SDK already initialized');
    }
  } catch (error) {
    console.error('❌ Firebase initialization error:', error.message);
    console.error('💡 Make sure your .env file contains all required Firebase variables');
    console.warn('⚠️  MVP Mode: Continuing without Firebase...');
    // Don't exit - let the app continue without Firebase
    throw error;
  }
};

// Get Firestore instance
const getFirestore = () => {
  return admin.firestore();
};

module.exports = {
  initializeFirebase,
  getFirestore,
  admin
};