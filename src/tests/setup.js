import mongoose from 'mongoose';
import { beforeAll, afterAll } from 'vitest';

// Use in-memory MongoDB for testing
const MONGODB_URI = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/productly-test';

beforeAll(async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to test database');
  } catch (error) {
    console.error('Failed to connect to test database:', error);
    process.exit(1);
  }
});

afterAll(async () => {
  try {
    // Clean up all collections
    const collections = await mongoose.connection.db.collections();
    for (const collection of collections) {
      await collection.deleteMany({});
    }

    await mongoose.connection.close();
    console.log('Disconnected from test database');
  } catch (error) {
    console.error('Error cleaning up test database:', error);
  }
});