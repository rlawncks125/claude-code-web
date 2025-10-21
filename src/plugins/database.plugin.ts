// Database plugin - simplified (Elysia Best Practice)
import { Elysia } from "elysia";
import {
  createDatabaseConnection,
  initializeSchema,
  databaseConfig,
} from "../config/database";

// Initialize database connection
const db = createDatabaseConnection(databaseConfig);
initializeSchema(db);

// Simple database plugin - only injects db instance
export const databasePlugin = new Elysia({ name: "database" })
  .decorate("db", db)
  .onStop(() => {
    db.close();
    console.log("🔌 Database connection closed");
  });
