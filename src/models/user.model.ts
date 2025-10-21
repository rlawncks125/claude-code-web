// User model - namespace pattern (Elysia Best Practice)
import { t } from "elysia";

export namespace UserModel {
  // Database entity
  export interface Entity {
    id: number;
    name: string;
    email: string;
    created_at: string;
    updated_at: string;
  }

  // Create user validation schema
  export const create = t.Object({
    name: t.String({ minLength: 1, maxLength: 100 }),
    email: t.String({ format: "email", maxLength: 255 }),
  });
  export type Create = typeof create.static;

  // Update user validation schema
  export const update = t.Object({
    name: t.Optional(t.String({ minLength: 1, maxLength: 100 })),
    email: t.Optional(t.String({ format: "email", maxLength: 255 })),
  });
  export type Update = typeof update.static;

  // Params validation schema
  export const params = t.Object({
    id: t.Numeric({ minimum: 1 }),
  });
  export type Params = typeof params.static;

  // Response types
  export type Response = Entity;
  export type ListResponse = Entity[];

  // Error types
  export const notFound = t.Literal("User not found");
  export type NotFound = typeof notFound.static;

  export const emailExists = t.Literal("Email already exists");
  export type EmailExists = typeof emailExists.static;
}
