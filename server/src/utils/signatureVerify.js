import crypto from "crypto";

/**
 * Verify a digital signature (RSA or ECDSA) over arbitrary data.
 *
 * @param {Object} opts
 * @param {string|Buffer} opts.publicKeyPem - Public key in PEM format
 * @param {string|Buffer} opts.data - The original message/data that was signed
 * @param {string} opts.signatureB64 - Signature encoded as base64
 * @param {string} [opts.hashAlg='sha256'] - Hash algorithm used by the signer
 * @returns {{valid: boolean, error?: string}}
 */
export function verifySignature({ publicKeyPem, data, signatureB64, hashAlg = "sha256" }) {
	if (!publicKeyPem) return { valid: false, error: "missing publicKeyPem" };
	if (!data && data !== "") return { valid: false, error: "missing data" };
	if (!signatureB64) return { valid: false, error: "missing signature" };

	try {
		const verifier = crypto.createVerify(hashAlg);
		// Accept Buffer or string
		if (Buffer.isBuffer(data)) {
			verifier.update(data);
		} else {
			verifier.update(String(data), "utf8");
		}
		verifier.end();

		const signature = Buffer.from(signatureB64, "base64");
		const valid = verifier.verify(publicKeyPem, signature);
		return { valid };
	} catch (err) {
		return { valid: false, error: String(err) };
	}
}

/**
 * Check a timestamp for freshness to help mitigate replay attacks.
 *
 * @param {number|string} ts - timestamp in seconds since epoch or numeric string
 * @param {number} [maxSkewSec=300] - allowed clock skew in seconds (default 5 minutes)
 * @returns {{ok: boolean, error?: string, ageSec?: number}}
 */
export function verifyTimestamp(ts, maxSkewSec = 300) {
	if (ts === undefined || ts === null) return { ok: false, error: "missing timestamp" };
	const parsed = Number(ts);
	if (Number.isNaN(parsed)) return { ok: false, error: "invalid timestamp" };

	const nowSec = Math.floor(Date.now() / 1000);
	const age = Math.abs(nowSec - parsed);
	if (age > maxSkewSec) {
		return { ok: false, error: "timestamp out of allowed skew", ageSec: age };
	}
	return { ok: true, ageSec: age };
}
