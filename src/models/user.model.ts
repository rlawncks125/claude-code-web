// User model and types
import { t } from "elysia";

// Database user interface
export interface User {
  id: number;
  name: string;
  email: string;
  created_at: string;
  updated_at: string;
}

// DTOs (Data Transfer Objects)
export interface CreateUserDTO {
  name: string;
  email: string;
}

export interface UpdateUserDTO {
  name?: string;
  email?: string;
}

// Elysia validation schemas
export const CreateUserSchema = t.Object({
  name: t.String({ minLength: 1, maxLength: 100 }),
  email: t.String({ format: "email", maxLength: 255 }),
});

export const UpdateUserSchema = t.Object({
  name: t.Optional(t.String({ minLength: 1, maxLength: 100 })),
  email: t.Optional(t.String({ format: "email", maxLength: 255 })),
});

export const UserIdSchema = t.Object({
  id: t.Numeric({ minimum: 1 }),
});

// Response types
export type UserResponse = User;
export type UsersResponse = User[];
