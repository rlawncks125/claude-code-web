// Main application entry point
import { Elysia } from "elysia";
// import { swagger } from "@elysiajs/swagger";  // Install with: bun add @elysiajs/swagger
import { appConfig } from "./config/app";
import { databasePlugin } from "./plugins/database.plugin";
import { errorMiddleware } from "./middlewares/error.middleware";
import { loggerMiddleware } from "./middlewares/logger.middleware";
import { routes } from "./routes";

// Create main application
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
  // Add middlewares
  .use(errorMiddleware)
  .use(loggerMiddleware)
  // Add database plugin
  .use(databasePlugin)
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
