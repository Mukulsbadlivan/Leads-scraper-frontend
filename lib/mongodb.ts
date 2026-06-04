import { MongoClient, Db } from "mongodb";

const uri = process.env.MONGODB_URI || "mongodb://localhost:27017";
const dbName = process.env.DATABASE_NAME || "icp_leads";

let client: MongoClient | null = null;
let db: Db | null = null;

export async function getDb(): Promise<Db> {
  if (db) return db;

  if (!client) {
    client = new MongoClient(uri, {
      connectTimeoutMS: 10_000,
      socketTimeoutMS: 45_000,
      maxPoolSize: 10,
    });
    await client.connect();
  }

  db = client.db(dbName);
  return db;
}

export async function closeConnection(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
  }
}
