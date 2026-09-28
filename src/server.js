require('dotenv').config();
const app = require('./app');
const { connectDB } = require('./config/db');

const PORT = process.env.PORT || 5000;

// Initialize Database & Start Server
const startServer = async () => {
  // Connect to Database (with resilient in-memory fallback)
  await connectDB();

  const server = app.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`🚀 TaskFlow Backend Application is running!`);
    console.log(`📡 URL: http://localhost:${PORT}`);
    console.log(`🩺 Health check: http://localhost:${PORT}/health`);
    console.log(`📋 API Explorer: http://localhost:${PORT}/api/tasks`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`======================================================\n`);
  });

  // Graceful shutdown handling
  const shutdown = (signal) => {
    console.log(`\nReceived ${signal}. Shutting down gracefully...`);
    server.close(() => {
      console.log('HTTP server closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

startServer();
