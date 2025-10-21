# Elysia.js CRUD API - Official Best Practice

Elysia.js 공식 Best Practice 패턴을 완벽히 적용한 SQLite CRUD API 프로젝트입니다.

## 프로젝트 구조

```
src/
├── config/              # 애플리케이션 설정
│   ├── app.ts          # 앱 설정 (포트, CORS 등)
│   └── database.ts     # 데이터베이스 설정
├── models/              # 데이터 모델 (namespace 패턴)
│   └── user.model.ts   # User namespace: 타입, 스키마, 에러 정의
├── services/            # 비즈니스 로직 (abstract class 패턴)
│   └── user.service.ts # UserService abstract class (static 메서드)
├── middlewares/         # 미들웨어
│   ├── error.middleware.ts   # 중앙 집중식 에러 핸들링
│   └── logger.middleware.ts  # 요청 로깅
├── plugins/             # Elysia 플러그인
│   └── database.plugin.ts    # 데이터베이스 의존성 주입
├── routes/              # 라우트 모듈
│   ├── user.routes.ts  # User 라우트 (Service 직접 호출)
│   └── index.ts        # 라우트 aggregator
└── index.ts             # 메인 애플리케이션
```

## Elysia.js 공식 Best Practice 적용

### 1. **Namespace Pattern (Models)**

**❌ 잘못된 방법 (NestJS 스타일)**
```typescript
export interface CreateUserDTO {
  name: string;
  email: string;
}
export const CreateUserSchema = t.Object({ ... });
```

**✅ Elysia 공식 방법 (Namespace)**
```typescript
export namespace UserModel {
  // 스키마 정의
  export const create = t.Object({
    name: t.String({ minLength: 1, maxLength: 100 }),
    email: t.String({ format: "email" }),
  });

  // 스키마에서 타입 추출
  export type Create = typeof create.static;

  // 에러 타입도 namespace에 포함
  export const notFound = t.Literal("User not found");
  export type NotFound = typeof notFound.static;
}
```

**장점:**
- 관련된 타입과 스키마를 하나의 namespace로 그룹화
- `typeof schema.static`으로 자동 타입 추출
- 모든 User 관련 타입을 한 곳에서 관리

### 2. **Abstract Class Pattern (Services)**

**❌ 잘못된 방법 (인스턴스 기반)**
```typescript
export class UserService {
  constructor(private db: Database) {}  // ❌ 인스턴스 생성

  async getUsers() {
    return this.db.query(...);
  }
}

// 사용할 때
const userService = new UserService(db);  // ❌ 불필요한 할당
```

**✅ Elysia 공식 방법 (Abstract Class)**
```typescript
export abstract class UserService {
  // static 메서드만 사용 - 인스턴스 생성 불필요
  static getAllUsers(db: Database): UserModel.Entity[] {
    const query = db.query("SELECT * FROM users");
    return query.all() as UserModel.Entity[];
  }

  static getUserById(db: Database, id: number): UserModel.Entity {
    // throw status()로 HTTP 에러 직접 던지기
    if (!user) {
      throw status(404, "User not found" satisfies UserModel.NotFound);
    }
    return user;
  }
}

// 사용할 때
UserService.getAllUsers(db);  // ✅ 바로 호출, 메모리 효율적
```

**장점:**
- 클래스 인스턴스 할당 없음 → 메모리 절약
- 더 가벼운 런타임
- `status()` 함수로 타입 안전한 HTTP 에러 처리
- `satisfies`로 에러 타입 보장

### 3. **No Controller Layer**

**❌ 잘못된 방법 (NestJS 스타일)**
```typescript
// Controller가 Service를 감싸는 불필요한 계층
export class UserController {
  constructor(private userService: UserService) {}

  async getAll() {
    return this.userService.getAllUsers();
  }
}
```

**✅ Elysia 공식 방법 (Routes에서 직접 호출)**
```typescript
export const userRoutes = new Elysia({ prefix: "/users" })
  .get("/", ({ db }) => UserService.getAllUsers(db))
  .get("/:id", ({ db, params }) => UserService.getUserById(db, params.id))
  .post("/", ({ db, body }) => UserService.createUser(db, body), {
    body: UserModel.create,  // 스키마 유효성 검증
  });
```

**장점:**
- 불필요한 계층 제거
- 더 직관적인 코드
- 의존성 주입 복잡도 감소

### 4. **Simple Plugin (DB Injection Only)**

**❌ 잘못된 방법**
```typescript
// Service와 Controller를 모두 주입
export const databasePlugin = new Elysia()
  .decorate("db", db)
  .decorate("userService", new UserService(db))
  .decorate("userController", new UserController(...));
```

**✅ Elysia 공식 방법**
```typescript
// DB만 주입, Service는 static이므로 주입 불필요
export const databasePlugin = new Elysia({ name: "database" })
  .decorate("db", db)
  .onStop(() => db.close());
```

**장점:**
- 플러그인이 단순해짐
- Service는 abstract class이므로 주입 불필요
- 메모리 효율성

### 5. **Type-safe Error Handling**

```typescript
// Service에서
if (!user) {
  throw status(404, "User not found" satisfies UserModel.NotFound);
}

if (existingUser) {
  throw status(409, "Email already exists" satisfies UserModel.EmailExists);
}
```

**장점:**
- `satisfies`로 에러 메시지 타입 검증
- 컴파일 타임에 에러 메시지 오타 방지
- Model에 정의된 에러 타입과 일치 보장

## API 엔드포인트

### Health Check
```bash
GET /api/v1/health
```

### Users CRUD

#### 모든 사용자 조회
```bash
GET /api/v1/users
```

#### 특정 사용자 조회
```bash
GET /api/v1/users/:id
```

#### 사용자 생성
```bash
POST /api/v1/users
Content-Type: application/json

{
  "name": "홍길동",
  "email": "hong@example.com"
}
```

#### 사용자 수정
```bash
PUT /api/v1/users/:id
Content-Type: application/json

{
  "name": "김철수",
  "email": "kim@example.com"
}
```

#### 사용자 삭제
```bash
DELETE /api/v1/users/:id
```

## 시작하기

### 개발 모드

```bash
# Hot reload로 실행
bun run dev
```

### 프로덕션 모드

```bash
bun start
```

## Best Practice 체크리스트

- ✅ **Namespace Pattern**: Model을 namespace로 그룹화
- ✅ **Abstract Class**: Service는 abstract class + static 메서드
- ✅ **No Instance Creation**: 클래스 인스턴스 생성 없음
- ✅ **Direct Service Call**: Routes에서 Service 직접 호출
- ✅ **Type Extraction**: `typeof schema.static`로 타입 추출
- ✅ **Type-safe Errors**: `status()` + `satisfies`로 타입 안전 에러
- ✅ **Simple Plugins**: 필요한 것만 주입
- ✅ **Memory Efficient**: 불필요한 객체 할당 최소화

## Elysia vs NestJS 패턴 비교

| 항목 | NestJS (❌) | Elysia (✅) |
|------|------------|-------------|
| Models | 별도 interface + 별도 schema | Namespace로 그룹화 |
| Services | Class + 인스턴스 생성 | Abstract class + static |
| Controllers | 별도 Controller 클래스 | Routes에서 직접 호출 |
| DI | 복잡한 의존성 주입 | 간단한 플러그인 |
| 메모리 | 많은 인스턴스 생성 | 최소한의 할당 |
| 성능 | 무거움 | 가벼움 |

## 확장 예시

### 새 리소스 추가 (Posts)

```typescript
// 1. Model 정의
export namespace PostModel {
  export const create = t.Object({
    title: t.String(),
    content: t.String(),
  });
  export type Create = typeof create.static;
}

// 2. Service 정의
export abstract class PostService {
  static getAllPosts(db: Database) {
    // ...
  }
}

// 3. Routes 정의
export const postRoutes = new Elysia({ prefix: "/posts" })
  .get("/", ({ db }) => PostService.getAllPosts(db));

// 4. Routes에 추가
export const routes = new Elysia({ prefix: "/api/v1" })
  .use(userRoutes)
  .use(postRoutes);
```

## 기술 스택

- **Runtime**: Bun
- **Framework**: Elysia.js
- **Database**: SQLite (bun:sqlite)
- **Language**: TypeScript
- **Pattern**: Official Elysia Best Practice

## 참고 자료

- [Elysia.js Best Practice](https://elysiajs.com/essential/best-practice.html)
- [Elysia.js Documentation](https://elysiajs.com)

## 라이선스

ISC
