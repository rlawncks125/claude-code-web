---
name: create-plugin
description: Create an Elysia plugin for cross-cutting concerns (logging, auth, error handling, CORS, rate limiting, caching)
allowed-tools: Read, Write, Edit, Bash
---

# Create Plugin Skill

Create an **Elysia plugin** to handle lifecycle events and cross-cutting concerns.

## When to Use This Skill

Use this skill when you need:
- **Cross-cutting functionality** that applies to multiple routes (logging, auth, CORS)
- **Lifecycle hooks** (onRequest, onAfterHandle, onError, etc.)
- **Global decorators** (inject database, config, services)
- **Request context** (add user, timing, request ID)

**Don't use for**:
- Entity-specific business logic (use Service classes)
- Route definitions (use Routes files)
- Database queries (use Service layer)

## What are Plugins?

Plugins in Elysia handle:
- **Logging and Monitoring**: Request/response logging, timing
- **Error Handling**: Centralized error responses
- **Authentication/Authorization**: JWT, sessions, API keys
- **Request/Response Transformation**: Compression, formatting
- **Database Injection**: Provide DB instance to routes
- **CORS**: Cross-origin resource sharing
- **Rate Limiting**: Throttle requests per IP
- **Caching**: Response caching

## Lifecycle Hooks

```
Request Flow:
┌─────────────────────────────────────────────────────┐
│  onRequest     → Earliest, before routing           │
│  onBeforeHandle → After validation, before handler  │
│  [Handler]     → Your route handler runs            │
│  onAfterHandle → After handler, before response     │
│  [Response]    → Response sent to client            │
│  onError       → If error occurs at any point       │
│  onStop        → When server stops                  │
└─────────────────────────────────────────────────────┘

Context Manipulation:
┌─────────────────────────────────────────────────────┐
│  derive        → Add request-scoped properties      │
│  decorate      → Add global properties to app       │
└─────────────────────────────────────────────────────┘
```

## Step-by-Step Guide

### Step 1: Create Plugin File

**File**: `src/plugins/{name}.plugin.ts`

```typescript
import { Elysia } from "elysia";

export const myPlugin = new Elysia({ name: "my-plugin" })
  // Add lifecycle hooks here
  .derive(({ request }) => ({
    // Request-scoped data
  }))
  .onRequest(({ request, path }) => {
    // Before routing
  })
  .onAfterHandle(({ request, response }) => {
    // After handler
  });
```

### Step 2: Register Plugin

**File**: `src/index.ts`

```typescript
import { myPlugin } from "./plugins/my.plugin";

const app = new Elysia()
  .use(myPlugin)  // Add here
  // ... rest of app
```

## Common Plugin Patterns

### Logger Plugin (with Response Time)

**File**: `src/plugins/logger.plugin.ts`

```typescript
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
```

### Error Handler Plugin

**File**: `src/plugins/error.plugin.ts`

```typescript
import { Elysia } from "elysia";

export const errorPlugin = new Elysia({ name: "error-handler" }).onError(
  ({ code, error, set }) => {
    console.error(`❌ Error [${code}]:`, error);

    if (code === "VALIDATION") {
      set.status = 422;
      return {
        success: false,
        error: "Validation Error",
        message: error.message,
      };
    }

    if (code === "NOT_FOUND") {
      set.status = 404;
      return {
        success: false,
        error: "Not Found",
        message: "Resource not found",
      };
    }

    if (code === "PARSE") {
      set.status = 400;
      return {
        success: false,
        error: "Parse Error",
        message: "Invalid request format",
      };
    }

    // Handle business logic errors
    if (error instanceof Error) {
      if (error.message.includes("not found")) {
        set.status = 404;
        return {
          success: false,
          error: "Not Found",
          message: error.message,
        };
      }

      if (error.message.includes("already exists")) {
        set.status = 409;
        return {
          success: false,
          error: "Conflict",
          message: error.message,
        };
      }

      set.status = 400;
      return {
        success: false,
        error: "Bad Request",
        message: error.message,
      };
    }

    // Internal server error
    set.status = 500;
    return {
      success: false,
      error: "Internal Server Error",
      message: "An unexpected error occurred",
    };
  }
);
```

### Authentication Plugin

**File**: `src/plugins/auth.plugin.ts`

```typescript
import { Elysia } from "elysia";

export const authPlugin = new Elysia({ name: "auth" })
  .derive(async ({ request, set }) => {
    const token = request.headers
      .get("Authorization")
      ?.replace("Bearer ", "");

    if (!token) {
      set.status = 401;
      throw new Error("Unauthorized: No token provided");
    }

    // Verify JWT token (example)
    try {
      const user = await verifyJWT(token);

      if (!user) {
        set.status = 401;
        throw new Error("Unauthorized: Invalid token");
      }

      return { user };
    } catch (err) {
      set.status = 401;
      throw new Error("Unauthorized: Token verification failed");
    }
  });

// Example JWT verification function
async function verifyJWT(token: string) {
  // Implement JWT verification
  // Return user object or null
  return { id: 1, email: "user@example.com" };
}

// Usage in protected routes:
// .get("/protected", ({ user }) => ({ user }))
```

### Database Injection Plugin

**File**: `src/plugins/database.plugin.ts`

```typescript
import { Elysia } from "elysia";
import { createDatabase, initializeSchema } from "../utils/database";

const db = createDatabase();
initializeSchema(db);

export const databasePlugin = new Elysia({ name: "database" })
  .decorate("db", db)
  .onStop(() => {
    db.close();
    console.log("🔌 Database connection closed");
  });
```

### CORS Plugin

**File**: `src/plugins/cors.plugin.ts`

```typescript
import { Elysia } from "elysia";

export const corsPlugin = new Elysia({ name: "cors" })
  .onBeforeHandle(({ request, set }) => {
    const origin = request.headers.get("Origin") || "*";

    set.headers["Access-Control-Allow-Origin"] = origin;
    set.headers["Access-Control-Allow-Methods"] =
      "GET, POST, PUT, DELETE, PATCH, OPTIONS";
    set.headers["Access-Control-Allow-Headers"] =
      "Content-Type, Authorization";
    set.headers["Access-Control-Allow-Credentials"] = "true";

    // Handle preflight
    if (request.method === "OPTIONS") {
      set.status = 204;
      return "";
    }
  });
```

### Request ID Plugin

**File**: `src/plugins/request-id.plugin.ts`

```typescript
import { Elysia } from "elysia";

export const requestIdPlugin = new Elysia({ name: "request-id" })
  .derive(() => ({
    requestId: crypto.randomUUID(),
  }))
  .onAfterHandle(({ set, requestId }) => {
    set.headers["X-Request-ID"] = requestId;
  });
```

### Rate Limiting Plugin

**File**: `src/plugins/rate-limit.plugin.ts`

```typescript
import { Elysia } from "elysia";

const requestCounts = new Map<
  string,
  { count: number; resetAt: number }
>();

export const rateLimitPlugin = new Elysia({ name: "rate-limit" })
  .onBeforeHandle(({ request, set }) => {
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    const now = Date.now();
    const limit = 100; // requests per minute
    const window = 60 * 1000; // 1 minute

    const record = requestCounts.get(ip);

    if (!record || now > record.resetAt) {
      requestCounts.set(ip, { count: 1, resetAt: now + window });
      return;
    }

    if (record.count >= limit) {
      set.status = 429;
      set.headers["Retry-After"] = String(
        Math.ceil((record.resetAt - now) / 1000)
      );
      throw new Error("Too many requests");
    }

    record.count++;
  });
```

### Response Caching Plugin

**File**: `src/plugins/cache.plugin.ts`

```typescript
import { Elysia } from "elysia";

interface CacheEntry {
  data: any;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

export const cachePlugin = new Elysia({ name: "cache" })
  .derive(({ request, path }) => {
    const cacheKey = `${request.method}:${path}`;
    const cached = cache.get(cacheKey);

    if (cached && Date.now() < cached.expiresAt) {
      return { cachedResponse: cached.data, cacheKey };
    }

    return { cachedResponse: null, cacheKey };
  })
  .onAfterHandle(({ request, cacheKey, cachedResponse, response }) => {
    // Return cached response if available
    if (cachedResponse) {
      return cachedResponse;
    }

    // Cache GET requests for 5 minutes
    if (request.method === "GET" && cacheKey) {
      cache.set(cacheKey, {
        data: response,
        expiresAt: Date.now() + 5 * 60 * 1000,
      });
    }

    return response;
  });
```

### Compression Plugin

**File**: `src/plugins/compression.plugin.ts`

```typescript
import { Elysia } from "elysia";

export const compressionPlugin = new Elysia({ name: "compression" })
  .onAfterHandle(async ({ request, response, set }) => {
    const acceptEncoding = request.headers.get("Accept-Encoding") || "";

    if (!acceptEncoding.includes("gzip")) {
      return response;
    }

    // Only compress JSON responses
    if (typeof response === "object") {
      const json = JSON.stringify(response);
      const compressed = await Bun.gzipSync(Buffer.from(json));

      set.headers["Content-Encoding"] = "gzip";
      set.headers["Content-Type"] = "application/json";

      return new Response(compressed);
    }

    return response;
  });
```

## Testing Plugins

**File**: `tests/plugins/{plugin}.test.ts`

```typescript
import { describe, test, expect } from "bun:test";
import { Elysia } from "elysia";
import { loggerPlugin } from "../src/plugins/logger.plugin";

describe("LoggerPlugin", () => {
  test("should log requests", async () => {
    const app = new Elysia()
      .use(loggerPlugin)
      .get("/test", () => "ok");

    const response = await app.handle(
      new Request("http://localhost/test")
    );

    expect(response.status).toBe(200);
    const text = await response.text();
    expect(text).toBe("ok");
  });

  test("should add timing to context", async () => {
    const app = new Elysia()
      .use(loggerPlugin)
      .get("/test", ({ startTime }) => ({
        startTime,
        hasStartTime: startTime !== undefined,
      }));

    const response = await app.handle(
      new Request("http://localhost/test")
    );

    const data = await response.json();
    expect(data.hasStartTime).toBe(true);
    expect(typeof data.startTime).toBe("number");
  });
});
```

## Plugin Best Practices

### 1. Use `derive` for Request-Scoped Data

```typescript
// ✅ Good - request-scoped
.derive(({ request }) => ({
  startTime: Date.now(),
  user: extractUser(request),
  requestId: crypto.randomUUID(),
}))

// ❌ Bad - shared across requests
let startTime = Date.now(); // Don't do this!
```

### 2. Use `decorate` for Global Resources

```typescript
// ✅ Good - global shared resources
.decorate("db", database)
.decorate("config", config)
.decorate("logger", logger)
```

### 3. Plugin Naming

```typescript
// ✅ Good - descriptive names
new Elysia({ name: "logger" })
new Elysia({ name: "auth" })
new Elysia({ name: "rate-limit" })

// ❌ Bad - generic names
new Elysia({ name: "plugin" })
new Elysia({ name: "middleware" })
```

### 4. Plugin Order Matters

```typescript
const app = new Elysia()
  .use(errorPlugin)    // 1. Error handler first
  .use(loggerPlugin)   // 2. Logger second
  .use(authPlugin)     // 3. Auth third
  .use(corsPlugin)     // 4. CORS
  // ... routes
```

### 5. Cleanup in onStop

```typescript
export const myPlugin = new Elysia({ name: "my-plugin" })
  .decorate("resource", resource)
  .onStop(() => {
    resource.cleanup();
    console.log("Resource cleaned up");
  });
```

### 6. Use WeakMap for Request Data

```typescript
// ✅ Good - auto garbage collection
const requestData = new WeakMap<Request, any>();

.onRequest(({ request }) => {
  requestData.set(request, { startTime: Date.now() });
})

// ❌ Bad - memory leak
const requestData = new Map<string, any>(); // Keys never cleaned up
```

## Verification Checklist

After creating a plugin:

- [ ] Plugin file created in `src/plugins/`
- [ ] Plugin registered in `src/index.ts`
- [ ] Plugin has descriptive name
- [ ] Uses appropriate lifecycle hooks
- [ ] Cleanup logic added (if needed)
- [ ] Plugin tested
- [ ] Documentation added (JSDoc comments)

## Common Issues

**Plugin Not Working**: Check if plugin is registered in correct order in `index.ts`

**Context Property Undefined**: Make sure to use `derive` for request-scoped data

**Memory Leak**: Use WeakMap for request-associated data

**Type Errors**: Add proper TypeScript types to derive/decorate return values
