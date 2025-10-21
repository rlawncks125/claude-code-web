// User routes - directly call Service static methods (Elysia Best Practice)
import { Elysia } from "elysia";
import { UserModel } from "../models/user.model";
import { UserService } from "../services/user.service";

export const userRoutes = new Elysia({ prefix: "/users" })
  .get(
    "/",
    ({ db }) => UserService.getAllUsers(db),
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
    ({ db, params }) => UserService.getUserById(db, params.id),
    {
      params: UserModel.params,
      detail: {
        tags: ["Users"],
        summary: "Get user by ID",
        description: "Retrieve a specific user by their ID",
      },
    }
  )
  .post(
    "/",
    ({ db, body }) => UserService.createUser(db, body),
    {
      body: UserModel.create,
      detail: {
        tags: ["Users"],
        summary: "Create new user",
        description: "Create a new user with name and email",
      },
    }
  )
  .put(
    "/:id",
    ({ db, params, body }) => UserService.updateUser(db, params.id, body),
    {
      params: UserModel.params,
      body: UserModel.update,
      detail: {
        tags: ["Users"],
        summary: "Update user",
        description: "Update user information by ID",
      },
    }
  )
  .delete(
    "/:id",
    ({ db, params }) => {
      UserService.deleteUser(db, params.id);
      return {
        success: true,
        message: "User deleted successfully",
      };
    },
    {
      params: UserModel.params,
      detail: {
        tags: ["Users"],
        summary: "Delete user",
        description: "Delete a user by their ID",
      },
    }
  );
