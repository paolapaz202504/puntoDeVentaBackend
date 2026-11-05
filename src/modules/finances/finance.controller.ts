import { Request, Response, NextFunction } from "express";
import { FinanceService } from "./finance.service.js";

export class FinanceController {
  static async getOutflows(req: Request, res: Response, next: NextFunction) {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
      const search = req.query.search as string | undefined;
      const outflow_type = req.query.outflow_type as "TODOS" | "COMPRA" | "GASTO" | undefined;
      const payment_method = req.query.payment_method as string | undefined;
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;

      const result = await FinanceService.getOutflows({
        page,
        limit,
        search,
        outflow_type,
        payment_method,
        startDate,
        endDate,
      });

      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  static async getFinancialFlow(req: Request, res: Response, next: NextFunction) {
    try {
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;

      const result = await FinanceService.getFinancialFlow({
        startDate,
        endDate,
      });

      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  static async getDashboardMetrics(req: Request, res: Response, next: NextFunction) {
    try {
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;
      const result = await FinanceService.getDashboardMetrics(startDate, endDate);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}
