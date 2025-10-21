# Elysia.js CRUD API

Elysia.js Best Practice를 따라 구현한 SQLite 기반의 간단한 CRUD API입니다.

## 프로젝트 구조

```
src/
├── db/
│   ├── index.ts      # 데이터베이스 연결 관리
│   └── schema.ts     # 데이터베이스 스키마 정의
├── plugins/
│   └── db.ts         # 데이터베이스 플러그인 (의존성 주입)
├── routes/
│   └── users.ts      # 사용자 CRUD 라우트
└── index.ts          # 메인 애플리케이션
```

## Best Practices 적용

### 1. 플러그인 기반 구조
- **의존성 주입**: `dbPlugin`을 통해 데이터베이스 연결을 컨텍스트에 주입
- **모듈화**: 라우트를 독립적인 플러그인으로 분리
- **재사용성**: 플러그인을 다른 Elysia 앱에서도 사용 가능

### 2. 타입 안정성
- TypeScript를 활용한 강력한 타입 추론
- Elysia의 `t` 스키마를 사용한 런타임 유효성 검증
- 명시적 타입 정의 (`User`, `CreateUser`, `UpdateUser`)

### 3. 관심사의 분리
- **데이터베이스 로직**: `src/db/` 디렉토리
- **라우트 핸들러**: `src/routes/` 디렉토리
- **플러그인**: `src/plugins/` 디렉토리

### 4. 에러 핸들링
- 전역 에러 핸들러 구현
- HTTP 상태 코드에 따른 적절한 응답
- SQLite 제약 조건 에러 처리

### 5. 유효성 검증
- 요청 파라미터 유효성 검증
- 이메일 형식 검증
- 최소 길이 검증

## 시작하기

### 설치

```bash
bun install
```

### 개발 모드 (hot reload)

```bash
bun run dev
```

### 프로덕션 모드

```bash
bun run start
```

서버는 `http://localhost:3000`에서 실행됩니다.

## API 엔드포인트

### Health Check

```bash
GET /
GET /health
```

### Users CRUD

#### 모든 사용자 조회
```bash
GET /users
```

#### 특정 사용자 조회
```bash
GET /users/:id
```

#### 사용자 생성
```bash
POST /users
Content-Type: application/json

{
  "name": "홍길동",
  "email": "hong@example.com"
}
```

#### 사용자 수정
```bash
PUT /users/:id
Content-Type: application/json

{
  "name": "김철수",
  "email": "kim@example.com"
}
```

#### 사용자 삭제
```bash
DELETE /users/:id
```

## 사용 예시

### cURL 명령어

```bash
# 사용자 생성
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"name":"홍길동","email":"hong@example.com"}'

# 모든 사용자 조회
curl http://localhost:3000/users

# 특정 사용자 조회
curl http://localhost:3000/users/1

# 사용자 수정
curl -X PUT http://localhost:3000/users/1 \
  -H "Content-Type: application/json" \
  -d '{"name":"김철수"}'

# 사용자 삭제
curl -X DELETE http://localhost:3000/users/1
```

## 데이터베이스

- **엔진**: SQLite (better-sqlite3)
- **파일**: `data.db` (프로젝트 루트에 생성됨)
- **모드**: WAL (Write-Ahead Logging) - 더 나은 동시성 성능

### 스키마

```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## 기술 스택

- **Runtime**: Bun
- **Framework**: Elysia.js
- **Database**: SQLite (better-sqlite3)
- **Language**: TypeScript

## 라이선스

ISC
