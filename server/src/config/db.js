/**
 * MongoDB connection using Mongoose.
 * Does NOT store any plaintext, keys, or sensitive info.
 */

import mongoose from "mongoose";
import config from "./env.js";

const connectDB = async () => {
  try {
    await mongoose.connect(config.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log("MongoDB connected.");
  } catch (err) {
    console.error("MongoDB connection error:", err.message);
    process.exit(1);
  }
};

export default connectDB;
