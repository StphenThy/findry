import mongoose from 'mongoose';
import { config } from './config';

let memoryServer: { stop(): Promise<boolean> } | null = null;

/**
 * Connect to MongoDB Atlas when MONGODB_URI is set; otherwise spin up an
 * in-memory MongoDB so `npm run dev` works with zero setup. The in-memory
 * server downloads a mongod binary (~100 MB) the first time it runs.
 */
export async function connectDB(): Promise<{ inMemory: boolean }> {
  mongoose.set('strictQuery', true);
  if (config.mongoUri) {
    await mongoose.connect(config.mongoUri);
    console.log('[db] connected to MongoDB');
    return { inMemory: false };
  }
  console.warn('[db] MONGODB_URI is empty — starting in-memory MongoDB (data is lost on restart)');
  const { MongoMemoryServer } = await import('mongodb-memory-server');
  const mem = await MongoMemoryServer.create({ instance: { dbName: 'findry' } });
  memoryServer = mem;
  await mongoose.connect(mem.getUri());
  console.log('[db] in-memory MongoDB ready');
  return { inMemory: true };
}

export async function disconnectDB() {
  await mongoose.disconnect();
  if (memoryServer) await memoryServer.stop();
}
