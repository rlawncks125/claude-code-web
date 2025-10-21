// Database configuration
import { Database } from "bun:sqlite";

export interface DatabaseConfig {
  path: string;
  enableWAL: boolean;
}

export const databaseConfig: DatabaseConfig = {
  path: process.env.DB_PATH || "./data.db",
  enableWAL: true,
};

export function createDatabaseConnection(config: DatabaseConfig): Database {
  const db = new Database(config.path, { create: true });

  if (config.enableWAL) {
    db.run("PRAGMA journal_mode = WAL");
  }

  return db;
}

export function initializeSchema(db: Database): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create trigger for updated_at
  db.run(`
    CREATE TRIGGER IF NOT EXISTS update_user_timestamp
    AFTER UPDATE ON users
    FOR EACH ROW
    BEGIN
      UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END
  `);

  console.log("✅ Database schema initialized");
}
