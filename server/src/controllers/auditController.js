/**
 * Audit Controller
 * Shows authentication logs, key exchange logs, replay detection, etc.
 */

import AuditLog from "../models/AuditLog.js";

/**
 * GET /api/audit
 * Query params:
 * - eventType
 * - userId
 * - chatId (matches details.chatId)
 * - from (ISO date)
 * - to (ISO date)
 * - limit, page
 */
export const getAuditLogs = async (req, res) => {
  try {
    const { eventType, userId, chatId, from, to, limit = 100, page = 0 } = req.query;

    const q = {};
    if (eventType) q.eventType = eventType;
    if (userId) q.userId = userId;
    if (chatId) q['details.chatId'] = chatId;
    if (from || to) {
      q.timestamp = {};
      if (from) {
        const d = new Date(from);
        if (!isNaN(d)) q.timestamp.$gte = d;
      }
      if (to) {
        const d = new Date(to);
        if (!isNaN(d)) q.timestamp.$lte = d;
      }
      // remove empty timestamp
      if (Object.keys(q.timestamp).length === 0) delete q.timestamp;
    }

    const lim = Math.min(parseInt(limit, 10) || 100, 1000);
    const skip = Math.max(parseInt(page, 10) || 0, 0) * lim;

    const [logs, total] = await Promise.all([
      AuditLog.find(q).sort({ timestamp: -1 }).skip(skip).limit(lim).lean(),
      AuditLog.countDocuments(q)
    ]);

    res.json({ total, page: parseInt(page, 10) || 0, limit: lim, logs });
  } catch (err) {
    res.status(500).json({ error: "Failed to load audit logs." });
  }
};
