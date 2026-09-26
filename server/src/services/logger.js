import AuditLog from '../models/AuditLog.js';
import { log } from './telemetry.js';
// Audit identities stay in the access-controlled database; arbitrary payloads do not.
export function safeAuditDetails(details = {}) {
  const allowed = ['sender', 'receiver', 'owner', 'requester', 'reporter', 'count', 'chunks'];
  return Object.fromEntries(allowed.filter(key => ['string', 'number'].includes(typeof details[key])).map(key => [key, typeof details[key] === 'string' ? details[key].slice(0, 128) : details[key]]));
}
export async function logEvent(eventType, details = {}, userId = null) {
  try {
    await AuditLog.create({ eventType, details: safeAuditDetails(details), userId });
    log('info', eventType);
  } catch { log('error', 'audit_write_failed'); }
}
export default { logEvent };
