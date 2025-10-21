// Database plugin with dependency injection
import { Elysia } from "elysia";
import { Database } from "bun:sqlite";
import {
  createDatabaseConnection,
  initializeSchema,
  databaseConfig,
} from "../config/database";
import { UserService } from "../services/user.service";
import { UserController } from "../controllers/user.controller";

// Initialize database connection
const db = createDatabaseConnection(databaseConfig);
initializeSchema(db);

// Initialize services
const userService = new UserService(db);
const userController = new UserController(userService);

// Database plugin that injects services and controllers
export const databasePlugin = new Elysia({ name: "database" })
  .decorate("db", db)
  .decorate("userService", userService)
  .decorate("userController", userController)
  .onStop(() => {
    db.close();
    console.log("🔌 Database connection closed");
  });

// Type helper for context
export type DatabaseContext = {
  db: Database;
  userService: UserService;
  userController: UserController;
};
