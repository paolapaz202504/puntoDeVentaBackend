import { Request, Response } from "express";
import { StockEntryService } from "./stockEntry.service.js";
import {
  createStockEntrySchema,
  addPaymentSchema,
  queryStockEntrySchema,
} from "./stockEntry.schemas.js";

export class StockEntryController {
  static async list(req: Request, res: Response) {
    try {
      const query = queryStockEntrySchema.parse(req.query);
      const result = await StockEntryService.list(query);
      res.json({
        success: true,
        data: result.data,
        meta: result.meta,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || "Error al consultar las entradas y compras",
      });
    }
  }

  static async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const entry = await StockEntryService.getById(id);
      res.json({
        success: true,
        data: entry,
      });
    } catch (error: any) {
      res.status(404).json({
        success: false,
        message: error.message || "Entrada no encontrada",
      });
    }
  }

  static async create(req: Request, res: Response) {
    try {
      const input = createStockEntrySchema.parse(req.body);
      const userId = (req as any).user?.id;
      const entry = await StockEntryService.create(input, userId);
      res.status(201).json({
        success: true,
        message: "Entrada de inventario registrada con éxito",
        data: entry,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || "Error al registrar la entrada",
        errors: error.errors,
      });
    }
  }

  static async addPayment(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const input = addPaymentSchema.parse(req.body);
      const userId = (req as any).user?.id;
      const result = await StockEntryService.addPayment(id, input, userId);
      res.json({
        success: true,
        message: "Abono registrado con éxito",
        data: result,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || "Error al registrar el abono",
        errors: error.errors,
      });
    }
  }

  static async getMetrics(_req: Request, res: Response) {
    try {
      const metrics = await StockEntryService.getMetrics();
      res.json({
        success: true,
        data: metrics,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || "Error al obtener métricas de compras",
      });
    }
  }
}
