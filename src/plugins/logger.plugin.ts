// Request logging plugin with response time tracking
import { Elysia } from "elysia";

export const loggerPlugin = new Elysia({ name: "logger" })
  .derive(({ request }) => ({
    startTime: Date.now(),
  }))
  .onAfterHandle(({ request, path, startTime }) => {
    const duration = Date.now() - (startTime || Date.now());
    const timestamp = new Date().toISOString();
    console.log(
      `[${timestamp}] ${request.method} ${path} (${duration}ms)`
    );
  });
