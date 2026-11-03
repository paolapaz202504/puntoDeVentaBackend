import { Response, NextFunction } from "express";
import { AuthRequest } from "../../middlewares/authMiddleware.js";
import { RoleService } from "./role.service.js";
import {
  createRoleSchema,
  updateRoleSchema,
  queryRoleSchema,
} from "./role.schemas.js";

export class RoleController {
  static async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const query = queryRoleSchema.parse(req.query);
      const result = await RoleService.list(query);
      return res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const role = await RoleService.getById(req.params.id);
      return res.json({ success: true, data: role });
    } catch (error) {
      next(error);
    }
  }

  static async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const body = createRoleSchema.parse(req.body);
      const created = await RoleService.create(body, req.user?.id);
      return res.status(201).json({
        success: true,
        message: "Rol creado exitosamente",
        data: created,
      });
    } catch (error) {
      next(error);
    }
  }

  static async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const body = updateRoleSchema.parse(req.body);
      const updated = await RoleService.update(req.params.id, body, req.user?.id);
      return res.json({
        success: true,
        message: "Rol actualizado exitosamente",
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await RoleService.delete(req.params.id);
      return res.json({
        success: true,
        message: "Rol eliminado exitosamente",
      });
    } catch (error) {
      next(error);
    }
  }
}
