/**
 * Message Controller
 * Stores ONLY ciphertext, IV, metadata—never plaintext.
 */

import Message from "../models/Message.js";
import { verifyTimestamp } from "../utils/signatureVerify.js";
import { logEvent } from "../services/logger.js";
import { verifyAndUpdateSeq } from "../services/seqCounterService.js";

const REPLAY_WINDOW_SEC = 300; // 5 minutes

export const sendMessage = async (req, res) => {
  try {
    /*
      Expected payload:
      {
        sender,
        receiver,
        ciphertext,
        iv,
        authTag,
        metadata: { nonce, timestamp, seqNum }
      }
    */
    const { sender, receiver, ciphertext, iv, authTag, metadata } = req.body;

    if (!sender || !receiver || !ciphertext || !iv) {
      await logEvent("message-invalid-format", { body: req.body }, sender || null);
      return res.status(400).json({ error: "Missing required encrypted fields." });
    }

    // metadata must contain at least timestamp and nonce or seqNum
    if (!metadata || (!metadata.timestamp && metadata.timestamp !== 0)) {
      await logEvent("message-missing-metadata", { metadata }, sender);
      return res.status(400).json({ error: "Missing metadata.timestamp" });
    }

    // Verify timestamp freshness
    const tsRes = verifyTimestamp(metadata.timestamp, REPLAY_WINDOW_SEC);
    if (!tsRes.ok) {
      await logEvent("message-stale-timestamp", { tsRes, metadata }, sender);
      return res.status(400).json({ error: "Stale or invalid timestamp." });
    }

    // Simple replay detection using nonce or seqNum
    if (metadata.nonce) {
      const recent = await Message.findOne({ "metadata.nonce": metadata.nonce, createdAt: { $gt: new Date(Date.now() - REPLAY_WINDOW_SEC * 1000) } });
      if (recent) {
        await logEvent("message-replay-detected", { nonce: metadata.nonce }, sender);
        return res.status(409).json({ error: "Replay detected." });
      }
    } else if (metadata.seqNum !== undefined || metadata.seq !== undefined) {
      const incomingSeq = metadata.seqNum !== undefined ? metadata.seqNum : metadata.seq;
      // Use DB-backed seq counter to ensure monotonic increasing sequence numbers
      try {
        const seqRes = await verifyAndUpdateSeq({ ownerId: receiver, chatId: req.body.chatId, incomingSeq });
        if (!seqRes.ok) {
          await logEvent('message-replay-detected', { seqNum: incomingSeq, chatId: req.body.chatId, seqRes }, sender);
          return res.status(409).json({ error: 'Replay detected (sequence number too low).' });
        }
      } catch (err) {
        await logEvent('message-seq-error', { error: err.message, incomingSeq, chatId: req.body.chatId }, sender);
        return res.status(400).json({ error: 'Invalid sequence number.' });
      }
    }

    const msg = new Message({ ...req.body });
    await msg.save();

    await logEvent("message-stored", { chatId: req.body.chatId, sender, receiver }, sender);
    res.status(201).json({ message: "Encrypted message stored." });
  } catch (err) {
    await logEvent("message-store-error", { error: err.message, body: req.body }, req.body && req.body.sender ? req.body.sender : null);
    res.status(500).json({ error: "Failed to store message." });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    console.log('getMessages called with chatId:', chatId);

    const messages = await Message.find({ chatId });
    console.log(`Found ${messages.length} messages for chatId: ${chatId}`);
    
    // Log metadata access
    await logEvent("message-fetch", { chatId, requester: req.user ? req.user.id : null, count: messages.length }, req.user ? req.user.id : null);
    res.json(messages);
  } catch (err) {
    console.error('getMessages error:', err);
    res.status(500).json({ error: "Failed to fetch messages." });
  }
};
