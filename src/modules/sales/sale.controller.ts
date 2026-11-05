import { Request, Response, NextFunction } from "express";
import { SaleService } from "./sale.service.js";
import { createSaleSchema, querySaleSchema } from "./sale.schemas.js";

export class SaleController {
  static async getPosProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const search = req.query.search as string | undefined;
      const categoryId = req.query.categoryId as string | undefined;
      const products = await SaleService.getPosProducts(search, categoryId);
      res.json(products);
    } catch (error) {
      next(error);
    }
  }

  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const query = querySaleSchema.parse(req.query);
      const result = await SaleService.list(query);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const sale = await SaleService.getById(id);
      res.json(sale);
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const input = createSaleSchema.parse(req.body);
      const userId = (req as any).user?.id;
      const created = await SaleService.create(input, userId);
      res.status(201).json(created);
    } catch (error) {
      next(error);
    }
  }

  static async cancel(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;
      const result = await SaleService.cancel(id, userId);
      res.json({ message: "Venta anulada con éxito y stock restituido", sale: result });
    } catch (error) {
      next(error);
    }
  }
}
