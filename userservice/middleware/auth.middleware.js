import jwt from "jsonwebtoken";
import { ENV_VARS } from "../envVars.js";

export const verifyAccessToken = (req, res, next) => {
  try {

    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ message: "Access token required" });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, ENV_VARS.ACCESS_SECRET);

    req.user = decoded;

    next();

  } catch (error) {

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Access token expired" });
    }

    return res.status(403).json({ message: "Invalid token" });
  }
};