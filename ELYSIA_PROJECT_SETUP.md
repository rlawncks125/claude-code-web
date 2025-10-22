# Elysia.js Project Setup Guide

새로운 프로젝트에서 Elysia.js Best Practice 패턴을 적용하는 완전한 가이드입니다.

## 목차
- [1. 프로젝트 초기화](#1-프로젝트-초기화)
- [2. 프로젝트 구조](#2-프로젝트-구조)
- [3. 핵심 파일 작성](#3-핵심-파일-작성)
- [4. 첫 번째 CRUD 엔티티](#4-첫-번째-crud-엔티티)
- [5. 테스트 설정](#5-테스트-설정)
- [6. Skills 설정](#6-skills-설정)

---

## 1. 프로젝트 초기화

### 1.1 Bun 및 프로젝트 생성

```bash
# Bun 설치 (이미 설치되어 있다면 생략)
curl -fsSL https://bun.sh/install | bash

# 프로젝트 폴더 생성 및 초기화
mkdir my-elysia-api
cd my-elysia-api
bun init -y

# Elysia 설치
bun add elysia

# TypeScript 타입 설정
bun add -d @types/bun typescript
```

### 1.2 package.json 설정

```json
{
  "name": "my-elysia-api",
  "type": "module",
  "private": true,
  "scripts": {
    "dev": "bun --watch src/index.ts",
    "start": "bun run src/index.ts",
    "test": "bun test",
    "test:watch": "bun test --watch"
  },
  "devDependencies": {
    "@types/bun": "latest"
  },
  "peerDependencies": {
    "typescript": "^5"
  },
  "dependencies": {
    "elysia": "^1.4.12"
  }
}
```

### 1.3 tsconfig.json 설정

```json
{
  "compilerOptions": {
    "lib": ["ESNext"],
    "target": "ESNext",
    "module": "Preserve",
    "moduleDetection": "force",
    "jsx": "react-jsx",
    "allowJs": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "noEmit": true,
    "strict": true,
    "skipLibCheck": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noPropertyAccessFromIndexSignature": false
  }
}
```

### 1.4 .gitignore

```
node_modules/
dist/
.env
*.db
*.db-shm
*.db-wal
.DS_Store
```

---

## 2. 프로젝트 구조

다음과 같은 폴더 구조를 만듭니다:

```
my-elysia-api/
├── src/
│   ├── index.ts              # 메인 진입점
│   ├── models/               # 데이터 모델 (Namespace 패턴)
│   ├── services/             # 비즈니스 로직 (Abstract Class + Static Methods)
│   ├── routes/               # API 라우트
│   ├── plugins/              # Elysia 플러그인 (logger, error handler 등)
│   └── utils/                # 유틸리티 함수 (database 등)
├── tests/                    # 테스트 파일
├── .claude/
│   └── skills/               # Claude Code Skills
├── package.json
├── tsconfig.json
└── .gitignore
```

폴더 생성:

```bash
mkdir -p src/{models,services,routes,plugins,utils} tests .claude/skills
```

---

## 3. 핵심 파일 작성

### 3.1 Database Utility (`src/utils/database.ts`)

```typescript
// Database utility functions
import { Database } from "bun:sqlite";

/**
 * Create database connection with WAL mode enabled
 */
export function createDatabase(path: string = "./data.db"): Database {
  const db = new Database(path, { create: true });

  // Enable WAL mode for better performance
  db.run("PRAGMA journal_mode = WAL");

  return db;
}

/**
 * Initialize database schema (tables and triggers)
 */
export function initializeSchema(db: Database): void {
  // 여기에 테이블 생성 SQL을 추가합니다
  // 예제는 아래 섹션에서 확인

  console.log("✅ Database schema initialized");
}
```

### 3.2 Error Plugin (`src/plugins/error.plugin.ts`)

```typescript
// Centralized error handling plugin
import { Elysia } from "elysia";

export const errorPlugin = new Elysia({ name: "error-handler" }).onError(
  ({ code, error, set }) => {
    console.error(`❌ Error [${code}]:`, error);

    // Validation errors
    if (code === "VALIDATION") {
      set.status = 422;
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
```

### 3.3 Logger Plugin (`src/plugins/logger.plugin.ts`)

```typescript
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
```

### 3.4 Routes Index (`src/routes/index.ts`)

```typescript
// Routes aggregator
import { Elysia } from "elysia";
// import { userRoutes } from "./user.routes";

// Combine all route modules with API prefix
export const routes = new Elysia({ prefix: "/api/v1" })
  .get(
    "/health",
    () => ({
      status: "ok",
      timestamp: new Date().toISOString(),
      service: "Elysia CRUD API",
    }),
    {
      detail: {
        tags: ["Health"],
        summary: "Health check",
        description: "Check if the API is running",
      },
    }
  );
  // .use(userRoutes);  // 엔티티 추가 시 주석 해제
```

### 3.5 Main Entry Point (`src/index.ts`)

```typescript
// Main application entry point
import { Elysia } from "elysia";
import { errorPlugin } from "./plugins/error.plugin";
import { loggerPlugin } from "./plugins/logger.plugin";
import { routes } from "./routes";
import { createDatabase, initializeSchema } from "./utils/database";

// ========================================
// Configuration
// ========================================
const appConfig = {
  port: parseInt(process.env.PORT || "3000"),
  host: process.env.HOST || "0.0.0.0",
  env: process.env.NODE_ENV || "development",
  cors: {
    origin: process.env.CORS_ORIGIN || "*",
  },
  api: {
    prefix: "/api",
    version: "v1",
  },
} as const;

// ========================================
// Database Setup
// ========================================
const dbPath = process.env.DB_PATH || "./data.db";
const db = createDatabase(dbPath);
initializeSchema(db);

// ========================================
// Application
// ========================================
const app = new Elysia()
  // Add plugins
  .use(errorPlugin)
  .use(loggerPlugin)
  // Inject database instance
  .decorate("db", db)
  .onStop(() => {
    db.close();
    console.log("🔌 Database connection closed");
  })
  // Add routes
  .use(routes)
  // Root endpoint
  .get("/", () => ({
    message: "Welcome to Elysia CRUD API (Best Practice Edition)",
    version: "1.0.0",
    endpoints: {
      health: "/api/v1/health",
    },
    timestamp: new Date().toISOString(),
  }))
  // Start server
  .listen(appConfig.port);

console.log(`
🦊 Elysia server is running!

🌐 Server: http://${app.server?.hostname}:${app.server?.port}
🔍 Health: http://${app.server?.hostname}:${app.server?.port}/api/v1/health

Environment: ${appConfig.env}
`);

// Export app for testing
export { app };
```

---

## 4. 첫 번째 CRUD 엔티티

예제로 User 엔티티를 만들어봅니다.

### 4.1 Model (`src/models/user.model.ts`)

```typescript
// User model - namespace pattern (Elysia Best Practice)
import { t } from "elysia";

export namespace UserModel {
  // Database entity
  export interface Entity {
    id: number;
    name: string;
    email: string;
    created_at: string;
    updated_at: string;
  }

  // Create user validation schema
  export const create = t.Object({
    name: t.String({ minLength: 1, maxLength: 100 }),
    email: t.String({ format: "email", maxLength: 255 }),
  });
  export type Create = typeof create.static;

  // Update user validation schema
  export const update = t.Object({
    name: t.Optional(t.String({ minLength: 1, maxLength: 100 })),
    email: t.Optional(t.String({ format: "email", maxLength: 255 })),
  });
  export type Update = typeof update.static;

  // Params validation schema
  export const params = t.Object({
    id: t.Numeric({ minimum: 1 }),
  });
  export type Params = typeof params.static;

  // Response types
  export type Response = Entity;
  export type ListResponse = Entity[];

  // Error types
  export const notFound = t.Literal("User not found");
  export type NotFound = typeof notFound.static;

  export const emailExists = t.Literal("Email already exists");
  export type EmailExists = typeof emailExists.static;
}
```

### 4.2 Service (`src/services/user.service.ts`)

```typescript
// User service - abstract class pattern (Elysia Best Practice)
import { status } from "elysia";
import type { Database } from "bun:sqlite";
import { UserModel } from "../models/user.model";

// Abstract class - no instance creation needed
export abstract class UserService {
  /**
   * Get all users
   */
  static getAllUsers(db: Database): UserModel.Entity[] {
    const query = db.query("SELECT * FROM users ORDER BY created_at DESC");
    return query.all() as UserModel.Entity[];
  }

  /**
   * Get user by ID
   */
  static getUserById(db: Database, id: number): UserModel.Entity {
    const query = db.query("SELECT * FROM users WHERE id = ?");
    const user = query.get(id) as UserModel.Entity | undefined;

    if (!user) {
      throw status(404, "User not found" satisfies UserModel.NotFound);
    }

    return user;
  }

  /**
   * Get user by email
   */
  static getUserByEmail(
    db: Database,
    email: string
  ): UserModel.Entity | null {
    const query = db.query("SELECT * FROM users WHERE email = ?");
    const user = query.get(email) as UserModel.Entity | undefined;
    return user || null;
  }

  /**
   * Create new user
   */
  static createUser(db: Database, data: UserModel.Create): UserModel.Entity {
    // Check if email already exists
    const existingUser = this.getUserByEmail(db, data.email);
    if (existingUser) {
      throw status(409, "Email already exists" satisfies UserModel.EmailExists);
    }

    const query = db.query(
      "INSERT INTO users (name, email) VALUES (?, ?) RETURNING *"
    );
    return query.get(data.name, data.email) as UserModel.Entity;
  }

  /**
   * Update user
   */
  static updateUser(
    db: Database,
    id: number,
    data: UserModel.Update
  ): UserModel.Entity {
    // Check if user exists
    const user = this.getUserById(db, id);

    // Check email uniqueness if email is being updated
    if (data.email && data.email !== user.email) {
      const existingUser = this.getUserByEmail(db, data.email);
      if (existingUser) {
        throw status(
          409,
          "Email already exists" satisfies UserModel.EmailExists
        );
      }
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) {
      updates.push("name = ?");
      values.push(data.name);
    }
    if (data.email !== undefined) {
      updates.push("email = ?");
      values.push(data.email);
    }

    if (updates.length === 0) {
      return user;
    }

    values.push(id);
    const query = db.query(
      `UPDATE users SET ${updates.join(", ")} WHERE id = ? RETURNING *`
    );
    return query.get(...values) as UserModel.Entity;
  }

  /**
   * Delete user
   */
  static deleteUser(db: Database, id: number): void {
    // Check if user exists
    this.getUserById(db, id);

    const query = db.query("DELETE FROM users WHERE id = ?");
    query.run(id);
  }
}
```

### 4.3 Routes (`src/routes/user.routes.ts`)

```typescript
// User routes - directly call Service static methods (Elysia Best Practice)
import { Elysia } from "elysia";
import { UserModel } from "../models/user.model";
import { UserService } from "../services/user.service";

export const userRoutes = new Elysia({ prefix: "/users" })
  .get(
    "/",
    ({ db }) => UserService.getAllUsers(db),
    {
      detail: {
        tags: ["Users"],
        summary: "Get all users",
        description: "Retrieve a list of all users",
      },
    }
  )
  .get(
    "/:id",
    ({ db, params }) => UserService.getUserById(db, params.id),
    {
      params: UserModel.params,
      detail: {
        tags: ["Users"],
        summary: "Get user by ID",
        description: "Retrieve a specific user by their ID",
      },
    }
  )
  .post(
    "/",
    ({ db, body }) => UserService.createUser(db, body),
    {
      body: UserModel.create,
      detail: {
        tags: ["Users"],
        summary: "Create new user",
        description: "Create a new user with name and email",
      },
    }
  )
  .put(
    "/:id",
    ({ db, params, body }) => UserService.updateUser(db, params.id, body),
    {
      params: UserModel.params,
      body: UserModel.update,
      detail: {
        tags: ["Users"],
        summary: "Update user",
        description: "Update user information by ID",
      },
    }
  )
  .delete(
    "/:id",
    ({ db, params }) => {
      UserService.deleteUser(db, params.id);
      return {
        success: true,
        message: "User deleted successfully",
      };
    },
    {
      params: UserModel.params,
      detail: {
        tags: ["Users"],
        summary: "Delete user",
        description: "Delete a user by their ID",
      },
    }
  );
```

### 4.4 Database Schema 추가 (`src/utils/database.ts` 수정)

```typescript
export function initializeSchema(db: Database): void {
  // Create users table
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create trigger for updated_at
  db.run(`
    CREATE TRIGGER IF NOT EXISTS update_user_timestamp
    AFTER UPDATE ON users
    FOR EACH ROW
    BEGIN
      UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END
  `);

  console.log("✅ Database schema initialized");
}
```

### 4.5 Routes 등록 (`src/routes/index.ts` 수정)

```typescript
import { Elysia } from "elysia";
import { userRoutes } from "./user.routes";

export const routes = new Elysia({ prefix: "/api/v1" })
  .get("/health", () => ({
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "Elysia CRUD API",
  }))
  .use(userRoutes);  // 추가
```

### 4.6 Index.ts 수정 (endpoints 추가)

```typescript
// Root endpoint에 users 추가
.get("/", () => ({
  message: "Welcome to Elysia CRUD API (Best Practice Edition)",
  version: "1.0.0",
  endpoints: {
    health: "/api/v1/health",
    users: "/api/v1/users",  // 추가
  },
  timestamp: new Date().toISOString(),
}))
```

---

## 5. 테스트 설정

### 5.1 Integration Test (`tests/user.test.ts`)

```typescript
// User API integration tests
import { describe, test, expect } from "bun:test";
import { app } from "../src/index";

describe("User API Tests", () => {
  const baseUrl = "http://localhost:3000/api/v1/users";

  describe("GET /users", () => {
    test("should return all users", async () => {
      const response = await app.handle(new Request(baseUrl));
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
    });
  });

  describe("POST /users", () => {
    test("should create a new user", async () => {
      const response = await app.handle(
        new Request(baseUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "홍길동",
            email: "hong@example.com",
          }),
        })
      );
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.name).toBe("홍길동");
      expect(data.email).toBe("hong@example.com");
    });

    test("should return validation error for invalid data", async () => {
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
});
```

### 5.2 Unit Test (`tests/user.service.test.ts`)

```typescript
// User service unit tests
import { describe, test, expect, beforeEach } from "bun:test";
import { Database } from "bun:sqlite";
import { UserService } from "../src/services/user.service";
import { initializeSchema } from "../src/utils/database";

describe("UserService Unit Tests", () => {
  let db: Database;

  beforeEach(() => {
    db = new Database(":memory:");
    initializeSchema(db);
  });

  describe("createUser", () => {
    test("should create a user successfully", () => {
      const user = UserService.createUser(db, {
        name: "홍길동",
        email: "hong@example.com",
      });

      expect(user.id).toBeDefined();
      expect(user.name).toBe("홍길동");
      expect(user.email).toBe("hong@example.com");
    });

    test("should throw error for duplicate email", () => {
      UserService.createUser(db, {
        name: "홍길동",
        email: "hong@example.com",
      });

      try {
        UserService.createUser(db, {
          name: "김철수",
          email: "hong@example.com",
        });
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error.code).toBe(409);
        expect(error.response).toBe("Email already exists");
      }
    });
  });

  describe("getUserById", () => {
    test("should throw error for non-existent user", () => {
      try {
        UserService.getUserById(db, 99999);
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error.code).toBe(404);
        expect(error.response).toBe("User not found");
      }
    });
  });
});
```

---

## 6. Skills 설정

`.claude/skills/` 폴더에 다음 파일들을 추가합니다:

### 6.1 `create-crud-entity.md`
(이전에 작성한 내용 그대로 복사)

### 6.2 `add-endpoint.md`
(이전에 작성한 내용 그대로 복사)

### 6.3 `create-plugin.md`
(이전에 작성한 내용 그대로 복사)

### 6.4 `write-test.md`
(이전에 작성한 내용 그대로 복사)

---

## 7. 프로젝트 실행

### 개발 모드 실행

```bash
bun run dev
```

서버가 http://localhost:3000 에서 실행됩니다.

### 테스트 실행

```bash
bun test
```

### API 테스트

```bash
# Health check
curl http://localhost:3000/api/v1/health

# Get all users
curl http://localhost:3000/api/v1/users

# Create user
curl -X POST http://localhost:3000/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{"name":"홍길동","email":"hong@example.com"}'

# Get user by ID
curl http://localhost:3000/api/v1/users/1

# Update user
curl -X PUT http://localhost:3000/api/v1/users/1 \
  -H "Content-Type: application/json" \
  -d '{"name":"홍길동(수정)"}'

# Delete user
curl -X DELETE http://localhost:3000/api/v1/users/1
```

---

## 8. 핵심 패턴 요약

### 8.1 Model (Namespace 패턴)

```typescript
export namespace EntityModel {
  export interface Entity { /* ... */ }
  export const create = t.Object({ /* ... */ });
  export type Create = typeof create.static;
  export const notFound = t.Literal("Entity not found");
  export type NotFound = typeof notFound.static;
}
```

### 8.2 Service (Abstract Class + Static Methods)

```typescript
export abstract class EntityService {
  static getAll(db: Database): EntityModel.Entity[] { /* ... */ }
  static getById(db: Database, id: number): EntityModel.Entity {
    const entity = /* ... */;
    if (!entity) {
      throw status(404, "Entity not found" satisfies EntityModel.NotFound);
    }
    return entity;
  }
}
```

### 8.3 Routes (Direct Service Calls)

```typescript
export const entityRoutes = new Elysia({ prefix: "/entities" })
  .get("/", ({ db }) => EntityService.getAll(db))
  .post("/", ({ db, body }) => EntityService.create(db, body), {
    body: EntityModel.create
  });
```

---

## 9. 다음 단계

1. **Swagger 추가**: `bun add @elysiajs/swagger`
2. **CORS 추가**: `bun add @elysiajs/cors`
3. **Authentication 추가**: JWT 또는 Session 기반 인증
4. **Validation 강화**: 더 복잡한 validation 규칙
5. **Migration 시스템**: Database migration 추가
6. **Docker 설정**: Dockerfile 및 docker-compose.yml 작성

---

## 10. 문제 해결

### 포트가 이미 사용 중인 경우

```bash
# 프로세스 종료
pkill -9 bun

# 또는 포트 변경
PORT=3001 bun run dev
```

### Database 초기화

```bash
rm data.db data.db-shm data.db-wal
bun run dev
```

### 테스트 실패 시

```bash
# 모든 bun 프로세스 종료
pkill -9 bun

# 테스트 재실행
bun test
```

---

## 참고 자료

- [Elysia.js 공식 문서](https://elysiajs.com/)
- [Elysia.js Best Practice](https://elysiajs.com/essential/best-practice.html)
- [Bun 공식 문서](https://bun.sh/docs)
- [Bun SQLite](https://bun.sh/docs/api/sqlite)

---

**이 가이드로 Elysia.js Best Practice를 따르는 견고한 API를 구축할 수 있습니다!** 🚀
