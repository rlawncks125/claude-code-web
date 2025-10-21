// User HTTP handlers
import type { UserService } from "../services/user.service";
import type { CreateUserDTO, UpdateUserDTO } from "../models/user.model";

export class UserController {
  constructor(private userService: UserService) {}

  /**
   * GET /users - Get all users
   */
  async getAll() {
    return this.userService.getAllUsers();
  }

  /**
   * GET /users/:id - Get user by ID
   */
  async getById(id: number) {
    const user = this.userService.getUserById(id);
    if (!user) {
      throw new Error("User not found");
    }
    return user;
  }

  /**
   * POST /users - Create new user
   */
  async create(data: CreateUserDTO) {
    return this.userService.createUser(data);
  }

  /**
   * PUT /users/:id - Update user
   */
  async update(id: number, data: UpdateUserDTO) {
    return this.userService.updateUser(id, data);
  }

  /**
   * DELETE /users/:id - Delete user
   */
  async delete(id: number) {
    this.userService.deleteUser(id);
    return {
      success: true,
      message: "User deleted successfully",
    };
  }
}
