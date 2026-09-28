const app = require('../src/app');
const { connectDB } = require('../src/config/db');

let isConnected = false;

// Ensure DB is initialized for serverless invocations
module.exports = async (req, res) => {
  if (!isConnected) {
    await connectDB();
    isConnected = true;
  }
  return app(req, res);
};
