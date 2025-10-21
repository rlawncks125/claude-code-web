// Database plugin for dependency injection
import { Elysia } from "elysia";
import { db } from "../db";

// Plugin to inject database into context
export const dbPlugin = new Elysia({ name: "db" })
  .decorate("db", db)
  .onStop(() => {
    db.close();
    console.log("Database connection closed");
  });
