/**
 * Loads environment variables centrally.
 * Add your own variables as needed.
 */

import dotenv from "dotenv";
dotenv.config();

const config = {
  PORT: process.env.PORT || 5000,
  MONGO_URI: process.env.MONGO_URI || "mongodb://localhost:27017/secure-chat",
  JWT_SECRET: process.env.JWT_SECRET || "changeme-secret-key"
};

// ADMIN_USERS: comma-separated list of usernames or user ids allowed to query audits
config.ADMIN_USERS = (process.env.ADMIN_USERS || "").split(',').map(s => s.trim()).filter(Boolean);

export default config;
