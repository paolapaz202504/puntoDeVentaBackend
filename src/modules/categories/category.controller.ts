import { Response, NextFunction } from "express";
import { AuthRequest } from "../../middlewares/authMiddleware.js";
import { CategoryService } from "./category.service.js";
import {
  createCategorySchema,
  updateCategorySchema,
  queryCategorySchema,
} from "./category.schemas.js";

export class CategoryController {
  static async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const query = queryCategorySchema.parse(req.query);
      const result = await CategoryService.list(query);
      return res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const category = await CategoryService.getById(id);
      return res.json({ success: true, data: category });
    } catch (error) {
      next(error);
    }
  }

  static async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = createCategorySchema.parse(req.body);
      const createdBy = req.user?.id;
      const category = await CategoryService.create(data, createdBy);
      return res.status(201).json({
        success: true,
        message: "Categoría creada exitosamente",
        data: category,
      });
    } catch (error) {
      next(error);
    }
  }

  static async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const data = updateCategorySchema.parse(req.body);
      const updatedBy = req.user?.id;
      const category = await CategoryService.update(id, data, updatedBy);
      return res.json({
        success: true,
        message: "Categoría actualizada exitosamente",
        data: category,
      });
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await CategoryService.delete(id);
      return res.json({
        success: true,
        message: "Categoría eliminada exitosamente",
      });
    } catch (error) {
      next(error);
    }
  }
}
