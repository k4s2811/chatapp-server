import AuthService from '../services/auth.service.js';
import { ApiError } from '../utils/ApiError.js';
import logger from '../config/logger.js';

export class AuthController {
  static async register(req, res, next) {
    try {
      const { email, password, firstName, lastName } = req.body;

      const user = await AuthService.register({
        email,
        password,
        firstName,
        lastName
      });

      logger.info(`New user registered: ${email}`);

      res.status(201).json({
        success: true,
        message: 'Registration successful. Please check your email to verify your account.',
        data: { user }
      });
    } catch (error) {
      next(error);
    }
  }

  static async login(req, res, next) {
    try {
      const { email, password } = req.body;

      const result = await AuthService.login({ email, password });

      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      logger.info(`User logged in: ${email}`);

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          user: result.user,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async refreshToken(req, res, next) {
    try {
      const refreshToken = req.body.refreshToken || req.cookies.refreshToken;

      if (!refreshToken) {
        throw new ApiError(400, 'Refresh token is required');
      }

      const result = await AuthService.refreshAccessToken(refreshToken);

      res.status(200).json({
        success: true,
        message: 'Token refreshed successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  static async logout(req, res, next) {
    try {
      const refreshToken = req.body.refreshToken || req.cookies.refreshToken;

      if (refreshToken) {
        await AuthService.logout(refreshToken);
      }

      res.clearCookie('refreshToken');

      logger.info(`User logged out`);

      res.status(200).json({
        success: true,
        message: 'Logout successful'
      });
    } catch (error) {
      next(error);
    }
  }

  static async verifyEmail(req, res, next) {
    try {
      const { token } = req.body;

      await AuthService.verifyEmail(token);

      logger.info(`Email verified for token: ${token.substring(0, 10)}...`);

      res.status(200).json({
        success: true,
        message: 'Email verified successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  static async resendVerificationEmail(req, res, next) {
    try {
      const { email } = req.body;

      await AuthService.resendVerificationEmail(email);

      res.status(200).json({
        success: true,
        message: 'Verification email sent'
      });
    } catch (error) {
      next(error);
    }
  }

  static async requestPasswordReset(req, res, next) {
    try {
      const { email } = req.body;

      await AuthService.requestPasswordReset(email);

      res.status(200).json({
        success: true,
        message: 'If the email exists, a password reset link has been sent'
      });
    } catch (error) {
      next(error);
    }
  }

  static async resetPassword(req, res, next) {
    try {
      const { token, password } = req.body;

      await AuthService.resetPassword(token, password);

      logger.info(`Password reset completed`);

      res.status(200).json({
        success: true,
        message: 'Password reset successful'
      });
    } catch (error) {
      next(error);
    }
  }

  static async getProfile(req, res, next) {
    try {
      res.status(200).json({
        success: true,
        data: {
          user: req.user
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

export default AuthController;
