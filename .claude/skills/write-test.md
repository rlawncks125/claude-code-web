# Write Tests

Create comprehensive tests following the project's testing patterns.

## Testing Stack

- **Test Runner**: Bun's built-in test runner (`bun:test`)
- **Test Types**: Integration tests (API) + Unit tests (Service layer)
- **Database**: In-memory SQLite for unit tests, test database for integration

## Test Structure

### Integration Tests (`tests/{entity}.test.ts`)

Test the full API endpoints end-to-end.

```typescript
import { describe, test, expect } from "bun:test";
import { app } from "../src/index";

describe("Entity API Tests", () => {
  const baseUrl = "http://localhost:3000/api/v1/entities";

  test("should get all entities", async () => {
    const response = await app.handle(new Request(baseUrl));
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
  });

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
  });

  test("should return validation error", async () => {
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
```

### Unit Tests (`tests/{entity}.service.test.ts`)

Test the service layer in isolation with in-memory database.

```typescript
import { describe, test, expect, beforeEach } from "bun:test";
import { Database } from "bun:sqlite";
import { EntityService } from "../src/services/entity.service";
import { initializeSchema } from "../src/utils/database";

describe("EntityService Unit Tests", () => {
  let db: Database;

  beforeEach(() => {
    db = new Database(":memory:");
    initializeSchema(db);
  });

  describe("create", () => {
    test("should create successfully", () => {
      const entity = EntityService.create(db, { name: "Test" });
      expect(entity.id).toBeDefined();
      expect(entity.name).toBe("Test");
    });

    test("should throw error for duplicate", () => {
      EntityService.create(db, { name: "Test", email: "test@test.com" });

      try {
        EntityService.create(db, { name: "Test2", email: "test@test.com" });
        expect(true).toBe(false); // Should not reach
      } catch (error: any) {
        expect(error.code).toBe(409);
        expect(error.response).toBe("Email already exists");
      }
    });
  });

  describe("getById", () => {
    test("should return entity", () => {
      const created = EntityService.create(db, { name: "Test" });
      const found = EntityService.getById(db, created.id);
      expect(found.id).toBe(created.id);
    });

    test("should throw 404 for non-existent", () => {
      try {
        EntityService.getById(db, 99999);
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error.code).toBe(404);
      }
    });
  });
});
```

## Test Patterns

### Error Testing (Elysia status errors)

```typescript
// DON'T use expect().toThrow() - won't work with Elysia's status()
test("wrong way", () => {
  expect(() => Service.method(db, 999)).toThrow(); // ❌
});

// DO use try-catch and check error properties
test("correct way", () => {
  try {
    Service.method(db, 999);
    expect(true).toBe(false); // Should not reach
  } catch (error: any) {
    expect(error.code).toBe(404);  // ✅
    expect(error.response).toBe("Not found");  // ✅
  }
});
```

### Status Code Testing

```typescript
// Elysia uses specific status codes:
// 200 - Success
// 422 - Validation error (not 400!)
// 404 - Not found
// 409 - Conflict
// 500 - Internal error

test("validation error", async () => {
  const response = await app.handle(/* invalid request */);
  expect(response.status).toBe(422); // Not 400!
});
```

### Array/Order Testing

```typescript
// When order is not guaranteed, test existence not order
test("should return multiple items", () => {
  const items = Service.getAll(db);
  expect(items.length).toBe(2);
  const names = items.map(i => i.name).sort();
  expect(names).toEqual(["Item 1", "Item 2"]);
});
```

## Running Tests

```bash
bun test              # Run all tests
bun test --watch      # Watch mode
bun test user.test.ts # Run specific file
```

## Test Coverage Checklist

For each entity, test:
- ✅ Get all (empty and with data)
- ✅ Get by ID (success and 404)
- ✅ Create (success and validation errors)
- ✅ Update (success, 404, validation, conflicts)
- ✅ Delete (success and 404)
- ✅ Business logic errors (duplicates, constraints)
- ✅ Edge cases (empty strings, special characters, limits)

## Best Practices

- Use descriptive test names: "should {expected behavior} when {condition}"
- Group related tests with `describe`
- Use `beforeEach` for test setup (fresh database)
- Test both success and error paths
- Don't test implementation details, test behavior
- Keep tests independent (no shared state)
- Use in-memory database for speed (`:memory:`)
