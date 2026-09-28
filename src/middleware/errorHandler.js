// 404 Not Found Middleware
const notFoundHandler = (req, res, next) => {
  const error = new Error(`Resource not found at ${req.originalUrl}`);
  res.status(404);
  next(error);
};

// Central Error Handler
const errorHandler = (err, req, res, next) => {
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let message = err.message || 'Internal Server Error';

  // Handle PostgreSQL Error Codes
  if (err.code === '22P02') {
    statusCode = 400;
    message = 'Invalid input syntax for parameter (e.g. invalid integer ID)';
  } else if (err.code === '23505') {
    statusCode = 400;
    message = 'Unique constraint violation: record already exists';
  } else if (err.code === '23502') {
    statusCode = 400;
    message = `Missing required field: ${err.column || 'not-null constraint violated'}`;
  }

  // Handle Mongoose Bad ObjectId (CastError)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid format for resource ID '${err.value}'`;
  }

  // Handle Mongoose Validation Error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((val) => val.message)
      .join(', ');
  }

  res.status(statusCode).json({
    success: false,
    error: message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
};

module.exports = {
  notFoundHandler,
  errorHandler,
};
