import { Response, NextFunction } from "express";
import { AuthRequest } from "../../middlewares/authMiddleware.js";
import { UserService } from "./user.service.js";
import {
  createUserSchema,
  updateUserSchema,
  queryUserSchema,
} from "./user.schemas.js";

export class UserController {
  static async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const query = queryUserSchema.parse(req.query);
      const result = await UserService.list(query);
      return res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const user = await UserService.getById(req.params.id);
      return res.json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  }

  static async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const body = createUserSchema.parse(req.body);
      const created = await UserService.create(body, req.user?.id);
      return res.status(201).json({
        success: true,
        message: "Usuario creado exitosamente",
        data: created,
      });
    } catch (error) {
      next(error);
    }
  }

  static async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const body = updateUserSchema.parse(req.body);
      const updated = await UserService.update(req.params.id, body, req.user?.id);
      return res.json({
        success: true,
        message: "Usuario actualizado exitosamente",
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await UserService.delete(req.params.id);
      return res.json({
        success: true,
        message: "Usuario eliminado exitosamente",
      });
    } catch (error) {
      next(error);
    }
  }
}
