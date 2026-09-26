import AuditLog from "../models/AuditLog.js";
import { safeAuditDetails } from './logger.js';
import { log } from './telemetry.js';

/**
 * Audit service - helper wrapper around AuditLog model.
 * Provides a small, consistent API for controllers and sockets to record and query audit events.
 */

export async function record(eventType, details = {}, userId = null) {
  try {
    const doc = new AuditLog({ eventType, details: safeAuditDetails(details), userId });
    await doc.save();
    return doc;
  } catch (err) {
    // Don't throw for audit failures; log to console instead.
    log('error', 'audit_write_failed');
    return null;
  }
}

export async function query(filter = {}, options = {}) {
  const { limit = 100, sort = { timestamp: -1 }, skip = 0 } = options;
  try {
    return await AuditLog.find(filter).sort(sort).skip(skip).limit(limit).lean();
  } catch (err) {
    log('error', 'audit_query_failed');
    return [];
  }
}

export default { record, query };
