import { body, validationResult } from 'express-validator';

export function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ success: false, message: "Validation failed", errors: errors.array() });
  }
  next();
}

export const registerRules = [
  body('email')
    .isEmail().withMessage('Valid email is required')
    .normalizeEmail()
    .isLength({ max: 255 }).withMessage('Email too long'),
  body('name')
    .trim()
    .isLength({ min: 3, max: 50 }).withMessage('Name must be 3–50 characters')
    .matches(/^[a-zA-Z0-9_ ]+$/).withMessage('Name can only contain letters, numbers, and underscores'),
  body('password')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
    .matches(/[A-Za-z]/).withMessage('Password must contain at least one letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number'),
];

export const loginRules = [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

export const changePasswordRules = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
    .matches(/[A-Za-z]/).withMessage('Must contain at least one letter')
    .matches(/[0-9]/).withMessage('Must contain at least one number'),
];

export const resetPasswordRules = [
  body('token').notEmpty().withMessage('Reset token is required'),
  body('newPassword')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
    .matches(/[A-Za-z]/).withMessage('Must contain at least one letter')
    .matches(/[0-9]/).withMessage('Must contain at least one number'),
];
