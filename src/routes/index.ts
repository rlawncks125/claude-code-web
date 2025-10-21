// Routes aggregator
import { Elysia } from "elysia";
import { userRoutes } from "./user.routes";

// Combine all route modules with API prefix
export const routes = new Elysia({ prefix: "/api/v1" })
  .get(
    "/health",
    () => ({
      status: "ok",
      timestamp: new Date().toISOString(),
      service: "Elysia CRUD API",
    }),
    {
      detail: {
        tags: ["Health"],
        summary: "Health check",
        description: "Check if the API is running",
      },
    }
  )
  .use(userRoutes);
