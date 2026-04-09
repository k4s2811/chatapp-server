import express from 'express';
import AuthController from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';
import { authRateLimiter, passwordResetRateLimiter } from '../middleware/security.js';
import { validate } from '../utils/validators.js';
import {
  registerSchema,
  loginSchema,
  emailSchema,
  resetPasswordSchema,
  verifyTokenSchema
} from '../utils/validators.js';

const router = express.Router();

router.post(
  '/register',
  authRateLimiter,
  validate(registerSchema),
  AuthController.register
);

router.post(
  '/login',
  authRateLimiter,
  validate(loginSchema),
  AuthController.login
);

router.post(
  '/refresh-token',
  AuthController.refreshToken
);

router.post(
  '/logout',
  AuthController.logout
);

router.post(
  '/verify-email',
  validate(verifyTokenSchema),
  AuthController.verifyEmail
);

router.post(
  '/resend-verification',
  validate(emailSchema),
  AuthController.resendVerificationEmail
);

router.post(
  '/request-password-reset',
  passwordResetRateLimiter,
  validate(emailSchema),
  AuthController.requestPasswordReset
);

router.post(
  '/reset-password',
  validate(resetPasswordSchema),
  AuthController.resetPassword
);

router.get(
  '/profile',
  authenticate,
  AuthController.getProfile
);

export default router;
