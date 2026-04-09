import jwt from "jsonwebtoken"
import { ENV_VARS } from "../envVars.js"

export const generateAccessToken = (user) => {
    return jwt.sign(
        { userId: user._id, role: user.role },
        ENV_VARS.ACCESS_SECRET,
        { expiresIn: ENV_VARS.ACCESS_TOKEN_EXPIRES }
    );
};

export const generateRefreshToken = (user) => {
    return jwt.sign(
        { userId: user._id },
        ENV_VARS.REFRESH_SECRET,
        { expiresIn: ENV_VARS.REFRESH_TOKEN_EXPIRES }
    );
};