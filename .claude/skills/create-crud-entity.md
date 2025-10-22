---
name: create-crud-entity
description: Create a new CRUD entity following Elysia.js Best Practice patterns (Model with Namespace, Service with Static Methods, Routes with Direct Calls, Database Schema, Tests)
allowed-tools: Read, Write, Edit, Bash, Grep, Glob
---

# Create CRUD Entity Skill

Create a complete CRUD entity following **Elysia.js Best Practice patterns**.

## When to Use This Skill

Use this skill when you need to:
- **Create a new entity** from scratch (e.g., User, Post, Product)
- **Follow the project's established patterns**: Namespace models, Abstract class services, Direct route calls
- **Set up complete CRUD operations** (Create, Read, Update, Delete)
- **Generate matching tests** for both API and service layer

**Don't use for**:
- Adding a single endpoint to existing entity (use `add-endpoint` skill)
- Modifying existing entity structure (use direct editing)
- Non-CRUD entities or complex business logic

## Pattern Overview

This project follows Elysia.js official best practices:

- **Models**: Namespace pattern with type extraction
- **Services**: Abstract class with static methods (no instances)
- **Routes**: Direct service calls (no controller layer)
- **Database**: SQLite with bun:sqlite
- **Tests**: Integration (API) + Unit (Service) tests

## Step-by-Step Guide

### Step 1: Create Model

**File**: `src/models/{entity}.model.ts`

Create a namespace that includes:
- `Entity` interface for database structure
- Validation schemas using Elysia's `t`
- Type extraction with `typeof schema.static`
- Error literals for type-safe errors

```typescript
// Example: src/models/post.model.ts
import { t } from "elysia";

export namespace PostModel {
  // Database entity
  export interface Entity {
    id: number;
    title: string;
    content: string;
    author_id: number;
    created_at: string;
    updated_at: string;
  }

  // Create validation schema
  export const create = t.Object({
    title: t.String({ minLength: 1, maxLength: 200 }),
    content: t.String({ minLength: 1 }),
    author_id: t.Numeric({ minimum: 1 }),
  });
  export type Create = typeof create.static;

  // Update validation schema
  export const update = t.Object({
    title: t.Optional(t.String({ minLength: 1, maxLength: 200 })),
    content: t.Optional(t.String({ minLength: 1 })),
  });
  export type Update = typeof update.static;

  // Params validation schema
  export const params = t.Object({
    id: t.Numeric({ minimum: 1 }),
  });
  export type Params = typeof params.static;

  // Error types
  export const notFound = t.Literal("Post not found");
  export type NotFound = typeof notFound.static;
}
```

### Step 2: Create Service

**File**: `src/services/{entity}.service.ts`

Create an abstract class with static methods:
- All methods are static (no instance creation)
- First parameter is always `db: Database`
- Use `status(code, message satisfies ErrorType)` for errors
- Add JSDoc comments for each method

```typescript
// Example: src/services/post.service.ts
import { status } from "elysia";
import type { Database } from "bun:sqlite";
import { PostModel } from "../models/post.model";

export abstract class PostService {
  /**
   * Get all posts
   */
  static getAllPosts(db: Database): PostModel.Entity[] {
    const query = db.query("SELECT * FROM posts ORDER BY created_at DESC");
    return query.all() as PostModel.Entity[];
  }

  /**
   * Get post by ID
   */
  static getPostById(db: Database, id: number): PostModel.Entity {
    const query = db.query("SELECT * FROM posts WHERE id = ?");
    const post = query.get(id) as PostModel.Entity | undefined;

    if (!post) {
      throw status(404, "Post not found" satisfies PostModel.NotFound);
    }

    return post;
  }

  /**
   * Create new post
   */
  static createPost(db: Database, data: PostModel.Create): PostModel.Entity {
    const query = db.query(
      "INSERT INTO posts (title, content, author_id) VALUES (?, ?, ?) RETURNING *"
    );
    return query.get(data.title, data.content, data.author_id) as PostModel.Entity;
  }

  /**
   * Update post
   */
  static updatePost(
    db: Database,
    id: number,
    data: PostModel.Update
  ): PostModel.Entity {
    const post = this.getPostById(db, id);

    const updates: string[] = [];
    const values: any[] = [];

    if (data.title !== undefined) {
      updates.push("title = ?");
      values.push(data.title);
    }
    if (data.content !== undefined) {
      updates.push("content = ?");
      values.push(data.content);
    }

    if (updates.length === 0) {
      return post;
    }

    values.push(id);
    const query = db.query(
      `UPDATE posts SET ${updates.join(", ")} WHERE id = ? RETURNING *`
    );
    return query.get(...values) as PostModel.Entity;
  }

  /**
   * Delete post
   */
  static deletePost(db: Database, id: number): void {
    this.getPostById(db, id);
    const query = db.query("DELETE FROM posts WHERE id = ?");
    query.run(id);
  }
}
```

### Step 3: Create Routes

**File**: `src/routes/{entity}.routes.ts`

Create Elysia instance with prefix and call Service methods directly:

```typescript
// Example: src/routes/post.routes.ts
import { Elysia } from "elysia";
import { PostModel } from "../models/post.model";
import { PostService } from "../services/post.service";

export const postRoutes = new Elysia({ prefix: "/posts" })
  .get(
    "/",
    ({ db }) => PostService.getAllPosts(db),
    {
      detail: {
        tags: ["Posts"],
        summary: "Get all posts",
        description: "Retrieve a list of all posts",
      },
    }
  )
  .get(
    "/:id",
    ({ db, params }) => PostService.getPostById(db, params.id),
    {
      params: PostModel.params,
      detail: {
        tags: ["Posts"],
        summary: "Get post by ID",
        description: "Retrieve a specific post by ID",
      },
    }
  )
  .post(
    "/",
    ({ db, body }) => PostService.createPost(db, body),
    {
      body: PostModel.create,
      detail: {
        tags: ["Posts"],
        summary: "Create new post",
        description: "Create a new post",
      },
    }
  )
  .put(
    "/:id",
    ({ db, params, body }) => PostService.updatePost(db, params.id, body),
    {
      params: PostModel.params,
      body: PostModel.update,
      detail: {
        tags: ["Posts"],
        summary: "Update post",
        description: "Update post by ID",
      },
    }
  )
  .delete(
    "/:id",
    ({ db, params }) => {
      PostService.deletePost(db, params.id);
      return {
        success: true,
        message: "Post deleted successfully",
      };
    },
    {
      params: PostModel.params,
      detail: {
        tags: ["Posts"],
        summary: "Delete post",
        description: "Delete a post by ID",
      },
    }
  );
```

### Step 4: Update Database Schema

**File**: `src/utils/database.ts`

Add table creation in `initializeSchema()` function:

```typescript
export function initializeSchema(db: Database): void {
  // ... existing tables

  // Add posts table
  db.run(`
    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      author_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create trigger for updated_at
  db.run(`
    CREATE TRIGGER IF NOT EXISTS update_post_timestamp
    AFTER UPDATE ON posts
    FOR EACH ROW
    BEGIN
      UPDATE posts SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END
  `);

  console.log("✅ Database schema initialized");
}
```

### Step 5: Register Routes

**File**: `src/routes/index.ts`

Import and register the new routes:

```typescript
import { Elysia } from "elysia";
import { userRoutes } from "./user.routes";
import { postRoutes } from "./post.routes"; // Add this

export const routes = new Elysia({ prefix: "/api/v1" })
  .get("/health", () => ({ status: "ok" }))
  .use(userRoutes)
  .use(postRoutes); // Add this
```

### Step 6: Update Main Index

**File**: `src/index.ts`

Add the new endpoint to the root endpoint response:

```typescript
.get("/", () => ({
  message: "Welcome to Elysia CRUD API",
  version: "1.0.0",
  endpoints: {
    health: "/api/v1/health",
    users: "/api/v1/users",
    posts: "/api/v1/posts", // Add this
  },
  timestamp: new Date().toISOString(),
}))
```

### Step 7: Create Tests

**Integration Test** (`tests/{entity}.test.ts`):

```typescript
import { describe, test, expect } from "bun:test";
import { app } from "../src/index";

describe("Post API Tests", () => {
  const baseUrl = "http://localhost:3000/api/v1/posts";

  test("should create a post", async () => {
    const response = await app.handle(
      new Request(baseUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Test Post",
          content: "Test content",
          author_id: 1,
        }),
      })
    );
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.title).toBe("Test Post");
  });

  test("should get all posts", async () => {
    const response = await app.handle(new Request(baseUrl));
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
  });

  test("should return 404 for non-existent post", async () => {
    const response = await app.handle(new Request(`${baseUrl}/99999`));
    expect(response.status).toBe(404);
  });
});
```

**Unit Test** (`tests/{entity}.service.test.ts`):

```typescript
import { describe, test, expect, beforeEach } from "bun:test";
import { Database } from "bun:sqlite";
import { PostService } from "../src/services/post.service";
import { initializeSchema } from "../src/utils/database";

describe("PostService Unit Tests", () => {
  let db: Database;

  beforeEach(() => {
    db = new Database(":memory:");
    initializeSchema(db);
  });

  test("should create a post", () => {
    const post = PostService.createPost(db, {
      title: "Test",
      content: "Content",
      author_id: 1,
    });
    expect(post.id).toBeDefined();
    expect(post.title).toBe("Test");
  });

  test("should throw 404 for non-existent post", () => {
    try {
      PostService.getPostById(db, 99999);
      expect(true).toBe(false);
    } catch (error: any) {
      expect(error.code).toBe(404);
      expect(error.response).toBe("Post not found");
    }
  });
});
```

### Step 8: Run Tests

```bash
bun test
```

## Important Reminders

- **Namespace for Models**: Group all related types, schemas, and errors
- **Static Methods for Services**: No instance creation, all methods static
- **Direct Service Calls**: Routes call services directly, no controller
- **Type-safe Errors**: Use `status(code, message satisfies Type)`
- **Database Triggers**: Add updated_at triggers automatically
- **Test Coverage**: Both integration (API) and unit (service) tests
- **Validation**: Always add schemas for body, params, query

## Verification Checklist

After creating the entity:

- [ ] Model file created with namespace
- [ ] Service file created with abstract class and static methods
- [ ] Routes file created with Elysia prefix
- [ ] Database schema added to initializeSchema()
- [ ] Routes registered in routes/index.ts
- [ ] Endpoint added to root response in index.ts
- [ ] Integration tests created
- [ ] Unit tests created
- [ ] All tests pass (`bun test`)
- [ ] API works with curl/Postman

## Common Issues

**TypeScript Errors**: Make sure to extract types with `typeof schema.static`

**404 on Routes**: Check if routes are registered in `routes/index.ts`

**Database Errors**: Make sure table is created in `initializeSchema()`

**Test Failures**: Use try-catch for error tests, expect 422 for validation errors
