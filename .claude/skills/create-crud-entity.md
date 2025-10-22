# Create CRUD Entity

Create a new CRUD entity following Elysia.js Best Practice patterns.

## Pattern Overview

This project follows Elysia.js official best practices:
- **Models**: Namespace pattern with type extraction
- **Services**: Abstract class with static methods (no instances)
- **Routes**: Direct service calls (no controller layer)
- **Database**: SQLite with bun:sqlite

## Steps

1. **Create Model** (`src/models/{entity}.model.ts`):
   - Use namespace to group Entity interface, validation schemas, and error types
   - Define Entity interface for database structure
   - Define validation schemas using Elysia's `t` (create, update, params)
   - Extract types using `typeof schema.static`
   - Define error literals for type-safe errors

2. **Create Service** (`src/services/{entity}.service.ts`):
   - Use abstract class (no instance creation)
   - All methods must be static
   - First parameter is always `db: Database`
   - Throw errors using `status(code, message satisfies ErrorType)`
   - Include JSDoc comments for each method

3. **Create Routes** (`src/routes/{entity}.routes.ts`):
   - Create Elysia instance with prefix: `new Elysia({ prefix: "/{entities}" })`
   - Call Service static methods directly
   - Add validation schemas (body, params)
   - Add Swagger detail (tags, summary, description)

4. **Update Database Schema** (`src/utils/database.ts`):
   - Add table creation in `initializeSchema()` function
   - Add triggers if needed (e.g., updated_at)

5. **Register Routes** (`src/routes/index.ts`):
   - Import and register the new routes

6. **Create Tests** (`tests/{entity}.test.ts` and `tests/{entity}.service.test.ts`):
   - Integration tests for API endpoints
   - Unit tests for service layer

## Example Structure

```typescript
// Model (Namespace)
export namespace EntityModel {
  export interface Entity {
    id: number;
    // ... fields
    created_at: string;
    updated_at: string;
  }

  export const create = t.Object({ /* ... */ });
  export type Create = typeof create.static;
}

// Service (Abstract class with static methods)
export abstract class EntityService {
  static getAll(db: Database): EntityModel.Entity[] { /* ... */ }
  static getById(db: Database, id: number): EntityModel.Entity { /* ... */ }
  static create(db: Database, data: EntityModel.Create): EntityModel.Entity { /* ... */ }
}

// Routes (Direct service calls)
export const entityRoutes = new Elysia({ prefix: "/entities" })
  .get("/", ({ db }) => EntityService.getAll(db))
  .post("/", ({ db, body }) => EntityService.create(db, body), {
    body: EntityModel.create
  });
```

## Commands to Run

After creating the entity, run:
- `bun test` - Run all tests
- `bun run dev` - Start development server
