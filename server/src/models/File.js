/**
 * File Model
 * Stores encrypted files (or chunks) only.
 */

import mongoose from "mongoose";

const fileSchema = new mongoose.Schema({
  owner: { type: String, required: true },
  receiver: { type: String, required: true },

  fileName: { type: String },
  
  encryptedChunks: { type: Array, default: [] },   // Array of ciphertext chunks
  metadata: { type: Object },                      // chunk size, IVs, tags

  uploadedAt: { type: Date, default: Date.now }
});

export default mongoose.model("File", fileSchema);
