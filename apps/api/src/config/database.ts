import mongoose from 'mongoose';
import { env } from './environment.js';

interface DatabaseStatus {
  connected: boolean;
  readyState: number;
  host?: string;
  name?: string;
  error?: string;
}

export const connectDatabase = async (): Promise<typeof mongoose> => {
  const uri = env.MONGODB_URI;

  mongoose.connection.on('connected', () => {
    console.log(`[MongoDB] Connected to database: ${mongoose.connection.name} on ${mongoose.connection.host}`);
  });

  mongoose.connection.on('error', (err) => {
    console.error('[MongoDB] Connection error:', err.message);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('[MongoDB] Disconnected from database');
  });

  try {
    return await mongoose.connect(uri, {
      dbName: env.MONGODB_DB_NAME,
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
    });
  } catch (error: any) {
    console.error(`[MongoDB] Initial connection failed: ${error.message}`);
    if (env.NODE_ENV === 'production') {
      throw new Error(`Production database startup failure: ${error.message}`);
    }
    // Do not crash process in local dev/testing if DB is booting
    return mongoose;
  }
};

export const getDatabaseStatus = (): DatabaseStatus => {
  const readyState = mongoose.connection.readyState;
  return {
    connected: readyState === 1,
    readyState,
    host: mongoose.connection.host || undefined,
    name: mongoose.connection.name || undefined,
  };
};

export const disconnectDatabase = async (): Promise<void> => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
};
