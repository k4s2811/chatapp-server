import bcrypt from 'bcrypt';
import User from '../models/User.js';
import { ENV_VARS } from '../config/envVars.js';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import Role from '../models/Role.js';
import { RefreshToken, EmailVerificationToken, PasswordResetToken } from '../models/Token.js';
import { emailService } from './emailService.js';
import { ApiError } from '../utils/ApiError.js';


export async function register({ email, password, name }) {
  if (password.length < 4) {
    throw new ApiError(400, 'Password must be at least 4 characters');
  }
  const existingUser = await User.findByEmail(email);
  if (existingUser) {
    throw new ApiError(409, 'Email already registered');
  }

  const salt = await bcrypt.genSalt(12);
  const passwordHash = await bcrypt.hash(password, salt);

  const user = await User.create({
    email,
    passwordHash,
    name
  });

  const defaultRole = await Role.findByName('user');
  if (defaultRole) {
    await Role.assignToUser(user.id, defaultRole.id);
  }

  const verificationToken = await EmailVerificationToken.create(user.id);
  await emailService.sendVerificationEmail(email, verificationToken.token);

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    isEmailVerified: user.is_email_verified
  };
}

export async function login({ email, password }) {
  const user = await User.findByEmail(email);
  if (!user) {
    throw new ApiError(401, 'Invalid email or password');
  }

  if (!user.is_active) {
    throw new ApiError(403, 'Account is deactivated');
  }

  const isLocked = await User.isLocked(user.id);
  if (isLocked) {
    throw new ApiError(423, 'Account is temporarily locked due to too many failed login attempts');
  }

  const isPasswordValid = await bcrypt.compare(password, user.password_hash);
  if (!isPasswordValid) {
    await User.incrementFailedAttempts(user.id);
    throw new ApiError(401, 'Invalid email or password');
  }

  await User.resetFailedAttempts(user.id);

  const roles = await Role.getUserRoles(user.id);
  const accessToken = this.generateAccessToken(user, roles);
  const refreshToken = this.generateRefreshToken();

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await RefreshToken.create(user.id, refreshToken, expiresAt.toISOString());

  return {
    user: {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      isEmailVerified: user.is_email_verified,
      roles: roles.map(r => r.name)
    },
    accessToken,
    refreshToken
  };
}

export async function refreshAccessToken(refreshToken) {
  const tokenData = await RefreshToken.findByToken(refreshToken);
  if (!tokenData) {
    throw new ApiError(401, 'Invalid refresh token');
  }

  if (new Date(tokenData.expires_at) < new Date()) {
    throw new ApiError(401, 'Refresh token expired');
  }

  const user = await User.findById(tokenData.user_id);
  if (!user || !user.is_active) {
    throw new ApiError(401, 'User not found or inactive');
  }

  const roles = await Role.getUserRoles(user.id);
  const accessToken = this.generateAccessToken(user, roles);

  return { accessToken };
}

export async function logout(refreshToken) {
  await RefreshToken.revoke(refreshToken);
  return true;
}

export async function verifyEmail(token) {
  const tokenData = await EmailVerificationToken.findByToken(token);
  if (!tokenData) {
    throw new ApiError(400, 'Invalid or expired verification token');
  }

  await User.verifyEmail(tokenData.user_id);
  await EmailVerificationToken.deleteByUserId(tokenData.user_id);

  return true;
}

export async function requestPasswordReset(email) {
  const user = await User.findByEmail(email);
  if (!user) {
    return true;
  }

  const resetToken = await PasswordResetToken.create(user.id);
  await emailService.sendPasswordResetEmail(email, resetToken.token);

  return true;
}

export async function resetPassword(token, newPassword) {
  const tokenData = await PasswordResetToken.findByToken(token);
  if (!tokenData) {
    throw new ApiError(400, 'Invalid or expired reset token');
  }

  const passwordHash = await bcrypt.hash(newPassword, config.security.bcryptRounds);
  await User.updatePassword(tokenData.user_id, passwordHash);
  await PasswordResetToken.markAsUsed(token);

  return true;
}

export async function resendVerificationEmail(email) {
  const user = await User.findByEmail(email);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  if (user.is_email_verified) {
    throw new ApiError(400, 'Email already verified');
  }

  await EmailVerificationToken.deleteByUserId(user.id);
  const verificationToken = await EmailVerificationToken.create(user.id);
  await emailService.sendVerificationEmail(email, verificationToken.token);

  return true;
}

export async function generateAccessToken(user, roles) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      roles: roles.map(r => r.name),
      type: 'access'
    },
    config.jwt.accessSecret,
    { expiresIn: config.jwt.accessExpiry }
  );
}

export async function generateRefreshToken() {
  return uuidv4();
}

export async function verifyAccessToken(token) {
  try {
    return jwt.verify(token, config.jwt.accessSecret);
  } catch (error) {
    throw new ApiError(401, 'Invalid or expired token');
  }
}


export default AuthService;
