// User API integration tests
import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { app } from "../src/index";

describe("User API Tests", () => {
  let testUserId: number;

  describe("Health Check", () => {
    test("GET / - should return welcome message", async () => {
      const response = await app.handle(new Request("http://localhost:3000/"));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toContain("Elysia CRUD API");
      expect(data.version).toBe("1.0.0");
    });

    test("GET /api/v1/health - should return health status", async () => {
      const response = await app.handle(
        new Request("http://localhost:3000/api/v1/health")
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe("ok");
      expect(data.service).toBe("Elysia CRUD API");
    });
  });

  describe("User CRUD Operations", () => {
    describe("POST /api/v1/users - Create User", () => {
      test("should create a new user", async () => {
        const response = await app.handle(
          new Request("http://localhost:3000/api/v1/users", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: "홍길동",
              email: "hong@example.com",
            }),
          })
        );
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.name).toBe("홍길동");
        expect(data.email).toBe("hong@example.com");
        expect(data.id).toBeDefined();

        // Save ID for later tests
        testUserId = data.id;
      });

      test("should fail with duplicate email", async () => {
        const response = await app.handle(
          new Request("http://localhost:3000/api/v1/users", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: "김철수",
              email: "hong@example.com", // duplicate
            }),
          })
        );

        expect(response.status).toBe(409);
        const text = await response.text();
        expect(text).toBe("Email already exists");
      });

      test("should fail with invalid email format", async () => {
        const response = await app.handle(
          new Request("http://localhost:3000/api/v1/users", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: "테스트",
              email: "invalid-email",
            }),
          })
        );

        // Elysia returns 422 for validation errors
        expect(response.status).toBe(422);
      });

      test("should fail with missing name", async () => {
        const response = await app.handle(
          new Request("http://localhost:3000/api/v1/users", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: "test@example.com",
            }),
          })
        );

        // Elysia returns 422 for validation errors
        expect(response.status).toBe(422);
      });
    });

    describe("GET /api/v1/users - Get All Users", () => {
      test("should return array of users", async () => {
        const response = await app.handle(
          new Request("http://localhost:3000/api/v1/users")
        );
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(Array.isArray(data)).toBe(true);
        expect(data.length).toBeGreaterThan(0);
      });
    });

    describe("GET /api/v1/users/:id - Get User by ID", () => {
      test("should return a specific user", async () => {
        const response = await app.handle(
          new Request(`http://localhost:3000/api/v1/users/${testUserId}`)
        );
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.id).toBe(testUserId);
        expect(data.name).toBe("홍길동");
        expect(data.email).toBe("hong@example.com");
      });

      test("should return 404 for non-existent user", async () => {
        const response = await app.handle(
          new Request("http://localhost:3000/api/v1/users/99999")
        );

        expect(response.status).toBe(404);
        const text = await response.text();
        expect(text).toBe("User not found");
      });
    });

    describe("PUT /api/v1/users/:id - Update User", () => {
      test("should update user name", async () => {
        const response = await app.handle(
          new Request(`http://localhost:3000/api/v1/users/${testUserId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: "홍길동(수정)",
            }),
          })
        );
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.name).toBe("홍길동(수정)");
        expect(data.email).toBe("hong@example.com");
      });

      test("should update user email", async () => {
        const response = await app.handle(
          new Request(`http://localhost:3000/api/v1/users/${testUserId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: "hong.new@example.com",
            }),
          })
        );
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.email).toBe("hong.new@example.com");
      });

      test("should return 404 for non-existent user", async () => {
        const response = await app.handle(
          new Request("http://localhost:3000/api/v1/users/99999", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: "Test",
            }),
          })
        );

        expect(response.status).toBe(404);
      });
    });

    describe("DELETE /api/v1/users/:id - Delete User", () => {
      test("should delete user", async () => {
        const response = await app.handle(
          new Request(`http://localhost:3000/api/v1/users/${testUserId}`, {
            method: "DELETE",
          })
        );
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.message).toBe("User deleted successfully");
      });

      test("should return 404 after deletion", async () => {
        const response = await app.handle(
          new Request(`http://localhost:3000/api/v1/users/${testUserId}`)
        );

        expect(response.status).toBe(404);
      });

      test("should return 404 when deleting non-existent user", async () => {
        const response = await app.handle(
          new Request("http://localhost:3000/api/v1/users/99999", {
            method: "DELETE",
          })
        );

        expect(response.status).toBe(404);
      });
    });
  });

  describe("Edge Cases", () => {
    test("should handle empty user list", async () => {
      const response = await app.handle(
        new Request("http://localhost:3000/api/v1/users")
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
    });

    test("should validate email format strictly", async () => {
      const invalidEmails = [
        "notanemail",
        "@example.com",
        "user@",
        "user @example.com",
      ];

      for (const email of invalidEmails) {
        const response = await app.handle(
          new Request("http://localhost:3000/api/v1/users", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: "Test",
              email,
            }),
          })
        );

        // Elysia returns 422 for validation errors
        expect(response.status).toBe(422);
      }
    });
  });
});
