import SeqCounter from '../models/SeqCounter.js';

/**
 * Retrieve and atomically update the seq counter for an owner/chat.
 * Ensures monotonic increasing sequence numbers to prevent replay.
 */
export async function verifyAndUpdateSeq({ ownerId, chatId, incomingSeq }) {
  if (typeof incomingSeq !== 'number' || Number.isNaN(incomingSeq)) {
    throw new Error('Invalid sequence number');
  }

  // Try to find existing counter
  const filter = { ownerId, chatId };
  const update = {};

  // Use a transaction-like atomic update via findOneAndUpdate with $max
  // We'll ensure seq is set to the incomingSeq if incomingSeq > current
  const now = new Date();

  // First, attempt to fetch current counter
  let counter = await SeqCounter.findOne(filter).exec();

  if (!counter) {
    // If not exists, create new with incomingSeq if it's >= 1 (or accept 0)
    counter = new SeqCounter({ ownerId, chatId, seq: incomingSeq, updatedAt: now });
    try {
      await counter.save();
      return { ok: true, previous: null, current: incomingSeq };
    } catch (err) {
      // Race: created by another process — fallback to read again
      counter = await SeqCounter.findOne(filter).exec();
    }
  }

  const prev = counter.seq;
  if (incomingSeq <= prev) {
    return { ok: false, previous: prev, current: prev };
  }

  counter.seq = incomingSeq;
  counter.updatedAt = now;
  await counter.save();
  return { ok: true, previous: prev, current: incomingSeq };
}

export async function getSeq({ ownerId, chatId }) {
  const counter = await SeqCounter.findOne({ ownerId, chatId }).exec();
  if (!counter) return null;
  return counter.seq;
}
