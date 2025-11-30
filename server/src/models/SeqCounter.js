import mongoose from 'mongoose';

const SeqCounterSchema = new mongoose.Schema({
  ownerId: { type: String, required: true, index: true }, // user id or pair id
  chatId: { type: String, required: true, index: true },
  seq: { type: Number, required: true, default: 0 },
  updatedAt: { type: Date, default: Date.now }
});

SeqCounterSchema.index({ ownerId: 1, chatId: 1 }, { unique: true });

export default mongoose.model('SeqCounter', SeqCounterSchema);
