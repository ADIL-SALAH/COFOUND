import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import net from 'net';
import { ensureDefaultSeed } from '../services/seedService.ts';
import {
  restoreDatabaseSnapshot,
  saveDatabaseSnapshot,
  triggerDebouncedBackup,
} from '../services/persistenceService.ts';

let mongodInstance: MongoMemoryServer | null = null;

/**
 * Checks if a TCP host:port is accepting connections within timeoutMs
 */
function probePort(host: string, port: number, timeoutMs = 400): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let resolved = false;

    const cleanup = () => {
      if (!resolved) {
        resolved = true;
        socket.destroy();
      }
    };

    socket.setTimeout(timeoutMs);
    socket.once('connect', () => {
      cleanup();
      resolve(true);
    });
    socket.once('timeout', () => {
      cleanup();
      resolve(false);
    });
    socket.once('error', () => {
      cleanup();
      resolve(false);
    });

    try {
      socket.connect(port, host);
    } catch {
      cleanup();
      resolve(false);
    }
  });
}

export async function connectDB(): Promise<void> {
  const uriFromEnv = process.env.MONGODB_URI?.trim();

  // If a MONGODB_URI is provided, test if it's reachable
  if (uriFromEnv) {
    let shouldAttemptConnect = true;

    // Fast-fail check for local port 27017 to avoid 30s Mongoose freeze in containers
    if (uriFromEnv.includes('localhost') || uriFromEnv.includes('127.0.0.1')) {
      const isListening = await probePort('127.0.0.1', 27017, 300);
      if (!isListening) {
        console.log('No local MongoDB daemon on 127.0.0.1:27017. Skipping to embedded MongoDB...');
        shouldAttemptConnect = false;
      }
    }

    if (shouldAttemptConnect) {
      try {
        console.log('Connecting to provided MongoDB URI...');
        await mongoose.connect(uriFromEnv, {
          serverSelectionTimeoutMS: 2500,
        });
        console.log('Connected to MongoDB via URI successfully.');
        const restored = await restoreDatabaseSnapshot();
        if (!restored) {
          await ensureDefaultSeed();
        }
        return;
      } catch (err: any) {
        console.warn('Could not connect to provided MONGODB_URI, falling back to embedded MongoDB:', err.message);
      }
    }
  }

  // Use embedded MongoMemoryServer (ephemeral in-memory tmpdir: fast, zero locks, zero fassert crashes)
  console.log('Starting resilient embedded MongoDB instance...');
  try {
    mongodInstance = await MongoMemoryServer.create();
  } catch (err: any) {
    console.error('Failed to create MongoMemoryServer instance:', err);
    throw err;
  }

  const uri = mongodInstance.getUri();
  console.log(`Resilient embedded MongoDB started at: ${uri}`);
  await mongoose.connect(uri);
  console.log('Mongoose connected to embedded MongoDB successfully.');

  // Restore existing business data if snapshot exists, or seed default demo workspace
  try {
    const restored = await restoreDatabaseSnapshot();
    if (!restored) {
      await ensureDefaultSeed();
    }
    // Take immediate snapshot so data is stored to disk
    await saveDatabaseSnapshot();
  } catch (err) {
    console.warn('Error during data initialization / restore:', err);
  }
}

export async function disconnectDB(): Promise<void> {
  try {
    // Flush latest snapshot before disconnecting
    await saveDatabaseSnapshot();
    await mongoose.disconnect();
    if (mongodInstance) {
      await mongodInstance.stop();
    }
    console.log('MongoDB disconnected cleanly.');
  } catch (err) {
    console.error('Error during MongoDB disconnect:', err);
  }
}

// Clean shutdown handlers
process.on('SIGINT', async () => {
  await disconnectDB();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await disconnectDB();
  process.exit(0);
});
