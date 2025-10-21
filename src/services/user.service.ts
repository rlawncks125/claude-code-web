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
