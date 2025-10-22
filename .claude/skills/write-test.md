---
name: write-test
description: Write comprehensive tests for Elysia.js application using Bun test runner (Integration tests for API endpoints, Unit tests for Service layer)
allowed-tools: Read, Write, Edit, Bash
---

# Write Test Skill

Write comprehensive tests using **Bun's test runner** for Elysia.js applications.

## When to Use This Skill

Use this skill when you need to:
- **Test API endpoints** end-to-end (integration tests)
- **Test business logic** in isolation (unit tests)
- **Verify error handling** and edge cases
- **Ensure code quality** before deployment

**Don't use for**:
- Manual testing with curl (use this skill to automate instead)
- Performance testing (use dedicated tools)
- Load testing (use dedicated tools)

## Testing Stack

- **Test Runner**: Bun (`bun:test`)
- **Assertion Library**: Built-in `expect()`
- **Test Types**: Integration (API) + Unit (Service)
- **Database**: In-memory SQLite (`:memory:`) for unit tests

## Test Structure

```
tests/
├── {entity}.test.ts           # Integration tests (API)
└── {entity}.service.test.ts   # Unit tests (Service)
```

## Integration Tests (API Endpoints)

Test the full API stack end-to-end.

### File Structure

**File**: `tests/{entity}.test.ts`

```typescript
import { describe, test, expect } from "bun:test";
import { app } from "../src/index";

describe("Entity API Tests", () => {
  const baseUrl = "http://localhost:3000/api/v1/entities";

  describe("GET /entities", () => {
    test("should return all entities", async () => {
      const response = await app.handle(new Request(baseUrl));
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
    });
  });

  describe("POST /entities", () => {
    test("should create entity", async () => {
      const response = await app.handle(
        new Request(baseUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Test" }),
        })
      );
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.name).toBe("Test");
      expect(data.id).toBeDefined();
    });

    test("should return validation error for missing fields", async () => {
      const response = await app.handle(
        new Request(baseUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        })
      );
      expect(response.status).toBe(422); // Elysia validation error
    });
  });

  describe("GET /entities/:id", () => {
    test("should return entity by ID", async () => {
      // Create entity first
      const createResponse = await app.handle(
        new Request(baseUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Test" }),
        })
      );
      const created = await createResponse.json();

      // Get entity
      const response = await app.handle(
        new Request(`${baseUrl}/${created.id}`)
      );
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.id).toBe(created.id);
    });

    test("should return 404 for non-existent entity", async () => {
      const response = await app.handle(
        new Request(`${baseUrl}/99999`)
      );
      expect(response.status).toBe(404);
    });
  });

  describe("PUT /entities/:id", () => {
    test("should update entity", async () => {
      // Create
      const createResponse = await app.handle(
        new Request(baseUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Original" }),
        })
      );
      const created = await createResponse.json();

      // Update
      const response = await app.handle(
        new Request(`${baseUrl}/${created.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Updated" }),
        })
      );
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.name).toBe("Updated");
    });

    test("should return 404 for non-existent entity", async () => {
      const response = await app.handle(
        new Request(`${baseUrl}/99999`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Test" }),
        })
      );
      expect(response.status).toBe(404);
    });
  });

  describe("DELETE /entities/:id", () => {
    test("should delete entity", async () => {
      // Create
      const createResponse = await app.handle(
        new Request(baseUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "To Delete" }),
        })
      );
      const created = await createResponse.json();

      // Delete
      const deleteResponse = await app.handle(
        new Request(`${baseUrl}/${created.id}`, {
          method: "DELETE",
        })
      );
      expect(deleteResponse.status).toBe(200);

      // Verify deletion
      const getResponse = await app.handle(
        new Request(`${baseUrl}/${created.id}`)
      );
      expect(getResponse.status).toBe(404);
    });

    test("should return 404 for non-existent entity", async () => {
      const response = await app.handle(
        new Request(`${baseUrl}/99999`, { method: "DELETE" })
      );
      expect(response.status).toBe(404);
    });
  });
});
```

## Unit Tests (Service Layer)

Test business logic in isolation with in-memory database.

### File Structure

**File**: `tests/{entity}.service.test.ts`

```typescript
import { describe, test, expect, beforeEach } from "bun:test";
import { Database } from "bun:sqlite";
import { EntityService } from "../src/services/entity.service";
import { initializeSchema } from "../src/utils/database";

describe("EntityService Unit Tests", () => {
  let db: Database;

  // Create fresh in-memory database for each test
  beforeEach(() => {
    db = new Database(":memory:");
    initializeSchema(db);
  });

  describe("create", () => {
    test("should create entity successfully", () => {
      const entity = EntityService.create(db, {
        name: "Test Entity",
      });

      expect(entity.id).toBeDefined();
      expect(entity.name).toBe("Test Entity");
      expect(entity.created_at).toBeDefined();
      expect(entity.updated_at).toBeDefined();
    });

    test("should throw error for duplicate", () => {
      EntityService.create(db, { name: "Test", email: "test@test.com" });

      try {
        EntityService.create(db, { name: "Test2", email: "test@test.com" });
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error.code).toBe(409);
        expect(error.response).toBe("Email already exists");
      }
    });
  });

  describe("getAll", () => {
    test("should return empty array when no entities", () => {
      const entities = EntityService.getAll(db);
      expect(entities).toEqual([]);
      expect(entities.length).toBe(0);
    });

    test("should return all entities", () => {
      EntityService.create(db, { name: "Entity 1" });
      EntityService.create(db, { name: "Entity 2" });

      const entities = EntityService.getAll(db);
      expect(entities.length).toBe(2);

      // Check existence, not order
      const names = entities.map((e) => e.name).sort();
      expect(names).toEqual(["Entity 1", "Entity 2"]);
    });
  });

  describe("getById", () => {
    test("should return entity by ID", () => {
      const created = EntityService.create(db, { name: "Test" });
      const entity = EntityService.getById(db, created.id);

      expect(entity.id).toBe(created.id);
      expect(entity.name).toBe("Test");
    });

    test("should throw 404 for non-existent entity", () => {
      try {
        EntityService.getById(db, 99999);
        expect(true).toBe(false); // Should not reach
      } catch (error: any) {
        expect(error.code).toBe(404);
        expect(error.response).toBe("Entity not found");
      }
    });
  });

  describe("update", () => {
    test("should update entity", () => {
      const created = EntityService.create(db, { name: "Original" });
      const updated = EntityService.update(db, created.id, {
        name: "Updated",
      });

      expect(updated.name).toBe("Updated");
      expect(updated.id).toBe(created.id);
    });

    test("should throw error for duplicate", () => {
      EntityService.create(db, { name: "E1", email: "e1@test.com" });
      const e2 = EntityService.create(db, { name: "E2", email: "e2@test.com" });

      try {
        EntityService.update(db, e2.id, { email: "e1@test.com" });
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error.code).toBe(409);
      }
    });

    test("should return same entity if no changes", () => {
      const created = EntityService.create(db, { name: "Test" });
      const updated = EntityService.update(db, created.id, {});

      expect(updated.id).toBe(created.id);
      expect(updated.name).toBe(created.name);
    });
  });

  describe("delete", () => {
    test("should delete entity successfully", () => {
      const created = EntityService.create(db, { name: "To Delete" });
      EntityService.delete(db, created.id);

      try {
        EntityService.getById(db, created.id);
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error.code).toBe(404);
      }
    });

    test("should throw error for non-existent entity", () => {
      try {
        EntityService.delete(db, 99999);
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error.code).toBe(404);
      }
    });
  });
});
```

## Important Testing Patterns

### 1. Error Testing with Elysia's status()

```typescript
// ❌ WRONG - expect().toThrow() doesn't work with Elysia status()
test("wrong way", () => {
  expect(() => Service.method(db, 999)).toThrow();
});

// ✅ CORRECT - use try-catch pattern
test("correct way", () => {
  try {
    Service.method(db, 999);
    expect(true).toBe(false); // Should not reach here
  } catch (error: any) {
    expect(error.code).toBe(404);
    expect(error.response).toBe("Not found");
  }
});
```

### 2. Elysia-Specific Status Codes

```typescript
// Elysia uses these status codes:
// 200 - Success
// 422 - Validation error (NOT 400!)
// 404 - Not found
// 409 - Conflict
// 500 - Internal error

test("validation error returns 422", async () => {
  const response = await app.handle(
    new Request(url, {
      method: "POST",
      body: JSON.stringify({}), // Invalid
    })
  );
  expect(response.status).toBe(422); // Not 400!
});
```

### 3. Array Testing (Order Not Guaranteed)

```typescript
// ❌ WRONG - assumes specific order
test("wrong way", () => {
  const items = Service.getAll(db);
  expect(items[0].name).toBe("Item 1");
  expect(items[1].name).toBe("Item 2");
});

// ✅ CORRECT - test existence, not order
test("correct way", () => {
  const items = Service.getAll(db);
  expect(items.length).toBe(2);

  const names = items.map(i => i.name).sort();
  expect(names).toEqual(["Item 1", "Item 2"]);
});
```

### 4. Async Testing

```typescript
// Always use async/await for API tests
test("should work", async () => {
  const response = await app.handle(new Request(url));
  const data = await response.json();
  expect(data).toBeDefined();
});
```

### 5. Test Data Setup

```typescript
// Create helper function for test data
async function createTestUser() {
  const response = await app.handle(
    new Request("http://localhost:3000/api/v1/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test User",
        email: "test@test.com",
      }),
    })
  );
  return response.json();
}

test("should use test data", async () => {
  const user = await createTestUser();
  // Use user in test
});
```

## Running Tests

```bash
# Run all tests
bun test

# Watch mode (re-run on changes)
bun test --watch

# Run specific file
bun test tests/user.test.ts

# Run tests matching pattern
bun test --test-name-pattern "should create"
```

## Test Coverage Checklist

For each entity, test:

**CRUD Operations**:
- [ ] Create - success case
- [ ] Create - validation errors
- [ ] Create - duplicate/conflict errors
- [ ] Get all - empty list
- [ ] Get all - with data
- [ ] Get by ID - success
- [ ] Get by ID - 404 error
- [ ] Update - success
- [ ] Update - 404 error
- [ ] Update - validation errors
- [ ] Update - conflict errors
- [ ] Update - no changes (no-op)
- [ ] Delete - success
- [ ] Delete - 404 error

**Edge Cases**:
- [ ] Empty strings
- [ ] Very long strings
- [ ] Special characters
- [ ] Unicode characters
- [ ] SQL injection attempts
- [ ] Null/undefined values
- [ ] Boundary values (min/max)

## Best Practices

### 1. Test Naming

```typescript
// ✅ Good - describes behavior and condition
test("should return 404 when user not found", () => {});
test("should create user with valid data", () => {});

// ❌ Bad - vague or technical
test("test1", () => {});
test("getUserById error", () => {});
```

### 2. Test Organization

```typescript
// ✅ Good - grouped by feature
describe("UserService", () => {
  describe("createUser", () => {
    test("should create successfully", () => {});
    test("should throw error for duplicate", () => {});
  });

  describe("getUserById", () => {
    test("should return user", () => {});
    test("should throw 404", () => {});
  });
});
```

### 3. Test Independence

```typescript
// ✅ Good - each test is independent
beforeEach(() => {
  db = new Database(":memory:");
  initializeSchema(db);
});

// ❌ Bad - tests depend on each other
test("create user", () => {
  user = Service.create(db, data); // Bad: global state
});

test("update user", () => {
  Service.update(db, user.id, {}); // Depends on previous test
});
```

### 4. Assertion Clarity

```typescript
// ✅ Good - clear assertions
expect(response.status).toBe(200);
expect(data.name).toBe("Expected Name");
expect(Array.isArray(data)).toBe(true);

// ❌ Bad - unclear or complex
expect(response.status === 200 || response.status === 201).toBe(true);
```

### 5. Test Database

```typescript
// ✅ Good - use in-memory for unit tests
const db = new Database(":memory:");

// ❌ Bad - use file database (slower)
const db = new Database("test.db");
```

## Verification Checklist

After writing tests:

- [ ] Integration tests created for all endpoints
- [ ] Unit tests created for all service methods
- [ ] Error cases tested (404, 422, 409, etc.)
- [ ] Edge cases covered
- [ ] All tests pass (`bun test`)
- [ ] Tests are independent (can run in any order)
- [ ] Test names are descriptive
- [ ] No console.log() left in tests
- [ ] Tests run quickly (< 1 second total)

## Common Issues

**Tests Fail Randomly**: Tests are not independent, use `beforeEach` to reset state

**Slow Tests**: Using file database instead of `:memory:`

**Port Already in Use**: Another test is still running, use `pkill -9 bun`

**expect().toThrow() Fails**: Use try-catch pattern for Elysia status() errors

**Wrong Status Code**: Remember Elysia uses 422 for validation, not 400
