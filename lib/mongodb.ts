import { MongoClient } from "mongodb";

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

export default function getMongoClient(): Promise<MongoClient> {
  if (global._mongoClientPromise) return global._mongoClientPromise;
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("Please define MONGODB_URI in .env.local");
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000, connectTimeoutMS: 10000 });
  const connection = client.connect().catch(async (error: unknown) => {
    if (global._mongoClientPromise === connection) global._mongoClientPromise = undefined;
    await client.close().catch(() => undefined);
    throw error;
  });
  global._mongoClientPromise = connection;
  return connection;
}

export const dbName = process.env.MONGODB_DB || "oria_exam_supplies";
