import { Request, Response, NextFunction } from "express";
import { AuthService } from "./auth.service.js";
import { loginSchema, updateProfileSchema } from "./auth.schemas.js";
import { AuthRequest } from "../../middlewares/authMiddleware.js";

export class AuthController {
  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const credentials = loginSchema.parse(req.body);
      const result = await AuthService.login(credentials);
      return res.json({
        success: true,
        message: "Inicio de sesión exitoso",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getProfile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const profile = await AuthService.getProfile(req.user!.id);
      return res.json({
        success: true,
        data: profile,
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateProfile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const body = updateProfileSchema.parse(req.body);
      const updated = await AuthService.updateProfile(req.user!.id, body);
      return res.json({
        success: true,
        message: "Perfil actualizado exitosamente",
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  static async logout(req: Request, res: Response) {
    // Al ser JWT sin estado, el cliente elimina el token localmente
    return res.json({
      success: true,
      message: "Sesión cerrada exitosamente",
    });
  }
}
