import { Request, Response } from "express";
import { AuthService } from "../services/AuthService";
import { sendSuccess, sendError } from "../utils/response";
import type { RegisterInput, LoginInput } from "../schemas";

export class AuthController {
  static async register(req: Request, res: Response): Promise<void> {
    try {
      // req.body is already validated & typed by the Zod middleware
      const body = req.body as RegisterInput;
      const result = await AuthService.register(body);
      sendSuccess(res, result, "Account created successfully", 201);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Registration failed";
      sendError(res, message, 400);
    }
  }

  static async login(req: Request, res: Response): Promise<void> {
    try {
      const body = req.body as LoginInput;
      const result = await AuthService.login(body);
      sendSuccess(res, result, "Login successful");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Login failed";
      sendError(res, message, 401);
    }
  }
}
