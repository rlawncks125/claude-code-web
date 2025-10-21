// Centralized error handling middleware
import { Elysia } from "elysia";

export const errorMiddleware = new Elysia({ name: "error-handler" }).onError(
  ({ code, error, set }) => {
    console.error(`❌ Error [${code}]:`, error);

    // Validation errors
    if (code === "VALIDATION") {
      set.status = 400;
      return {
        success: false,
        error: "Validation Error",
        message: "Invalid request data",
        details: error.message,
      };
    }

    // Not found errors
    if (code === "NOT_FOUND") {
      set.status = 404;
      return {
        success: false,
        error: "Not Found",
        message: "The requested resource was not found",
      };
    }

    // Parse errors
    if (code === "PARSE") {
      set.status = 400;
      return {
        success: false,
        error: "Parse Error",
        message: "Invalid request format",
      };
    }

    // Business logic errors
    if (error instanceof Error) {
      // User not found errors
      if (error.message.includes("not found")) {
        set.status = 404;
        return {
          success: false,
          error: "Not Found",
          message: error.message,
        };
      }

      // Duplicate/conflict errors
      if (error.message.includes("already exists")) {
        set.status = 409;
        return {
          success: false,
          error: "Conflict",
          message: error.message,
        };
      }

      // Other known errors
      set.status = 400;
      return {
        success: false,
        error: "Bad Request",
        message: error.message,
      };
    }

    // Internal server errors
    set.status = 500;
    return {
      success: false,
      error: "Internal Server Error",
      message: "An unexpected error occurred",
    };
  }
);
