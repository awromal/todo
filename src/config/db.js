const mongoose = require('mongoose');

let isConnected = false;
let dbMode = 'uninitialized';

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.warn('\n⚠️ [Database] MONGODB_URI not set. Falling back to in-memory store.');
    isConnected = false;
    dbMode = 'in-memory-fallback';
    return { isConnected: false, mode: dbMode };
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 4000,
    });
    isConnected = true;
    dbMode = 'mongodb';
    console.log(`\n✅ [Database] MongoDB Connected: ${conn.connection.host} (${conn.connection.name})`);
    return { isConnected: true, mode: dbMode, host: conn.connection.host };
  } catch (error) {
    console.warn(`\n⚠️ [Database] Could not connect to MongoDB (${error.message}).`);
    console.warn('   Operating in local in-memory fallback mode so the server remains fully functional.');
    console.warn('   For production, set MONGODB_URI in your environment variables to a MongoDB Atlas cluster.\n');
    isConnected = false;
    dbMode = 'in-memory-fallback';
    return { isConnected: false, mode: dbMode, error: error.message };
  }
};

const getDbStatus = () => ({
  isConnected,
  mode: dbMode,
  databaseName: isConnected ? mongoose.connection?.name : 'in-memory',
  host: isConnected ? mongoose.connection?.host : 'local-memory',
});

module.exports = {
  connectDB,
  getDbStatus,
};
