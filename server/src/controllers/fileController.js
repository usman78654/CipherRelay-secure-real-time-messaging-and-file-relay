/**
 * File Controller
 * Stores encrypted files or chunks on the server.
 */

import FileModel from "../models/File.js";
import { logEvent } from "../services/logger.js";

export const uploadEncryptedFile = async (req, res) => {
  try {
    // File should already be encrypted by client.
    const uploadedInfo = req.body;
    // Expect: owner, receiver, fileName, encryptedChunks (array), metadata: { chunkSize, ivs, tags, timestamp }
    const { owner, receiver, encryptedChunks, metadata } = uploadedInfo;
    if (owner !== req.user.username) return res.status(403).json({ error: 'Owner must match authenticated user.' });
    if (!owner || !receiver || !Array.isArray(encryptedChunks) || encryptedChunks.length === 0) {
      return res.status(400).json({ error: "Invalid encrypted file upload." });
    }

    if (!metadata || (!metadata.timestamp && metadata.timestamp !== 0)) {
      await logEvent("file-upload-missing-metadata", { metadata }, owner);
      return res.status(400).json({ error: "Missing metadata.timestamp" });
    }

    // Check timestamp freshness
    const { verifyTimestamp } = await import("../utils/signatureVerify.js");
    const tsRes = verifyTimestamp(metadata.timestamp, 300);
    if (!tsRes.ok) {
      await logEvent("file-upload-stale-timestamp", { tsRes, metadata }, owner);
      return res.status(400).json({ error: "Stale or invalid timestamp." });
    }

    const fileDoc = new FileModel(uploadedInfo);
    await fileDoc.save();

    await logEvent("file-upload", { owner, receiver, fileName: uploadedInfo.fileName, chunks: encryptedChunks.length }, owner);
    res.status(201).json({ message: "Encrypted file uploaded.", fileId: fileDoc._id });
  } catch (err) {
    await logEvent("file-upload-error", { error: err.message, body: req.body }, req.body && req.body.owner ? req.body.owner : null);
    res.status(500).json({ error: "File upload failed." });
  }
};

export const downloadEncryptedFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    const fileDoc = await FileModel.findById(fileId);
    if (!fileDoc) return res.status(404).json({ error: 'File not found.' });
    if (![fileDoc.owner, fileDoc.receiver].includes(req.user.username)) return res.status(403).json({ error: 'Access denied.' });

    await logEvent("file-download", { fileId, requester: req.user ? req.user.id : null }, req.user ? req.user.id : null);
    res.json(fileDoc);
  } catch (err) {
    res.status(500).json({ error: "Failed to retrieve file." });
  }
};
