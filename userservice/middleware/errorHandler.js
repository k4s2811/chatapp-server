import { ApiError } from '../utils/ApiError.js';
import logger from '../config/logger.js';
import { config } from '../config/env.js';

export const errorHandler = (err, req, res, next) => {
  let error = err;

  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || 500;
    const message = error.message || 'Internal server error';
    error = new ApiError(statusCode, message, false, err.stack);
  }

  const response = {
    success: false,
    message: error.message,
    ...(config.env === 'development' && { stack: error.stack })
  };

  if (config.env === 'development') {
    logger.error(`${error.statusCode} - ${error.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
  }

  if (!error.isOperational) {
    logger.error('Unexpected error:', error);
  }

  res.status(error.statusCode).json(response);
};

export const notFoundHandler = (req, res, next) => {
  const error = new ApiError(404, `Route not found: ${req.originalUrl}`);
  next(error);
};

export default { errorHandler, notFoundHandler };
