import AuthService from '../services/authService.js';
import { ApiError } from '../utils/ApiError.js';

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError(401, 'No token provided');
    }

    const token = authHeader.substring(7);
    const decoded = AuthService.verifyAccessToken(token);

    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      roles: decoded.roles
    };

    next();
  } catch (error) {
    next(error);
  }
};

export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = AuthService.verifyAccessToken(token);

      req.user = {
        userId: decoded.userId,
        email: decoded.email,
        roles: decoded.roles
      };
    }

    next();
  } catch (error) {
    next();
  }
};

export default { authenticate, optionalAuth };
