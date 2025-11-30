/**
 * Key Exchange Model
 * Stores handshake messages (public values only).
 * No private keys are stored — ever.
 */

import mongoose from "mongoose";

const keyExchangeSchema = new mongoose.Schema({
  sender: { type: String, required: true },
  receiver: { type: String, required: true },

  step: { type: String, required: true },          // initiate, respond, confirm

  publicData: { type: Object, required: true },    // ECDH public part, signatures, timestamps

  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("KeyExchange", keyExchangeSchema);
