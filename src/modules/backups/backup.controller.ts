import { Response, NextFunction } from "express";
import { AuthRequest } from "../../middlewares/authMiddleware.js";
import { BackupService } from "./backup.service.js";
import { generateBackupSchema, queryBackupLogSchema } from "./backup.schemas.js";

export class BackupController {
  static async generate(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const body = generateBackupSchema.parse(req.body);
      const user = {
        id: req.user!.id,
        name: req.user!.name,
        user: req.user!.user,
      };

      const result = await BackupService.createBackup(user, body.custom_destination);

      return res.status(201).json({
        success: true,
        message: "Copia de seguridad generada exitosamente",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async listLogs(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const query = queryBackupLogSchema.parse(req.query);
      const result = await BackupService.listBackupLogs(query);
      return res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  static async download(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { filename } = req.params;
      const filePath = BackupService.getBackupFilePath(filename);
      return res.download(filePath, filename);
    } catch (error) {
      next(error);
    }
  }

  static async restore(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "Debe subir un documento .sql de respaldo para restaurar",
        });
      }

      const user = {
        id: req.user!.id,
        name: req.user!.name,
        user: req.user!.user,
      };

      const result = await BackupService.restoreBackup(req.file, user);

      return res.json({
        success: true,
        message: "Base de datos restaurada correctamente",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async listRestoreLogs(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const query = queryBackupLogSchema.parse(req.query);
      const result = await BackupService.listRestoreLogs(query);
      return res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }
}
