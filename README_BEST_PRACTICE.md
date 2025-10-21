# Elysia.js CRUD API - Best Practice Edition

Elysia.js Best Practice를 완벽히 적용한 엔터프라이즈급 CRUD API 프로젝트입니다.

## 프로젝트 구조

```
src/
├── config/              # 애플리케이션 설정
│   ├── app.ts          # 앱 설정 (포트, CORS 등)
│   └── database.ts     # 데이터베이스 설정
├── models/              # 데이터 모델 및 스키마
│   └── user.model.ts   # User 타입 정의 및 유효성 검증 스키마
├── services/            # 비즈니스 로직 레이어
│   └── user.service.ts # User 비즈니스 로직
├── controllers/         # HTTP 핸들러 레이어
│   └── user.controller.ts  # User HTTP 핸들러
├── middlewares/         # 미들웨어
│   ├── error.middleware.ts   # 중앙 집중식 에러 핸들링
│   └── logger.middleware.ts  # 요청 로깅
├── plugins/             # Elysia 플러그인
│   └── database.plugin.ts    # 데이터베이스 의존성 주입
├── routes/              # 라우트 모듈
│   ├── user.routes.ts  # User 라우트
│   └── index.ts        # 라우트 aggregator
└── index.ts             # 메인 애플리케이션 진입점
```

## Best Practice 적용 사항

### 1. 계층화 아키텍처 (Layered Architecture)

각 레이어는 명확한 책임을 가지고 분리되어 있습니다:

- **Models**: 데이터 구조 및 유효성 검증 스키마 정의
- **Services**: 비즈니스 로직 처리 (데이터베이스와 독립적)
- **Controllers**: HTTP 요청/응답 처리
- **Routes**: 엔드포인트 정의 및 그룹화
- **Middlewares**: 횡단 관심사 (로깅, 에러 처리)
- **Plugins**: 재사용 가능한 기능 모듈

### 2. 의존성 주입 (Dependency Injection)

```typescript
// 플러그인을 통한 의존성 주입
export const databasePlugin = new Elysia({ name: "database" })
  .decorate("db", db)
  .decorate("userService", userService)
  .decorate("userController", userController);
```

### 3. 타입 안정성 (Type Safety)

- TypeScript의 강력한 타입 시스템 활용
- Elysia의 `t` 스키마를 통한 런타임 유효성 검증
- DTO(Data Transfer Object) 패턴 사용

### 4. 에러 핸들링

중앙 집중식 에러 핸들링으로 일관된 에러 응답:

```typescript
{
  "success": false,
  "error": "Not Found",
  "message": "User not found"
}
```

### 5. 라우트 그룹화

API 버전 관리 및 모듈별 라우트 그룹화:

```typescript
export const routes = new Elysia({ prefix: "/api/v1" })
  .use(userRoutes);
```

### 6. 미들웨어 패턴

- 요청 로깅
- 에러 핸들링
- 인증/인가 (확장 가능)

### 7. 플러그인 시스템

재사용 가능한 기능을 플러그인으로 캡슐화:

```typescript
app
  .use(errorMiddleware)
  .use(loggerMiddleware)
  .use(databasePlugin)
  .use(routes);
```

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

### 설치

```bash
# 의존성 설치
bun install
```

### 개발 모드

```bash
# Hot reload로 실행
bun run dev
```

### 프로덕션 모드

```bash
# 프로덕션 실행
bun start
```

서버는 기본적으로 `http://localhost:3000`에서 실행됩니다.

## 환경 변수

`.env` 파일에서 설정 가능:

```bash
# Server
PORT=3000
HOST=0.0.0.0
NODE_ENV=development

# Database
DB_PATH=./data.db

# CORS
CORS_ORIGIN=*
```

## 사용 예시

### cURL

```bash
# 사용자 생성
curl -X POST http://localhost:3000/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{"name":"홍길동","email":"hong@example.com"}'

# 모든 사용자 조회
curl http://localhost:3000/api/v1/users

# 사용자 수정
curl -X PUT http://localhost:3000/api/v1/users/1 \
  -H "Content-Type: application/json" \
  -d '{"name":"김철수"}'

# 사용자 삭제
curl -X DELETE http://localhost:3000/api/v1/users/1
```

## 데이터베이스

- **Engine**: SQLite (bun:sqlite)
- **ORM**: 없음 (네이티브 쿼리 사용)
- **파일**: `data.db` (프로젝트 루트)
- **모드**: WAL (Write-Ahead Logging)

### 스키마

```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Trigger for updated_at
CREATE TRIGGER update_user_timestamp
AFTER UPDATE ON users
FOR EACH ROW
BEGIN
  UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
```

## 확장 가능성

이 프로젝트 구조는 다음과 같은 기능을 쉽게 추가할 수 있습니다:

### 인증/인가
```typescript
// src/middlewares/auth.middleware.ts
export const authMiddleware = new Elysia()
  .onBeforeHandle(({ headers }) => {
    // JWT 검증 로직
  });
```

### 추가 리소스
```typescript
// src/routes/posts.routes.ts
export const postRoutes = new Elysia({ prefix: "/posts" })
  .get("/", ...)
  .post("/", ...);
```

### Swagger 문서화
```bash
# Swagger 설치
bun add @elysiajs/swagger

# src/index.ts에서 주석 해제
```

## 기술 스택

- **Runtime**: Bun
- **Framework**: Elysia.js
- **Database**: SQLite
- **Language**: TypeScript
- **Validation**: Elysia Type System

## Best Practice 체크리스트

- ✅ 계층화 아키텍처 (Models, Services, Controllers, Routes)
- ✅ 의존성 주입 패턴
- ✅ 중앙 집중식 에러 핸들링
- ✅ 타입 안전성 (TypeScript + Elysia Types)
- ✅ 모듈화 및 플러그인 시스템
- ✅ API 버전 관리
- ✅ 환경 변수 관리
- ✅ 로깅 미들웨어
- ✅ 유효성 검증
- ✅ RESTful API 디자인

## 라이선스

ISC
