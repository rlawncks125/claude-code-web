# Add API Endpoint

Add a new API endpoint to an existing entity following the project patterns.

## Steps

1. **Identify the Entity**: Determine which entity you're adding the endpoint to

2. **Update Model** (if needed):
   - Add new validation schema if endpoint needs request body
   - Add new error types if endpoint has specific errors
   - Keep namespace organization

3. **Add Service Method** (`src/services/{entity}.service.ts`):
   - Add static method to the abstract class
   - First parameter must be `db: Database`
   - Add proper type annotations
   - Use `status(code, message satisfies ErrorType)` for errors
   - Add JSDoc comment

4. **Add Route** (`src/routes/{entity}.routes.ts`):
   - Chain new route method (.get, .post, .put, .delete, .patch)
   - Call Service static method directly
   - Add validation schemas (body, params, query)
   - Add detail object for Swagger documentation

5. **Create Test** (`tests/{entity}.test.ts`):
   - Add integration test for the new endpoint
   - Test success case
   - Test error cases
   - Test edge cases

## Example

```typescript
// 1. Model (add if needed)
export namespace UserModel {
  export const search = t.Object({
    query: t.String({ minLength: 1 }),
  });
  export type Search = typeof search.static;
}

// 2. Service
export abstract class UserService {
  /**
   * Search users by name or email
   */
  static searchUsers(db: Database, query: string): UserModel.Entity[] {
    const sql = db.query(
      "SELECT * FROM users WHERE name LIKE ? OR email LIKE ?"
    );
    const pattern = `%${query}%`;
    return sql.all(pattern, pattern) as UserModel.Entity[];
  }
}

// 3. Routes
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

// 4. Test
test("should search users", async () => {
  const response = await app.handle(
    new Request("http://localhost:3000/api/v1/users/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: "test" }),
    })
  );
  expect(response.status).toBe(200);
});
```

## Best Practices

- Keep service methods focused and single-purpose
- Use descriptive method names (verb + noun)
- Always validate input with Elysia schemas
- Return consistent response format
- Add proper error handling
- Write tests before implementation (TDD)
