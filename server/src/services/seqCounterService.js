import SeqCounter from '../models/SeqCounter.js';

/** Atomically accept only a sequence number greater than the stored value. */
export async function verifyAndUpdateSeq({ ownerId, chatId, incomingSeq }) {
  if (!Number.isSafeInteger(incomingSeq) || incomingSeq < 0 || !ownerId || !chatId) throw new Error('Invalid sequence number');
  const filter = { ownerId, chatId };
  const updated = await SeqCounter.updateOne({ ...filter, seq: { $lt: incomingSeq } }, { $set: { seq: incomingSeq, updatedAt: new Date() } });
  if (updated.modifiedCount === 1) return { ok: true, current: incomingSeq };
  try {
    await SeqCounter.create({ ...filter, seq: incomingSeq, updatedAt: new Date() });
    return { ok: true, previous: null, current: incomingSeq };
  } catch (error) {
    if (error?.code === 11000) {
      const current = await SeqCounter.findOne(filter, { seq: 1 }).lean();
      return { ok: false, previous: current?.seq, current: current?.seq };
    }
    throw error;
  }
}

export async function getSeq({ ownerId, chatId }) {
  return (await SeqCounter.findOne({ ownerId, chatId }, { seq: 1 }).lean())?.seq ?? null;
}
