import { Response, NextFunction } from "express";
import { AuthRequest } from "../../middlewares/authMiddleware.js";
import { BrandService } from "./brand.service.js";
import {
  createBrandSchema,
  updateBrandSchema,
  queryBrandSchema,
} from "./brand.schemas.js";

export class BrandController {
  static async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const query = queryBrandSchema.parse(req.query);
      const result = await BrandService.list(query);
      return res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const brand = await BrandService.getById(id);
      return res.json({
        success: true,
        data: brand,
      });
    } catch (error) {
      next(error);
    }
  }

  static async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = createBrandSchema.parse(req.body);
      const createdBy = req.user?.id;
      const brand = await BrandService.create(data, createdBy);
      return res.status(201).json({
        success: true,
        message: "Marca creada exitosamente",
        data: brand,
      });
    } catch (error) {
      next(error);
    }
  }

  static async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const data = updateBrandSchema.parse(req.body);
      const updatedBy = req.user?.id;
      const brand = await BrandService.update(id, data, updatedBy);
      return res.json({
        success: true,
        message: "Marca actualizada exitosamente",
        data: brand,
      });
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await BrandService.delete(id);
      return res.json({
        success: true,
        message: "Marca eliminada exitosamente",
      });
    } catch (error) {
      next(error);
    }
  }
}
