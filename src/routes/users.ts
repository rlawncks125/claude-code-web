// User CRUD routes following Elysia.js best practices
import { Elysia, t } from "elysia";
import type { User, CreateUser, UpdateUser } from "../db/schema";
import type { Database } from "bun:sqlite";

// User routes plugin
export const usersRoutes = new Elysia({ prefix: "/users" })
  .get(
    "/",
    ({ db }) => {
      const query = db.query("SELECT * FROM users");
      const users = query.all() as User[];
      return users;
    },
    {
      detail: {
        summary: "Get all users",
        tags: ["Users"],
      },
    }
  )
  .get(
    "/:id",
    ({ db, params: { id }, set }) => {
      const query = db.query("SELECT * FROM users WHERE id = ?");
      const user = query.get(id) as User | undefined;

      if (!user) {
        set.status = 404;
        return { message: "User not found" };
      }

      return user;
    },
    {
      params: t.Object({
        id: t.Numeric(),
      }),
      detail: {
        summary: "Get user by ID",
        tags: ["Users"],
      },
    }
  )
  .post(
    "/",
    ({ db, body, set }) => {
      try {
        const insertQuery = db.query(
          "INSERT INTO users (name, email) VALUES (?, ?) RETURNING *"
        );
        const newUser = insertQuery.get(body.name, body.email) as User;

        return newUser;
      } catch (err: any) {
        if (err.message?.includes("UNIQUE constraint failed")) {
          set.status = 400;
          return { message: "Email already exists" };
        }
        throw err;
      }
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1 }),
        email: t.String({ format: "email" }),
      }),
      detail: {
        summary: "Create new user",
        tags: ["Users"],
      },
    }
  )
  .put(
    "/:id",
    ({ db, params: { id }, body, set }) => {
      const checkQuery = db.query("SELECT * FROM users WHERE id = ?");
      const user = checkQuery.get(id) as User | undefined;

      if (!user) {
        set.status = 404;
        return { message: "User not found" };
      }

      try {
        const updates: string[] = [];
        const values: any[] = [];

        if (body.name !== undefined) {
          updates.push("name = ?");
          values.push(body.name);
        }
        if (body.email !== undefined) {
          updates.push("email = ?");
          values.push(body.email);
        }

        if (updates.length === 0) {
          return user;
        }

        values.push(id);
        const updateQuery = db.query(
          `UPDATE users SET ${updates.join(", ")} WHERE id = ? RETURNING *`
        );
        const updatedUser = updateQuery.get(...values) as User;

        return updatedUser;
      } catch (err: any) {
        if (err.message?.includes("UNIQUE constraint failed")) {
          set.status = 400;
          return { message: "Email already exists" };
        }
        throw err;
      }
    },
    {
      params: t.Object({
        id: t.Numeric(),
      }),
      body: t.Object({
        name: t.Optional(t.String({ minLength: 1 })),
        email: t.Optional(t.String({ format: "email" })),
      }),
      detail: {
        summary: "Update user",
        tags: ["Users"],
      },
    }
  )
  .delete(
    "/:id",
    ({ db, params: { id }, set }) => {
      const checkQuery = db.query("SELECT * FROM users WHERE id = ?");
      const user = checkQuery.get(id) as User | undefined;

      if (!user) {
        set.status = 404;
        return { message: "User not found" };
      }

      const deleteQuery = db.query("DELETE FROM users WHERE id = ?");
      deleteQuery.run(id);

      return { message: "User deleted successfully" };
    },
    {
      params: t.Object({
        id: t.Numeric(),
      }),
      detail: {
        summary: "Delete user",
        tags: ["Users"],
      },
    }
  );
