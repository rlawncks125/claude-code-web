// Main application entry point
import { Elysia } from "elysia";
// import { swagger } from "@elysiajs/swagger";  // Install with: bun add @elysiajs/swagger
import { errorPlugin } from "./plugins/error.plugin";
import { loggerPlugin } from "./plugins/logger.plugin";
import { routes } from "./routes";
import { createDatabase, initializeSchema } from "./utils/database";

// ========================================
// Configuration
// ========================================
const appConfig = {
  port: parseInt(process.env.PORT || "3000"),
  host: process.env.HOST || "0.0.0.0",
  env: process.env.NODE_ENV || "development",
  cors: {
    origin: process.env.CORS_ORIGIN || "*",
  },
  api: {
    prefix: "/api",
    version: "v1",
  },
} as const;

// ========================================
// Database Setup
// ========================================
const dbPath = process.env.DB_PATH || "./data.db";
const db = createDatabase(dbPath);
initializeSchema(db);

// ========================================
// Application
// ========================================
const app = new Elysia()
  // Add Swagger documentation (uncomment when @elysiajs/swagger is installed)
  // .use(
  //   swagger({
  //     documentation: {
  //       info: {
  //         title: "Elysia CRUD API Documentation",
  //         version: "1.0.0",
  //         description: "A well-structured CRUD API built with Elysia.js and SQLite",
  //       },
  //       tags: [
  //         { name: "Health", description: "Health check endpoints" },
  //         { name: "Users", description: "User management endpoints" },
  //       ],
  //     },
  //     path: "/docs",
  //   })
  // )
  // Add plugins
  .use(errorPlugin)
  .use(loggerPlugin)
  // Inject database instance
  .decorate("db", db)
  .onStop(() => {
    db.close();
    console.log("🔌 Database connection closed");
  })
  // Add routes
  .use(routes)
  // Root endpoint
  .get("/", () => ({
    message: "Welcome to Elysia CRUD API (Best Practice Edition)",
    version: "1.0.0",
    endpoints: {
      health: "/api/v1/health",
      users: "/api/v1/users",
    },
    timestamp: new Date().toISOString(),
  }))
  // Start server
  .listen(appConfig.port);

console.log(`
🦊 Elysia server is running!

🌐 Server: http://${app.server?.hostname}:${app.server?.port}
🔍 Health: http://${app.server?.hostname}:${app.server?.port}/api/v1/health
👥 Users API: http://${app.server?.hostname}:${app.server?.port}/api/v1/users

Environment: ${appConfig.env}
`);

// Export app for testing
export { app };
