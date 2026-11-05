import { Request, Response, NextFunction } from "express";
import { ProductionService } from "./production.service.js";
import { createBatchSchema, queryBatchSchema } from "./production.schemas.js";

export class ProductionController {
  static async listBatches(req: Request, res: Response, next: NextFunction) {
    try {
      const query = queryBatchSchema.parse(req.query);
      const result = await ProductionService.listBatches(query);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  static async produceBatch(req: Request, res: Response, next: NextFunction) {
    try {
      const data = createBatchSchema.parse(req.body);
      const user = (req as any).user;
      const result = await ProductionService.produceBatch({
        ...data,
        createdBy: user?.user || "USER",
      });
      res.status(201).json({
        message: "Tanda de producción registrada exitosamente e inventario actualizado",
        production: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
