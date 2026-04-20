import dotenv from "dotenv";
dotenv.config();



export const ENV_VARS = {
	PORT: process.env.PORT || 5000,
	MONGO_URI: process.env.MONGO_URI,
	REDIS_URL: process.env.REDIS_URL,
	JWT_SECRET: process.env.JWT_SECRET,
};
