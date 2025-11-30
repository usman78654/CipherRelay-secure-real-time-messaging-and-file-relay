/**
 * Message Model
 * Stores ONLY encrypted message components.
 */

import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  chatId: { type: String, required: true },        // senderId + receiverId sorted
  sender: { type: String, required: true },
  receiver: { type: String, required: true },

  ciphertext: { type: String },                    // optional for file messages
  iv: { type: String },                            // optional for file messages
  authTag: { type: String },                       // optional depending on AES config

  // File attachment fields
  isFile: { type: Boolean, default: false },
  fileId: { type: String },                        // Reference to File document
  fileName: { type: String },
  fileSize: { type: Number },
  fileType: { type: String },

  metadata: { type: Object },                      // non-sensitive metadata

  timestamp: { type: Date, default: Date.now }
});

export default mongoose.model("Message", messageSchema);
