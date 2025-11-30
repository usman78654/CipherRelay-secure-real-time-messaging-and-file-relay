/**
 * Authentication Controller
 * Stores hashed passwords only (no plaintext).
 */

import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import config from "../config/env.js";
import { logEvent } from "../services/logger.js";

const SALT_ROUNDS = 10;

export const register = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Missing username or password." });

    const existing = await User.findOne({ username });
    if (existing) return res.status(409).json({ error: "Username already exists." });

    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    const newUser = new User({ username, passwordHash: hash });
    await newUser.save();

    await logEvent("auth-register", { username }, newUser._id.toString());
    res.status(201).json({ message: "User registered." });
  } catch (err) {
    await logEvent("auth-register-error", { error: err.message, body: req.body }, null);
    res.status(500).json({ error: "Registration failed." });
  }
};

export const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Missing username or password." });

    const user = await User.findOne({ username });
    if (!user) {
      await logEvent("auth-login-failed", { username }, null);
      return res.status(401).json({ error: "Invalid credentials." });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      await logEvent("auth-login-failed", { userId: user._id.toString() }, user._id.toString());
      return res.status(401).json({ error: "Invalid credentials." });
    }

    const token = jwt.sign({ sub: user._id.toString(), username: user.username }, config.JWT_SECRET, { expiresIn: '8h' });

    await logEvent("auth-login", { userId: user._id.toString() }, user._id.toString());
    res.json({ user: { id: user._id.toString(), username: user.username }, token });
  } catch (err) {
    await logEvent("auth-login-error", { error: err.message, body: req.body }, null);
    res.status(500).json({ error: "Login failed." });
  }
};
