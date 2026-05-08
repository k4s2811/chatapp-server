import logger from "../utils/logger.js";

export const errorHandler = (err, req, res, next) => {

  req.log.error({
    err,
    url: req.originalUrl,
    method: req.method,
    userId: req.user?.id,
  });

  res.status(500).json({
    success: false,
    message: "Internal Server Error",
  });
};