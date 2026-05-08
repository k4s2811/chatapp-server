import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { ENV_VARS } from "../config/envVars.js";

export const generateAccessToken = (payload) => {
  return jwt.sign(payload, ENV_VARS.JWT.ACCESS_SECRET, {
    expiresIn: ENV_VARS.JWT.ACCESS_TOKEN_EXPIRES,
    issuer: 'auth-backend',
    jwtid: uuidv4(),
  });
};

export const generateRefreshToken = (payload) => {
  return jwt.sign(payload, ENV_VARS.JWT.REFRESH_SECRET, {
    expiresIn: ENV_VARS.JWT.REFRESH_TOKEN_EXPIRES,
    issuer: 'auth-backend',
    jwtid: uuidv4(),
  });
};

export const verifyAccessToken = (token) => {
  return jwt.verify(token, ENV_VARS.JWT.ACCESS_SECRET, { issuer: 'auth-backend' });
};

export const verifyRefreshToken = (token) => {
  return jwt.verify(token, ENV_VARS.JWT.REFRESH_SECRET, { issuer: 'auth-backend' });
};

export const decodeToken = (token) => {
  return jwt.decode(token);
};