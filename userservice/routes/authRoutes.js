const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth.middleware');
const {
  validate,
  registerRules,
  loginRules,
  changePasswordRules,
  resetPasswordRules,
} = require('../middlewares/validate.middleware');
const {
  register,
  login,
  refresh,
  logout,
  logoutAll,
  me,
  verifyEmail,
  forgotPassword,
  resetPassword,
  changePassword,
} = require('../controllers/auth.controller');

router.post('/register', registerRules, validate, register);
router.post('/login', loginRules, validate, login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.post('/logout-all', authenticate, logoutAll);
router.get('/me', authenticate, me);
router.post('/verify-email', verifyEmail);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPasswordRules, validate, resetPassword);
router.post('/change-password', authenticate, changePasswordRules, validate, changePassword);

module.exports = router;