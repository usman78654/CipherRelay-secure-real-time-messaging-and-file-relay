import { verifyTimestamp as _verifyTimestamp } from "./signatureVerify.js";

/**
 * Thin wrapper around verifyTimestamp to provide a shared helper.
 * Re-exports the same result shape.
 */
export function verifyTimestamp(ts, maxSkewSec = 300) {
  return _verifyTimestamp(ts, maxSkewSec);
}

export default { verifyTimestamp };
