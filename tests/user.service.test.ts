// Service layer unit tests
import { describe, test, expect, beforeEach } from "bun:test";
import { Database } from "bun:sqlite";
import { UserService } from "../src/services/user.service";
import { initializeSchema } from "../src/utils/database";

describe("UserService Unit Tests", () => {
  let db: Database;

  // Create in-memory database for each test
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
      expect(user.created_at).toBeDefined();
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

  describe("getAllUsers", () => {
    test("should return empty array when no users", () => {
      const users = UserService.getAllUsers(db);
      expect(users).toEqual([]);
    });

    test("should return all users", () => {
      UserService.createUser(db, {
        name: "User 1",
        email: "user1@example.com",
      });
      UserService.createUser(db, {
        name: "User 2",
        email: "user2@example.com",
      });

      const users = UserService.getAllUsers(db);
      expect(users.length).toBe(2);
      // Just check that both users exist
      const names = users.map((u) => u.name).sort();
      expect(names).toEqual(["User 1", "User 2"]);
    });
  });

  describe("getUserById", () => {
    test("should return user by ID", () => {
      const created = UserService.createUser(db, {
        name: "홍길동",
        email: "hong@example.com",
      });

      const user = UserService.getUserById(db, created.id);
      expect(user.id).toBe(created.id);
      expect(user.name).toBe("홍길동");
    });

    test("should throw error for non-existent user", () => {
      try {
        UserService.getUserById(db, 99999);
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error.code).toBe(404);
        expect(error.response).toBe("User not found");
      }
    });
  });

  describe("updateUser", () => {
    test("should update user name", () => {
      const created = UserService.createUser(db, {
        name: "홍길동",
        email: "hong@example.com",
      });

      const updated = UserService.updateUser(db, created.id, {
        name: "홍길동(수정)",
      });

      expect(updated.name).toBe("홍길동(수정)");
      expect(updated.email).toBe("hong@example.com");
    });

    test("should update user email", () => {
      const created = UserService.createUser(db, {
        name: "홍길동",
        email: "hong@example.com",
      });

      const updated = UserService.updateUser(db, created.id, {
        email: "new@example.com",
      });

      expect(updated.email).toBe("new@example.com");
    });

    test("should throw error for duplicate email", () => {
      UserService.createUser(db, {
        name: "User 1",
        email: "user1@example.com",
      });
      const user2 = UserService.createUser(db, {
        name: "User 2",
        email: "user2@example.com",
      });

      try {
        UserService.updateUser(db, user2.id, {
          email: "user1@example.com",
        });
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error.code).toBe(409);
        expect(error.response).toBe("Email already exists");
      }
    });

    test("should return same user if no changes", () => {
      const created = UserService.createUser(db, {
        name: "홍길동",
        email: "hong@example.com",
      });

      const updated = UserService.updateUser(db, created.id, {});
      expect(updated.id).toBe(created.id);
    });
  });

  describe("deleteUser", () => {
    test("should delete user successfully", () => {
      const created = UserService.createUser(db, {
        name: "홍길동",
        email: "hong@example.com",
      });

      UserService.deleteUser(db, created.id);

      try {
        UserService.getUserById(db, created.id);
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error.code).toBe(404);
        expect(error.response).toBe("User not found");
      }
    });

    test("should throw error when deleting non-existent user", () => {
      try {
        UserService.deleteUser(db, 99999);
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error.code).toBe(404);
        expect(error.response).toBe("User not found");
      }
    });
  });

  describe("getUserByEmail", () => {
    test("should return user by email", () => {
      UserService.createUser(db, {
        name: "홍길동",
        email: "hong@example.com",
      });

      const user = UserService.getUserByEmail(db, "hong@example.com");
      expect(user).not.toBeNull();
      expect(user?.email).toBe("hong@example.com");
    });

    test("should return null for non-existent email", () => {
      const user = UserService.getUserByEmail(db, "nonexistent@example.com");
      expect(user).toBeNull();
    });
  });
});
