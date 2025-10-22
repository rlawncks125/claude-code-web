// Database utility functions
import { Database } from "bun:sqlite";

/**
 * Create database connection with WAL mode enabled
 */
export function createDatabase(path: string = "./data.db"): Database {
  const db = new Database(path, { create: true });

  // Enable WAL mode for better performance
  db.run("PRAGMA journal_mode = WAL");

  return db;
}

/**
 * Initialize database schema (tables and triggers)
 */
export function initializeSchema(db: Database): void {
  // Create users table
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
