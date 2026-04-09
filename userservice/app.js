import express from 'express';
import cookieParser from 'cookie-parser';
import { helmetMiddleware, corsMiddleware, generalRateLimiter } from './middleware/security.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import routes from './routes/index.js';
import logger from './config/logger.js';

const app = express();

app.use(helmetMiddleware);
app.use(corsMiddleware);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use((req, res, next) => {
  logger.http(`${req.method} ${req.url}`);
  next();
});

app.use(generalRateLimiter);

app.use('/api', routes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
