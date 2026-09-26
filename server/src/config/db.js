import mongoose from 'mongoose';
import config from './env.js';
import { log } from '../services/telemetry.js';
export default async function connectDB() {
  await mongoose.connect(config.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
  log('info', 'database_connected');
}
