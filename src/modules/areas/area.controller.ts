import { Response, NextFunction } from "express";
import { AuthRequest } from "../../middlewares/authMiddleware.js";
import { AreaService } from "./area.service.js";
import {
  createAreaSchema,
  updateAreaSchema,
  queryAreaSchema,
} from "./area.schemas.js";

export class AreaController {
  static async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const query = queryAreaSchema.parse(req.query);
      const result = await AreaService.list(query);
      return res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const area = await AreaService.getById(id);
      return res.json({ success: true, data: area });
    } catch (error) {
      next(error);
    }
  }

  static async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = createAreaSchema.parse(req.body);
      const createdBy = req.user?.id;
      const area = await AreaService.create(data, createdBy);
      return res.status(201).json({
        success: true,
        message: "Área creada exitosamente",
        data: area,
      });
    } catch (error) {
      next(error);
    }
  }

  static async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const data = updateAreaSchema.parse(req.body);
      const updatedBy = req.user?.id;
      const area = await AreaService.update(id, data, updatedBy);
      return res.json({
        success: true,
        message: "Área actualizada exitosamente",
        data: area,
      });
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await AreaService.delete(id);
      return res.json({
        success: true,
        message: "Área eliminada exitosamente",
      });
    } catch (error) {
      next(error);
    }
  }
}
