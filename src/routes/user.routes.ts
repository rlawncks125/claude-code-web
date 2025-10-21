// User routes module using Elysia groups
import { Elysia } from "elysia";
import {
  CreateUserSchema,
  UpdateUserSchema,
  UserIdSchema,
} from "../models/user.model";
import type { DatabaseContext } from "../plugins/database.plugin";

export const userRoutes = new Elysia({ prefix: "/users" })
  .get(
    "/",
    async ({ userController }: DatabaseContext) => {
      return await userController.getAll();
    },
    {
      detail: {
        tags: ["Users"],
        summary: "Get all users",
        description: "Retrieve a list of all users",
      },
    }
  )
  .get(
    "/:id",
    async ({ userController, params }: DatabaseContext & { params: any }) => {
      return await userController.getById(params.id);
    },
    {
      params: UserIdSchema,
      detail: {
        tags: ["Users"],
        summary: "Get user by ID",
        description: "Retrieve a specific user by their ID",
      },
    }
  )
  .post(
    "/",
    async ({ userController, body }: DatabaseContext & { body: any }) => {
      return await userController.create(body);
    },
    {
      body: CreateUserSchema,
      detail: {
        tags: ["Users"],
        summary: "Create new user",
        description: "Create a new user with name and email",
      },
    }
  )
  .put(
    "/:id",
    async ({
      userController,
      params,
      body,
    }: DatabaseContext & { params: any; body: any }) => {
      return await userController.update(params.id, body);
    },
    {
      params: UserIdSchema,
      body: UpdateUserSchema,
      detail: {
        tags: ["Users"],
        summary: "Update user",
        description: "Update user information by ID",
      },
    }
  )
  .delete(
    "/:id",
    async ({ userController, params }: DatabaseContext & { params: any }) => {
      return await userController.delete(params.id);
    },
    {
      params: UserIdSchema,
      detail: {
        tags: ["Users"],
        summary: "Delete user",
        description: "Delete a user by their ID",
      },
    }
  );
