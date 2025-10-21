// Database schema definition and initialization
import type { Database } from "bun:sqlite";

export interface User {
  id: number;
  name: string;
  email: string;
  created_at: string;
}

export type CreateUser = Omit<User, "id" | "created_at">;
export type UpdateUser = Partial<CreateUser>;

export function initializeDatabase(db: Database) {
  // Create users table
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log("Database initialized successfully");
}
