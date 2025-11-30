import AuditLog from "../models/AuditLog.js";

/**
 * Log an audit event to the database and console.
 * eventType: string (authentication, key-exchange, replay-detected, invalid-signature, file-access, etc.)
 * details: object with event-specific data
 */
export async function logEvent(eventType, details = {}, userId = null) {
	try {
		const doc = new AuditLog({ eventType, details, userId });
		await doc.save();
		console.log(`[AUDIT] ${eventType}`, { userId, details });
	} catch (err) {
		console.error("Failed to write audit log:", err.message);
	}
}

export default { logEvent };
