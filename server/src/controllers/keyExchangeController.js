/**
 * Key Exchange Controller
 * Transfers public components of key exchange ONLY.
 * Never touches or stores private keys.
 *
 * This implementation enforces:
 * - signature verification using supplied public key PEM
 * - timestamp freshness checks
 * - simple replay detection by searching for identical payloads
 */

import KeyExchange from "../models/KeyExchange.js";
import { verifySignature, verifyTimestamp } from "../utils/signatureVerify.js";
import { logEvent } from "../services/logger.js";

const REPLAY_WINDOW_SEC = 300; // 5 minutes

function makeSignedPayloadString({ sender, receiver, step, publicData }) {
  // Use a canonical representation for signature verification.
  // Expect clients to sign this exact JSON string (stable key ordering ensured by JSON.stringify)
  return JSON.stringify({ sender, receiver, step, publicData });
}

export const initiate = async (req, res) => {
  try {
    const { sender, receiver, step, publicData } = req.body;

    if (!sender || !receiver || !step || !publicData) {
      await logEvent("key-exchange-missing-fields", { body: req.body }, sender || null);
      return res.status(400).json({ error: "Missing required fields." });
    }

    // Expect publicData to include: payload (string), signature (base64), pubKeyPem (PEM)
    const { payload, signature, pubKeyPem, timestamp } = publicData;

    if (!payload || !signature || !pubKeyPem) {
      await logEvent("key-exchange-invalid-format", { publicData }, sender);
      return res.status(400).json({ error: "Invalid publicData format." });
    }

    // Verify timestamp freshness if provided
    if (timestamp) {
      const tsRes = verifyTimestamp(timestamp, REPLAY_WINDOW_SEC);
      if (!tsRes.ok) {
        await logEvent("key-exchange-stale-timestamp", { tsRes, publicData }, sender);
        return res.status(400).json({ error: "Stale or invalid timestamp." });
      }
    }

    // Verify signature over the payload
    const verifyRes = verifySignature({ publicKeyPem: pubKeyPem, data: payload, signatureB64: signature });
    if (!verifyRes.valid) {
      await logEvent("invalid-signature", { verifyRes, publicData }, sender);
      return res.status(400).json({ error: "Invalid signature." });
    }

    // Simple replay detection: check for identical payload recently stored
    const recent = await KeyExchange.findOne({ "publicData.payload": payload, createdAt: { $gt: new Date(Date.now() - REPLAY_WINDOW_SEC * 1000) } });
    if (recent) {
      await logEvent("replay-detected", { payloadSnippet: payload.slice(0, 80) }, sender);
      return res.status(409).json({ error: "Replay detected." });
    }

    const packet = new KeyExchange({ sender, receiver, step, publicData });
    await packet.save();

    await logEvent("key-exchange-initiate", { sender, receiver }, sender);
    res.status(201).json({ message: "Key exchange initiation stored." });
  } catch (err) {
    await logEvent("key-exchange-error", { error: err.message, body: req.body }, req.body && req.body.sender ? req.body.sender : null);
    res.status(500).json({ error: "Failed to process initiation." });
  }
};

export const respond = async (req, res) => {
  try {
    const { sender, receiver, step, publicData } = req.body;
    if (!sender || !receiver || !step || !publicData) {
      await logEvent("key-exchange-missing-fields", { body: req.body }, sender || null);
      return res.status(400).json({ error: "Missing required fields." });
    }

    const { payload, signature, pubKeyPem, timestamp } = publicData;
    if (!payload || !signature || !pubKeyPem) {
      await logEvent("key-exchange-invalid-format", { publicData }, sender);
      return res.status(400).json({ error: "Invalid publicData format." });
    }

    if (timestamp) {
      const tsRes = verifyTimestamp(timestamp, REPLAY_WINDOW_SEC);
      if (!tsRes.ok) {
        await logEvent("key-exchange-stale-timestamp", { tsRes, publicData }, sender);
        return res.status(400).json({ error: "Stale or invalid timestamp." });
      }
    }

    const verifyRes = verifySignature({ publicKeyPem: pubKeyPem, data: payload, signatureB64: signature });
    if (!verifyRes.valid) {
      await logEvent("invalid-signature", { verifyRes, publicData }, sender);
      return res.status(400).json({ error: "Invalid signature." });
    }

    const recent = await KeyExchange.findOne({ "publicData.payload": payload, createdAt: { $gt: new Date(Date.now() - REPLAY_WINDOW_SEC * 1000) } });
    if (recent) {
      await logEvent("replay-detected", { payloadSnippet: payload.slice(0, 80) }, sender);
      return res.status(409).json({ error: "Replay detected." });
    }

    const packet = new KeyExchange({ sender, receiver, step, publicData });
    await packet.save();

    await logEvent("key-exchange-respond", { sender, receiver }, sender);
    res.json({ message: "Key exchange response stored." });
  } catch (err) {
    await logEvent("key-exchange-error", { error: err.message, body: req.body }, req.body && req.body.sender ? req.body.sender : null);
    res.status(500).json({ error: "Failed to process response." });
  }
};

export const confirm = async (req, res) => {
  try {
    const { sender, receiver, step, publicData } = req.body;
    if (!sender || !receiver || !step || !publicData) {
      await logEvent("key-exchange-missing-fields", { body: req.body }, sender || null);
      return res.status(400).json({ error: "Missing required fields." });
    }

    const { payload, signature, pubKeyPem, timestamp } = publicData;
    if (!payload || !signature || !pubKeyPem) {
      await logEvent("key-exchange-invalid-format", { publicData }, sender);
      return res.status(400).json({ error: "Invalid publicData format." });
    }

    if (timestamp) {
      const tsRes = verifyTimestamp(timestamp, REPLAY_WINDOW_SEC);
      if (!tsRes.ok) {
        await logEvent("key-exchange-stale-timestamp", { tsRes, publicData }, sender);
        return res.status(400).json({ error: "Stale or invalid timestamp." });
      }
    }

    const verifyRes = verifySignature({ publicKeyPem: pubKeyPem, data: payload, signatureB64: signature });
    if (!verifyRes.valid) {
      await logEvent("invalid-signature", { verifyRes, publicData }, sender);
      return res.status(400).json({ error: "Invalid signature." });
    }

    const packet = new KeyExchange({ sender, receiver, step, publicData });
    await packet.save();

    await logEvent("key-exchange-confirm", { sender, receiver }, sender);
    res.json({ message: "Key confirmation processed." });
  } catch (err) {
    await logEvent("key-exchange-error", { error: err.message, body: req.body }, req.body && req.body.sender ? req.body.sender : null);
    res.status(500).json({ error: "Failed to process confirmation." });
  }
};
