# Create Elysia Plugin

Create a new plugin for cross-cutting concerns or reusable functionality.

## What are Plugins?

In Elysia, plugins handle lifecycle events and cross-cutting concerns like:
- Logging
- Error handling
- Authentication/Authorization
- Request/Response transformation
- Database connection injection
- CORS, Rate limiting, etc.

## Plugin Lifecycle Hooks

- `onRequest`: Before routing (earliest)
- `onBeforeHandle`: After validation, before handler
- `onAfterHandle`: After handler, before response
- `onError`: When error occurs
- `onResponse`: After response sent (latest)
- `derive`: Add properties to context
- `decorate`: Add global properties
- `onStop`: When server stops

## Steps

1. **Create Plugin File** (`src/plugins/{name}.plugin.ts`):
   - Use descriptive name (e.g., auth.plugin.ts, cors.plugin.ts)
   - Export named constant with "Plugin" suffix

2. **Define Plugin**:
   - Create new Elysia instance with name: `new Elysia({ name: "plugin-name" })`
   - Chain lifecycle hooks as needed
   - Keep plugin focused on single responsibility

3. **Register Plugin** (`src/index.ts`):
   - Import the plugin
   - Add to main app with `.use(plugin)`

## Example Patterns

### Logger Plugin (with timing)
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

### Error Handling Plugin
```typescript
import { Elysia } from "elysia";

export const errorPlugin = new Elysia({ name: "error-handler" })
  .onError(({ code, error, set }) => {
    console.error(`❌ Error [${code}]:`, error);

    if (code === "VALIDATION") {
      set.status = 422;
      return { error: "Validation Error", message: error.message };
    }

    set.status = 500;
    return { error: "Internal Server Error" };
  });
```

### Auth Plugin
```typescript
import { Elysia } from "elysia";

export const authPlugin = new Elysia({ name: "auth" })
  .derive(async ({ request, set }) => {
    const token = request.headers.get("Authorization")?.replace("Bearer ", "");

    if (!token) {
      set.status = 401;
      throw new Error("Unauthorized");
    }

    // Verify token and return user
    const user = await verifyToken(token);
    return { user };
  });
```

### Database Injection Plugin
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

## Best Practices

- Use `derive` for request-scoped data (e.g., auth user, timing)
- Use `decorate` for global shared resources (e.g., db, config)
- Keep plugins small and focused
- Use descriptive names
- Add cleanup in `onStop` if needed
- Plugins run in order, so register them carefully in index.ts

## Testing Plugins

```typescript
import { describe, test, expect } from "bun:test";
import { Elysia } from "elysia";
import { myPlugin } from "../src/plugins/my.plugin";

describe("MyPlugin", () => {
  test("should work correctly", async () => {
    const app = new Elysia()
      .use(myPlugin)
      .get("/test", () => "ok");

    const response = await app.handle(new Request("http://localhost/test"));
    expect(response.status).toBe(200);
  });
});
```

## Common Use Cases

- **Logger**: Request/response logging with timing
- **Error Handler**: Centralized error handling
- **Auth**: Authentication/authorization
- **CORS**: Cross-origin resource sharing
- **Rate Limit**: Request throttling
- **Compression**: Response compression
- **Cache**: Response caching
- **Validation**: Custom validation logic
- **Metrics**: Performance monitoring
