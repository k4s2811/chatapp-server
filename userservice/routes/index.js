import express from 'express';
import authRoutes from './authRoutes.js';

const router = express.Router();

router.use('/auth', authRoutes);

router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API is running',
    timestamp: new Date().toISOString()
  });
});

export default router;
