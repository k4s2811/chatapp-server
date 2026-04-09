import { ApiError } from '../utils/ApiError.js';

export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required'));
    }

    const userRoles = req.user.roles || [];
    const hasRole = roles.some(role => userRoles.includes(role));

    if (!hasRole) {
      return next(new ApiError(403, 'Insufficient permissions'));
    }

    next();
  };
};

export const requireAdmin = requireRole('admin');

export const requireModerator = requireRole('admin', 'moderator');

export default { requireRole, requireAdmin, requireModerator };
