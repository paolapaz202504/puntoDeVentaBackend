import { Request, Response, NextFunction } from "express";
import { SupplierService } from "./supplier.service.js";
import { createSupplierSchema, updateSupplierSchema, querySupplierSchema } from "./supplier.schemas.js";

export class SupplierController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const query = querySupplierSchema.parse(req.query);
      const result = await SupplierService.list(query);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const supplier = await SupplierService.getById(id);
      res.json(supplier);
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = createSupplierSchema.parse(req.body);
      const user = (req as any).user;
      const created = await SupplierService.create(data, user?.user || "USER");
      res.status(201).json({
        message: "Proveedor registrado exitosamente",
        supplier: created,
      });
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const data = updateSupplierSchema.parse(req.body);
      const user = (req as any).user;
      const updated = await SupplierService.update(id, data, user?.user || "USER");
      res.json({
        message: "Proveedor actualizado exitosamente",
        supplier: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await SupplierService.delete(id);
      res.json({
        message: "Proveedor eliminado exitosamente",
      });
    } catch (error) {
      next(error);
    }
  }
}
