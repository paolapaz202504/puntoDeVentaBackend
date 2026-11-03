import { Response, NextFunction } from "express";
import { AuthRequest } from "../../middlewares/authMiddleware.js";
import { TableService } from "./table.service.js";
import {
  createTableSchema,
  updateTableSchema,
  queryTableSchema,
} from "./table.schemas.js";

export class TableController {
  static async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const query = queryTableSchema.parse(req.query);
      const result = await TableService.list(query);
      return res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const table = await TableService.getById(id);
      return res.json({ success: true, data: table });
    } catch (error) {
      next(error);
    }
  }

  static async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = createTableSchema.parse(req.body);
      const createdBy = req.user?.id;
      const table = await TableService.create(data, createdBy);
      return res.status(201).json({
        success: true,
        message: "Mesa o espacio creado exitosamente",
        data: table,
      });
    } catch (error) {
      next(error);
    }
  }

  static async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const data = updateTableSchema.parse(req.body);
      const updatedBy = req.user?.id;
      const table = await TableService.update(id, data, updatedBy);
      return res.json({
        success: true,
        message: "Mesa o espacio actualizado exitosamente",
        data: table,
      });
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await TableService.delete(id);
      return res.json({
        success: true,
        message: "Mesa o espacio eliminado exitosamente",
      });
    } catch (error) {
      next(error);
    }
  }
}
