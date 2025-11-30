/**
 * Audit Log Model
 * Stores logs for:
 * - authentication attempts
 * - invalid signatures
 * - replay detections
 * - key exchange events
 * - server metadata access
 */

import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema({
  eventType: { type: String, required: true },
  details: { type: Object },          // event-specific details
  userId: { type: String },
  timestamp: { type: Date, default: Date.now }
});

export default mongoose.model("AuditLog", auditLogSchema);
