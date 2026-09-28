const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const path = require('path');
const { getDbStatus } = require('./config/db');
const taskRoutes = require('./routes/taskRoutes');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const app = express();

// Security Headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
      },
    },
  })
);

// Enable CORS for all origins
app.use(cors());

// HTTP Request Logger
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Body Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve Static Frontend Dashboard
app.use(express.static(path.join(__dirname, '../public')));

// System Health Check Endpoint
app.get('/health', (req, res) => {
  const dbStatus = getDbStatus();
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'development',
    nodeVersion: process.version,
    database: {
      status: dbStatus.isConnected ? 'connected' : 'fallback-memory',
      mode: dbStatus.mode,
      host: dbStatus.host,
      name: dbStatus.databaseName,
    },
  });
});

// Task Routes (mounted on /tasks, with /api/tasks alias for compatibility)
app.use('/tasks', taskRoutes);
app.use('/api/tasks', taskRoutes);

// Catch 404 and forward to error handler
app.use(notFoundHandler);

// Centralized error handling
app.use(errorHandler);

module.exports = app;
