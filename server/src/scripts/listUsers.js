import mongoose from 'mongoose';
import User from '../models/User.js';

const MONGODB_URI = 'mongodb://127.0.0.1:27017/secure-chat';

async function listUsers() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✓ Connected to MongoDB\n');

    const users = await User.find({}, 'username _id createdAt').lean();
    
    console.log(`Found ${users.length} users:\n`);
    users.forEach((u, i) => {
      console.log(`${i + 1}. ${u.username}`);
      console.log(`   ID: ${u._id}`);
      if (u.createdAt) console.log(`   Created: ${u.createdAt}`);
      console.log();
    });

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

listUsers();
