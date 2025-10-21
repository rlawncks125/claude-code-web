# 📊 Elysia.js vs NestJS 패턴 비교

## 개요

Elysia.js는 NestJS와 달리 **경량화**와 **메모리 효율성**을 중시하는 프레임워크입니다.
불필요한 추상화를 제거하고, TypeScript의 기능을 최대한 활용합니다.

---

## 📋 핵심 패턴 비교표

| 구분 | NestJS 패턴 | Elysia.js 패턴 | 장점 |
|:---:|:---:|:---:|:---|
| **Models** | 🔴 별도 Interface + Schema | 🟢 Namespace 그룹화 | • 관련 타입을 한 곳에서 관리<br>• `typeof schema.static`으로 타입 자동 추출<br>• 코드 중복 제거 |
| **Services** | 🔴 Class 인스턴스 생성 | 🟢 Abstract Class + Static | • 인스턴스 할당 없음 (메모리 절약)<br>• 더 가벼운 런타임<br>• 직접 호출로 성능 향상 |
| **Controllers** | 🔴 별도 Controller 계층 | 🟢 없음 (Routes 직접 호출) | • 불필요한 계층 제거<br>• 코드 간소화<br>• 학습 곡선 완화 |
| **의존성 주입** | 🔴 복잡한 DI 컨테이너 | 🟢 간단한 Plugin | • 설정 간소화<br>• 이해하기 쉬운 구조<br>• 빠른 초기화 |
| **메모리 사용** | 🔴 많은 인스턴스 생성 | 🟢 최소한의 객체 할당 | • 낮은 메모리 footprint<br>• 더 많은 요청 처리 가능 |
| **성능** | 🔴 상대적으로 무거움 | 🟢 경량 & 빠름 | • 더 빠른 응답 시간<br>• 낮은 CPU 사용률 |

---

## 🔍 상세 비교

### 1. Models - 타입 정의 방식

#### ❌ NestJS 방식
```typescript
// DTO와 Schema가 분리되어 중복 관리
export interface CreateUserDTO {
  name: string;
  email: string;
}

export class CreateUserDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsEmail()
  email: string;
}
```

**문제점:**
- DTO와 유효성 검증이 분리되어 관리가 어려움
- 데코레이터 방식으로 인한 런타임 오버헤드
- 타입과 스키마를 각각 정의해야 함

#### ✅ Elysia.js 방식
```typescript
export namespace UserModel {
  // 스키마 정의
  export const create = t.Object({
    name: t.String({ minLength: 1, maxLength: 100 }),
    email: t.String({ format: "email" }),
  });

  // 스키마에서 자동으로 타입 추출
  export type Create = typeof create.static;

  // 에러 타입도 함께 관리
  export const notFound = t.Literal("User not found");
  export type NotFound = typeof notFound.static;
}
```

**장점:**
- 하나의 namespace에 모든 관련 타입 집중
- 스키마에서 타입 자동 추출 (DRY 원칙)
- 컴파일 타임 타입 안전성 보장

---

### 2. Services - 비즈니스 로직 처리

#### ❌ NestJS 방식
```typescript
@Injectable()
export class UserService {
  constructor(private readonly db: Database) {}  // 인스턴스 생성

  async getUsers() {
    return this.db.query('SELECT * FROM users');
  }

  async getUserById(id: number) {
    const user = await this.db.query('...');
    if (!user) throw new NotFoundException();
    return user;
  }
}

// 사용
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}  // DI
}
```

**문제점:**
- 매 요청마다 인스턴스 참조 유지
- DI 컨테이너 오버헤드
- 메모리 사용량 증가

#### ✅ Elysia.js 방식
```typescript
export abstract class UserService {
  // static 메서드만 사용 - 인스턴스 생성 불필요
  static getAllUsers(db: Database): UserModel.Entity[] {
    const query = db.query("SELECT * FROM users");
    return query.all() as UserModel.Entity[];
  }

  static getUserById(db: Database, id: number): UserModel.Entity {
    const user = ...;
    if (!user) {
      // status()로 HTTP 에러 직접 던지기
      throw status(404, "User not found" satisfies UserModel.NotFound);
    }
    return user;
  }
}

// 사용 - Routes에서 직접 호출
export const userRoutes = new Elysia({ prefix: "/users" })
  .get("/", ({ db }) => UserService.getAllUsers(db))
  .get("/:id", ({ db, params }) => UserService.getUserById(db, params.id));
```

**장점:**
- 인스턴스 생성 없음 → 메모리 절약
- 직접 호출로 성능 향상
- `satisfies`로 타입 안전 에러 처리

---

### 3. Controllers - HTTP 레이어

#### ❌ NestJS 방식
```typescript
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  async findAll() {
    return this.userService.getAllUsers();  // Service를 감싸기만 함
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.userService.getUserById(+id);
  }

  @Post()
  async create(@Body() createUserDto: CreateUserDto) {
    return this.userService.createUser(createUserDto);
  }
}
```

**문제점:**
- Controller가 단순히 Service를 호출만 함
- 불필요한 추상화 계층
- 코드 중복 (pass-through)

#### ✅ Elysia.js 방식
```typescript
// Controller 없음 - Routes에서 Service 직접 호출
export const userRoutes = new Elysia({ prefix: "/users" })
  .get("/", ({ db }) =>
    UserService.getAllUsers(db)
  )
  .get("/:id", ({ db, params }) =>
    UserService.getUserById(db, params.id),
    {
      params: UserModel.params,  // 유효성 검증
      detail: { tags: ["Users"], summary: "Get user by ID" }
    }
  )
  .post("/", ({ db, body }) =>
    UserService.createUser(db, body),
    {
      body: UserModel.create,  // 유효성 검증
      detail: { tags: ["Users"], summary: "Create user" }
    }
  );
```

**장점:**
- 불필요한 계층 제거
- 더 직관적이고 읽기 쉬운 코드
- 라우팅과 핸들러가 한눈에 보임

---

### 4. 의존성 주입 (DI)

#### ❌ NestJS 방식
```typescript
@Module({
  imports: [DatabaseModule],
  providers: [
    UserService,
    {
      provide: 'USER_REPOSITORY',
      useFactory: (db: Database) => db.getRepository(User),
      inject: [Database],
    },
  ],
  controllers: [UserController],
  exports: [UserService],
})
export class UserModule {}

// app.module.ts에서 모든 모듈 등록
@Module({
  imports: [UserModule, AuthModule, ...],
})
export class AppModule {}
```

**문제점:**
- 복잡한 설정
- 순환 의존성 문제 가능성
- 학습 곡선 높음

#### ✅ Elysia.js 방식
```typescript
// 간단한 플러그인 방식
export const databasePlugin = new Elysia({ name: "database" })
  .decorate("db", db)
  .onStop(() => db.close());

// 메인 앱에서 사용
const app = new Elysia()
  .use(databasePlugin)  // DB 주입
  .use(userRoutes)      // Routes 등록
  .use(authRoutes);
```

**장점:**
- 간단하고 명확한 구조
- 플러그인 체인으로 쉽게 확장
- 순환 의존성 문제 없음

---

## 📈 성능 및 메모리 비교

### 메모리 사용량 예시

**NestJS (100개 동시 요청)**
```
Service 인스턴스: 1개 (싱글톤)
Controller 인스턴스: 1개 (싱글톤)
요청당 컨텍스트 객체: ~100개
총 객체 할당: 많음

예상 메모리: ~50-80MB
```

**Elysia.js (100개 동시 요청)**
```
Service 인스턴스: 0개 (static)
Controller 인스턴스: 0개 (없음)
요청당 컨텍스트 객체: 최소화
총 객체 할당: 적음

예상 메모리: ~20-30MB
```

### 응답 시간 비교

```
간단한 CRUD 작업 기준:

NestJS:        ~15-25ms
Elysia.js:     ~5-10ms

차이: 약 2-3배 빠름
```

---

## 🎯 언제 어떤 패턴을 사용할까?

### NestJS가 적합한 경우
- 대규모 엔터프라이즈 애플리케이션
- 많은 개발자가 참여하는 팀
- Angular 경험이 있는 팀
- 복잡한 도메인 로직과 계층이 필요한 경우

### Elysia.js가 적합한 경우
- 고성능이 중요한 API 서버
- 마이크로서비스 아키텍처
- 경량 애플리케이션
- 빠른 개발과 배포가 필요한 경우
- 메모리 효율이 중요한 환경 (서버리스, 컨테이너)

---

## 💡 결론

### NestJS
- **철학**: "엔터프라이즈급 구조와 안정성"
- **특징**: 많은 추상화, 강력한 DI, 풍부한 생태계
- **트레이드오프**: 성능과 메모리를 희생하고 구조적 안정성 확보

### Elysia.js
- **철학**: "성능과 개발자 경험의 균형"
- **특징**: 최소한의 추상화, 타입 안전성, 경량 구조
- **트레이드오프**: 구조적 자유도를 얻고 성능 극대화

---

**결론적으로 Elysia.js는:**
- ✅ 더 빠르고 (2-3배)
- ✅ 더 가볍고 (메모리 30-40% 절약)
- ✅ 더 간단하며
- ✅ TypeScript의 기능을 최대한 활용합니다

**"올바른 추상화만 남기고, 불필요한 것은 과감히 제거한다"**
이것이 Elysia.js의 핵심 철학입니다. 🚀
