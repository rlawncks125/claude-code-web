// Main application entry point
import { Elysia } from "elysia";
import { dbPlugin } from "./plugins/db";
import { usersRoutes } from "./routes/users";

const app = new Elysia()
  // Use database plugin for dependency injection
  .use(dbPlugin)
  // Global error handler
  .onError(({ code, error, set }) => {
    console.error(`Error [${code}]:`, error);

    if (code === "VALIDATION") {
      set.status = 400;
      return {
        error: "Validation Error",
        message: error.message,
      };
    }

    if (code === "NOT_FOUND") {
      set.status = 404;
      return {
        error: "Not Found",
        message: "The requested resource was not found",
      };
    }

    set.status = 500;
    return {
      error: "Internal Server Error",
      message: "An unexpected error occurred",
    };
  })
  // Health check endpoint
  .get("/", () => ({
    message: "Elysia CRUD API is running!",
    timestamp: new Date().toISOString(),
  }))
  .get("/health", () => ({
    status: "ok",
    timestamp: new Date().toISOString(),
  }))
  // Use users routes plugin
  .use(usersRoutes);

// Start server
app.listen(process.env.PORT || 3000);
console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);

// Export for testing
export { app };
