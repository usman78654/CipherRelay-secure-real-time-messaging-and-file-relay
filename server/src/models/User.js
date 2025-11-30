/**
 * User Model
 * Stores username + passwordHash only.
 * No plaintext passwords or private keys.
 */

import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true }, // bcrypt/argon2 hash
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("User", userSchema);
