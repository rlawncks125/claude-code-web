---
name: add-endpoint
description: Add a new API endpoint to an existing entity following Elysia.js patterns (search, pagination, filtering, batch operations)
allowed-tools: Read, Edit, Write, Bash, Grep
---

# Add Endpoint Skill

Add a new API endpoint to an **existing entity** following Elysia.js patterns.

## When to Use This Skill

Use this skill when you need to:
- **Add a single endpoint** to an existing entity (e.g., search, filter, batch operation)
- **Extend entity functionality** without creating a new entity
- **Follow existing patterns** in the codebase

**Don't use for**:
- Creating a new entity from scratch (use `create-crud-entity` skill)
- Major refactoring of existing endpoints (use direct editing)

## Common Endpoint Patterns

This skill covers:
- **Search**: Find entities by keyword
- **Pagination**: List entities with page/limit
- **Filtering**: Filter by status, date range, etc.
- **Batch Operations**: Delete/update multiple items
- **Custom Actions**: Archive, publish, duplicate, etc.

## Step-by-Step Guide

### Step 1: Update Model (if needed)

If your endpoint needs request validation, add a schema to the model namespace.

**File**: `src/models/{entity}.model.ts`

```typescript
// Example: Adding search schema
export namespace UserModel {
  // ... existing schemas

  export const search = t.Object({
    query: t.String({ minLength: 1, maxLength: 100 }),
  });
  export type Search = typeof search.static;
}
```

**Common schema patterns**:

```typescript
// Pagination
export const pagination = t.Object({
  page: t.Optional(t.Numeric({ minimum: 1, default: 1 })),
  limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100, default: 20 })),
});

// Filter
export const filter = t.Object({
  status: t.Optional(t.Union([t.Literal("active"), t.Literal("inactive")])),
  createdAfter: t.Optional(t.String({ format: "date" })),
});

// Batch delete
export const batchDelete = t.Object({
  ids: t.Array(t.Numeric({ minimum: 1 }), { minItems: 1 }),
});
```

### Step 2: Add Service Method

Add a static method to the existing service class.

**File**: `src/services/{entity}.service.ts`

```typescript
// Example: Search method
export abstract class UserService {
  // ... existing methods

  /**
   * Search users by name or email
   */
  static searchUsers(db: Database, query: string): UserModel.Entity[] {
    const sql = db.query(
      "SELECT * FROM users WHERE name LIKE ? OR email LIKE ? LIMIT 50"
    );
    const pattern = `%${query}%`;
    return sql.all(pattern, pattern) as UserModel.Entity[];
  }
}
```

**Common service patterns**:

```typescript
// Pagination
static getUsersWithPagination(
  db: Database,
  page: number = 1,
  limit: number = 20
): UserModel.Entity[] {
  const offset = (page - 1) * limit;
  const query = db.query("SELECT * FROM users LIMIT ? OFFSET ?");
  return query.all(limit, offset) as UserModel.Entity[];
}

// Filtering
static filterUsers(
  db: Database,
  filters: { status?: string; createdAfter?: string }
): UserModel.Entity[] {
  let sql = "SELECT * FROM users WHERE 1=1";
  const params: any[] = [];

  if (filters.status) {
    sql += " AND status = ?";
    params.push(filters.status);
  }

  if (filters.createdAfter) {
    sql += " AND created_at >= ?";
    params.push(filters.createdAfter);
  }

  const query = db.query(sql);
  return query.all(...params) as UserModel.Entity[];
}

// Batch delete
static deleteMany(db: Database, ids: number[]): number {
  const placeholders = ids.map(() => "?").join(",");
  const query = db.query(`DELETE FROM users WHERE id IN (${placeholders})`);
  const result = query.run(...ids);
  return result.changes;
}
```

### Step 3: Add Route

Chain the new route to the existing routes file.

**File**: `src/routes/{entity}.routes.ts`

```typescript
// Example: Adding search route
export const userRoutes = new Elysia({ prefix: "/users" })
  // ... existing routes
  .post(
    "/search",
    ({ db, body }) => UserService.searchUsers(db, body.query),
    {
      body: UserModel.search,
      detail: {
        tags: ["Users"],
        summary: "Search users",
        description: "Search users by name or email",
      },
    }
  );
```

**Route patterns by HTTP method**:

```typescript
// GET with query params (pagination)
.get(
  "/paginated",
  ({ db, query }) => UserService.getUsersWithPagination(
    db,
    query.page,
    query.limit
  ),
  {
    query: UserModel.pagination,
  }
)

// GET with query params (filter)
.get(
  "/filter",
  ({ db, query }) => UserService.filterUsers(db, query),
  {
    query: UserModel.filter,
  }
)

// POST with body (batch delete)
.post(
  "/batch-delete",
  ({ db, body }) => {
    const count = UserService.deleteMany(db, body.ids);
    return {
      success: true,
      message: `Deleted ${count} users`,
    };
  },
  {
    body: UserModel.batchDelete,
  }
)

// PATCH for custom action
.patch(
  "/:id/archive",
  ({ db, params }) => UserService.archiveUser(db, params.id),
  {
    params: UserModel.params,
  }
)
```

### Step 4: Add Tests

Add integration test to existing test file.

**File**: `tests/{entity}.test.ts`

```typescript
describe("POST /users/search", () => {
  test("should search users by query", async () => {
    // Create test data
    await app.handle(
      new Request("http://localhost:3000/api/v1/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "홍길동",
          email: "hong@test.com",
        }),
      })
    );

    // Test search
    const response = await app.handle(
      new Request("http://localhost:3000/api/v1/users/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: "홍길동" }),
      })
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
    expect(data[0].name).toContain("홍길동");
  });

  test("should return empty array for no matches", async () => {
    const response = await app.handle(
      new Request("http://localhost:3000/api/v1/users/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: "nonexistent" }),
      })
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual([]);
  });
});
```

Add unit test to existing service test file.

**File**: `tests/{entity}.service.test.ts`

```typescript
describe("searchUsers", () => {
  test("should find users by name", () => {
    UserService.createUser(db, {
      name: "홍길동",
      email: "hong@test.com",
    });

    const results = UserService.searchUsers(db, "홍길동");
    expect(results.length).toBe(1);
    expect(results[0].name).toBe("홍길동");
  });

  test("should find users by email", () => {
    UserService.createUser(db, {
      name: "홍길동",
      email: "hong@test.com",
    });

    const results = UserService.searchUsers(db, "hong@");
    expect(results.length).toBe(1);
  });

  test("should return empty array for no matches", () => {
    const results = UserService.searchUsers(db, "nonexistent");
    expect(results).toEqual([]);
  });
});
```

### Step 5: Run Tests

```bash
bun test
```

## Endpoint Design Best Practices

### 1. URL Design

```
GET    /entities          # List (with optional query params)
GET    /entities/:id      # Get one
POST   /entities          # Create
PUT    /entities/:id      # Update
DELETE /entities/:id      # Delete

# Additional endpoints:
POST   /entities/search   # Complex search (use POST for body)
GET    /entities/paginated?page=1&limit=20  # Pagination
POST   /entities/batch-delete  # Batch operations
PATCH  /entities/:id/archive   # Custom actions
```

### 2. Use Appropriate HTTP Methods

- **GET**: Retrieving data (no body, use query params)
- **POST**: Creating or complex operations with body
- **PUT**: Full update
- **PATCH**: Partial update or custom actions
- **DELETE**: Deletion

### 3. Response Format

```typescript
// Success with data
return entity;

// Success with message
return {
  success: true,
  message: "Operation completed",
  data: entity,
};

// Errors are handled by error plugin automatically
```

### 4. Performance Considerations

```typescript
// Always add LIMIT for list queries
db.query("SELECT * FROM users LIMIT 100");

// Use pagination for large datasets
const offset = (page - 1) * limit;
db.query("SELECT * FROM users LIMIT ? OFFSET ?");

// Add indexes for frequently queried fields
db.run("CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)");
```

## Verification Checklist

After adding the endpoint:

- [ ] Schema added to model (if needed)
- [ ] Service method added with JSDoc comment
- [ ] Route added with proper HTTP method
- [ ] Validation schemas attached to route
- [ ] Swagger detail added (tags, summary, description)
- [ ] Integration test added
- [ ] Unit test added
- [ ] All tests pass
- [ ] Endpoint tested with curl/Postman

## Common Issues

**Validation Error (422)**: Make sure schema matches request body/query structure

**Route Not Found (404)**: Check if using correct HTTP method and URL path

**SQL Error**: Check SQL syntax and parameter count matches placeholders

**Type Error**: Make sure to cast query results to correct type
