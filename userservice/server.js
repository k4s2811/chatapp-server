import app from './app.js';
import { config, validateConfig } from './config/env.js';
import logger from './config/logger.js';

validateConfig();

const PORT = config.port;

const server = app.listen(PORT, () => {
  logger.info(`Server running in ${config.env} mode on port ${PORT}`);
  logger.info(`API available at ${config.app.apiUrl}`);
});

const gracefulShutdown = () => {
  logger.info('Received shutdown signal, closing server gracefully...');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });

  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection:', err);
  gracefulShutdown();
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  gracefulShutdown();
});

export default server;
