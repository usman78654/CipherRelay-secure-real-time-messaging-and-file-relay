import mongoose from 'mongoose';
import User from '../models/User.js';

const MONGODB_URI = 'mongodb://127.0.0.1:27017/secure-chat';

async function cleanupTestUsers() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✓ Connected to MongoDB\n');

    // Delete users that match test patterns
    const result = await User.deleteMany({
      username: { 
        $regex: /^(testuser_|cli_test_)/ 
      }
    });

    console.log(`✓ Deleted ${result.deletedCount} test users\n`);

    // Show remaining users
    const remainingUsers = await User.find({}, 'username _id').lean();
    console.log(`Remaining users (${remainingUsers.length}):`);
    remainingUsers.forEach(u => {
      console.log(`  - ${u.username}`);
    });

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

cleanupTestUsers();
