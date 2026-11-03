import { Request, Response, NextFunction } from "express";
import { AuthRequest } from "../../middlewares/authMiddleware.js";
import { SettingsService } from "./settings.service.js";
import { updateSettingsSchema } from "./settings.schemas.js";
import { cloudStorage } from "../../services/cloudStorage.service.js";

export class SettingsController {
  static async get(req: Request, res: Response, next: NextFunction) {
    try {
      const settings = await SettingsService.getSettings();
      return res.json({ success: true, data: settings });
    } catch (error) {
      next(error);
    }
  }

  static async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const body = updateSettingsSchema.parse(req.body);
      const updated = await SettingsService.updateSettings(body, req.user?.id);
      return res.json({
        success: true,
        message: "Información de la empresa actualizada exitosamente",
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  static async uploadLogo(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No se proporcionó ningún archivo de imagen para el logotipo",
        });
      }

      // La imagen se guardó en files/config/<filename>
      const logoUrl = `/files/config/${req.file.filename}`;

      // Sincronizar logotipo con Google Cloud Storage en segundo plano
      if (cloudStorage.isAvailable()) {
        cloudStorage.uploadLocalFile(
          req.file.path,
          `files/config/${req.file.filename}`,
          req.file.mimetype
        ).catch((err) => {
          console.error("Error al sincronizar logotipo con GCS:", err);
        });
      }

      const updated = await SettingsService.updateLogo(logoUrl, req.user?.id);

      return res.json({
        success: true,
        message: "Logotipo actualizado exitosamente",
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }
}
