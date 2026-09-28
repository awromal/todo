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

// API Documentation / Directory
app.get('/api', (req, res) => {
  res.status(200).json({
    service: 'TaskFlow MERN REST API',
    version: '1.0.0',
    documentation: {
      health: 'GET /health',
      tasks: {
        list: 'GET /api/tasks (query: ?status=todo|in-progress|completed&priority=low|medium|high&search=keyword)',
        create: 'POST /api/tasks (body: { title, description?, status?, priority?, dueDate? })',
        getById: 'GET /api/tasks/:id',
        update: 'PUT /api/tasks/:id (body: partial or complete task fields)',
        delete: 'DELETE /api/tasks/:id',
        summaryStats: 'GET /api/tasks/stats/summary',
      },
    },
  });
});

// API Routes
app.use('/api/tasks', taskRoutes);

// Catch 404 and forward to error handler
app.use(notFoundHandler);

// Centralized error handling
app.use(errorHandler);

module.exports = app;
