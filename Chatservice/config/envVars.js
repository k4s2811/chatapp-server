import dotenv from "dotenv";
dotenv.config();

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5100";

const CORS_ORIGINS = (process.env.CORS_ORIGINS || CLIENT_URL)
	.split(",")
	.map((o) => o.trim())
	.filter(Boolean);

export const ENV_VARS = {
	PORT: process.env.PORT,
	MONGO_URI: process.env.MONGO_URI,
	REDIS_URL: process.env.REDIS_URL,
	CLIENT_URL,
	CORS_ORIGINS,

	JWT_ACCESS_SECRET: process.env.JWT_SECRET,
	USERSERVICE_URL: process.env.USERSERVICE_URL || "http://userservice:3001",
};

if (!ENV_VARS.JWT_ACCESS_SECRET) {
	throw new Error(
		"Missing required env var: ACCESS (must match userservice's ACCESS secret)"
	);
}