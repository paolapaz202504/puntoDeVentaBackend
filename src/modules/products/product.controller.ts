import { Response, NextFunction } from "express";
import { AuthRequest } from "../../middlewares/authMiddleware.js";
import { ProductService } from "./product.service.js";
import { cloudStorage } from "../../services/cloudStorage.service.js";
import {
  createProductSchema,
  updateProductSchema,
  queryProductSchema,
} from "./product.schemas.js";

export class ProductController {
  static async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const query = queryProductSchema.parse(req.query);
      const result = await ProductService.list(query);
      return res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const product = await ProductService.getById(id);
      return res.json({ success: true, data: product });
    } catch (error) {
      next(error);
    }
  }

  static async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = createProductSchema.parse(req.body);
      const createdBy = req.user?.id;
      const product = await ProductService.create(data, createdBy);
      return res.status(201).json({
        success: true,
        message: "Producto creado exitosamente",
        data: product,
      });
    } catch (error) {
      next(error);
    }
  }

  static async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const data = updateProductSchema.parse(req.body);
      const updatedBy = req.user?.id;
      const product = await ProductService.update(id, data, updatedBy);
      return res.json({
        success: true,
        message: "Producto actualizado exitosamente",
        data: product,
      });
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await ProductService.delete(id);
      return res.json({
        success: true,
        message: "Producto eliminado exitosamente",
      });
    } catch (error) {
      next(error);
    }
  }

  static async uploadImage(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No se proporcionó ningún archivo de imagen",
        });
      }
      const imageUrl = `/files/products/${req.file.filename}`;

      // Sincronizar imagen con Google Cloud Storage en segundo plano
      if (cloudStorage.isAvailable()) {
        cloudStorage.uploadLocalFile(
          req.file.path,
          `files/products/${req.file.filename}`,
          req.file.mimetype
        ).catch((err) => {
          console.error("Error al sincronizar imagen con GCS:", err);
        });
      }

      return res.json({
        success: true,
        message: "Imagen de producto subida exitosamente",
        imageUrl,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getPresentations(_req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const presentations = await ProductService.getDistinctPresentations();
      return res.json({
        success: true,
        items: presentations,
        data: presentations,
      });
    } catch (error) {
      next(error);
    }
  }
}
