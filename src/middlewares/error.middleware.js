// src/middlewares/error.middleware.js

// 404 Handler for undefined routes
export const notFound = (req, res, next) => {
  const error = new Error(`🔍 Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

// Helper to get user-friendly error message
const getUserFriendlyMessage = (err) => {
  // MongoDB connection errors
  if (err.name === 'MongoNetworkError' || err.name === 'MongoTimeoutError') {
    return 'Unable to connect to the database. Please try again later.';
  }

  // MongoDB server errors
  if (err.name === 'MongoServerError') {
    if (err.code === 11000) {
      // Duplicate key error
      const field = Object.keys(err.keyPattern || {})[0];
      return field ? `This ${field} is already registered.` : 'This record already exists.';
    }
    return 'A database error occurred. Please try again.';
  }

  // Mongoose validation errors
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors || {}).map((e) => e.message);
    return messages.length > 0 ? messages.join(', ') : 'Validation failed.';
  }

  // Mongoose cast errors (invalid ObjectId, etc)
  if (err.name === 'CastError') {
    return 'Invalid data format provided.';
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return 'Invalid authentication token. Please log in again.';
  }
  if (err.name === 'TokenExpiredError') {
    return 'Your session has expired. Please log in again.';
  }

  // Network/connection errors
  if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
    return 'Unable to connect to the service. Please try again later.';
  }

  // File upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return 'File size is too large. Please upload a smaller file.';
  }
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return 'Invalid file upload. Please check the file type and try again.';
  }

  // Property access errors (like user.id when user is undefined)
  if (err instanceof TypeError && err.message.includes('Cannot read property')) {
    return 'Unable to process your request. Please try again.';
  }
  if (err instanceof TypeError && err.message.includes('Cannot read properties of undefined')) {
    return 'Unable to process your request. Please try again.';
  }

  // Default: use the error message if it seems user-friendly, otherwise generic
  const message = err.message || 'An unexpected error occurred';
  
  // If message contains technical terms, return generic message
  const technicalTerms = ['undefined', 'null', 'stack', 'trace', 'TypeError', 'ReferenceError'];
  const isTechnical = technicalTerms.some(term => message.includes(term));
  
  return isTechnical ? 'Something went wrong. Please try again.' : message;
};

// Centralized Error Handler
export const errorHandler = (err, req, res, next) => {
  // Default status code
  let statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;

  // Adjust status code based on error type
  if (err.name === 'ValidationError') statusCode = 400;
  if (err.name === 'CastError') statusCode = 400;
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') statusCode = 401;
  if (err.name === 'MongoNetworkError' || err.name === 'MongoTimeoutError') statusCode = 503;

  // Log error details for debugging (server-side only)
  if (process.env.NODE_ENV === "development") {
    console.error("🔥 Error:", err);
  } else {
    // In production, log minimal info
    console.error(`Error [${err.name}]: ${err.message}`);
  }

  // Get user-friendly message
  const userMessage = getUserFriendlyMessage(err);

  // Structure of error response
  res.status(statusCode).json({
    success: false,
    message: userMessage,
    ...(process.env.NODE_ENV === "development" && {
      stack: err.stack,
      originalMessage: err.message,
    }),
  });
};
