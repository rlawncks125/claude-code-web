// User business logic service
import type { Database } from "bun:sqlite";
import type {
  User,
  CreateUserDTO,
  UpdateUserDTO,
} from "../models/user.model";

export class UserService {
  constructor(private db: Database) {}

  /**
   * Get all users
   */
  getAllUsers(): User[] {
    const query = this.db.query("SELECT * FROM users ORDER BY created_at DESC");
    return query.all() as User[];
  }

  /**
   * Get user by ID
   */
  getUserById(id: number): User | null {
    const query = this.db.query("SELECT * FROM users WHERE id = ?");
    const user = query.get(id) as User | undefined;
    return user || null;
  }

  /**
   * Get user by email
   */
  getUserByEmail(email: string): User | null {
    const query = this.db.query("SELECT * FROM users WHERE email = ?");
    const user = query.get(email) as User | undefined;
    return user || null;
  }

  /**
   * Create new user
   */
  createUser(data: CreateUserDTO): User {
    // Check if email already exists
    if (this.getUserByEmail(data.email)) {
      throw new Error("Email already exists");
    }

    const query = this.db.query(
      "INSERT INTO users (name, email) VALUES (?, ?) RETURNING *"
    );
    return query.get(data.name, data.email) as User;
  }

  /**
   * Update user
   */
  updateUser(id: number, data: UpdateUserDTO): User {
    const user = this.getUserById(id);
    if (!user) {
      throw new Error("User not found");
    }

    // Check email uniqueness if email is being updated
    if (data.email && data.email !== user.email) {
      const existingUser = this.getUserByEmail(data.email);
      if (existingUser) {
        throw new Error("Email already exists");
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
    const query = this.db.query(
      `UPDATE users SET ${updates.join(", ")} WHERE id = ? RETURNING *`
    );
    return query.get(...values) as User;
  }

  /**
   * Delete user
   */
  deleteUser(id: number): boolean {
    const user = this.getUserById(id);
    if (!user) {
      throw new Error("User not found");
    }

    const query = this.db.query("DELETE FROM users WHERE id = ?");
    query.run(id);
    return true;
  }

  /**
   * Check if user exists
   */
  userExists(id: number): boolean {
    return this.getUserById(id) !== null;
  }
}
