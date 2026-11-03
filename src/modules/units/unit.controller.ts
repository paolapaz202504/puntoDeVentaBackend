import { Response, NextFunction } from "express";
import { AuthRequest } from "../../middlewares/authMiddleware.js";
import { UnitService } from "./unit.service.js";
import {
  createUnitSchema,
  updateUnitSchema,
  queryUnitSchema,
} from "./unit.schemas.js";

export class UnitController {
  static async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const query = queryUnitSchema.parse(req.query);
      const result = await UnitService.list(query);
      return res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const unit = await UnitService.getById(id);
      return res.json({ success: true, data: unit });
    } catch (error) {
      next(error);
    }
  }

  static async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = createUnitSchema.parse(req.body);
      const createdBy = req.user?.id;
      const unit = await UnitService.create(data, createdBy);
      return res.status(201).json({
        success: true,
        message: "Unidad de medida creada exitosamente",
        data: unit,
      });
    } catch (error) {
      next(error);
    }
  }

  static async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const data = updateUnitSchema.parse(req.body);
      const updatedBy = req.user?.id;
      const unit = await UnitService.update(id, data, updatedBy);
      return res.json({
        success: true,
        message: "Unidad de medida actualizada exitosamente",
        data: unit,
      });
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await UnitService.delete(id);
      return res.json({
        success: true,
        message: "Unidad de medida eliminada exitosamente",
      });
    } catch (error) {
      next(error);
    }
  }
}
