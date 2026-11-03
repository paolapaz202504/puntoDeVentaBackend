import { Response, NextFunction } from "express";
import { AuthRequest } from "../../middlewares/authMiddleware.js";
import { PermissionService } from "./permission.service.js";
import {
  queryPermissionSchema,
  assignRolePermissionsSchema,
} from "./permission.schemas.js";

export class PermissionController {
  static async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const query = queryPermissionSchema.parse(req.query);
      const result = await PermissionService.list(query);
      return res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  static async getRolePermissions(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await PermissionService.getRolePermissions(req.params.roleId);
      return res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async setRolePermissions(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { permission_ids } = assignRolePermissionsSchema.parse(req.body);
      const result = await PermissionService.setRolePermissions(
        req.params.roleId,
        permission_ids,
        req.user?.id
      );
      return res.json({
        success: true,
        message: "Permisos actualizados exitosamente para el rol",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
