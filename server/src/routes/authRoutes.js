import express from "express";
import { register, login } from "../controllers/authController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import User from "../models/User.js";
import { authRateLimit } from '../middleware/rateLimit.js';

const router = express.Router();

router.post("/register", authRateLimit, register);
router.post("/login", authRateLimit, login);

// Get all users (for contact list)
router.get("/users", authMiddleware, async (req, res) => {
  try {
    const users = await User.find({}, 'username _id identityKeys').lean();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

export default router;
