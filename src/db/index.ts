// Database connection management
import { Database } from "bun:sqlite";
import { initializeDatabase } from "./schema";

const DB_PATH = "./data.db";

export function createDatabase() {
  const db = new Database(DB_PATH, { create: true });

  // Enable WAL mode for better concurrent performance
  db.run("PRAGMA journal_mode = WAL");

  // Initialize schema
  initializeDatabase(db);

  return db;
}

export const db = createDatabase();
