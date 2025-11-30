/**
 * JWT verification middleware.
 */

import jwt from "jsonwebtoken";
import config from "../config/env.js";
import { logEvent } from "../services/logger.js";

export const authMiddleware = (req, res, next) => {
  const header = req.headers["authorization"] || req.headers["Authorization"];
  if (!header) {
    return res.status(401).json({ error: "No token provided." });
  }

  const parts = header.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return res.status(401).json({ error: "Invalid authorization header." });
  }

  const token = parts[1];
  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);
    req.user = { id: decoded.sub, username: decoded.username };
    next();
  } catch (err) {
    logEvent("auth-invalid-token", { error: err.message, tokenSnippet: token.slice(0,8) }, null);
    return res.status(401).json({ error: "Invalid or expired token." });
  }
};
