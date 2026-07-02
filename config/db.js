const mongoose = require('mongoose');
require('dotenv').config();

let dbStatus = {
  connected: false,
  type: 'Disconnected', // 'Atlas', 'Local', 'Disconnected'
  error: null,
  uri: ''
};

async function connectDB() {
  const atlasUri = process.env.MONGO_URI;
  const localUri = process.env.MONGO_LOCAL_URI || 'mongodb://127.0.0.1:27017/attendance';

  // Option configurations to prevent connection hangs
  const options = {
    serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
  };

  // 1. Try to connect to MongoDB Atlas
  if (atlasUri && !atlasUri.includes('xxxxx')) {
    console.log('Attempting to connect to MongoDB Atlas...');
    try {
      await mongoose.connect(atlasUri, options);
      dbStatus = {
        connected: true,
        type: 'Atlas',
        error: null,
        uri: atlasUri.replace(/:[^:@]+@/, ':****@') // mask password in logs
      };
      console.log('Successfully connected to MongoDB Atlas.');
      return mongoose.connection;
    } catch (err) {
      console.error('Failed to connect to MongoDB Atlas:', err.message);
      dbStatus.error = err.message;
    }
  } else {
    console.log('MongoDB Atlas URI is placeholder/empty. Skipping Atlas connect.');
    dbStatus.error = 'Atlas URI not configured in .env';
  }

  // 2. Fall back to Local MongoDB
  console.log('Attempting to connect to Local MongoDB as fallback...');
  try {
    await mongoose.connect(localUri, options);
    dbStatus = {
      connected: true,
      type: 'Local',
      error: null,
      uri: localUri
    };
    console.log('Successfully connected to Local MongoDB.');
    return mongoose.connection;
  } catch (err) {
    console.error('Failed to connect to Local MongoDB:', err.message);
    dbStatus = {
      connected: false,
      type: 'Disconnected',
      error: 'Atlas & Local connection failed. ' + err.message,
      uri: ''
    };
    // Don't crash the server, allow it to run in offline mode for UI demo purposes
    return null;
  }
}

function getDbStatus() {
  return dbStatus;
}

module.exports = {
  connectDB,
  getDbStatus
};
