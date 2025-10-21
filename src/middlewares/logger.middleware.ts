// Request logging middleware
import { Elysia } from "elysia";

export const loggerMiddleware = new Elysia({ name: "logger" })
  .onRequest(({ request, path }) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${request.method} ${path}`);
  })
  .onAfterHandle(({ request, path, response }) => {
    const timestamp = new Date().toISOString();
    console.log(
      `[${timestamp}] ${request.method} ${path} - Status: ${
        (response as any)?.status || 200
      }`
    );
  });
