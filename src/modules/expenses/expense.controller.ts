import { Request, Response, NextFunction } from "express";
import { ExpenseService } from "./expense.service.js";
import { createExpenseSchema, queryExpenseSchema } from "./expense.schemas.js";

export class ExpenseController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const query = queryExpenseSchema.parse(req.query);
      const result = await ExpenseService.list(query);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const expense = await ExpenseService.getById(id);
      res.json(expense);
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const input = createExpenseSchema.parse(req.body);
      const userId = (req as any).user?.id;
      const created = await ExpenseService.create(input, userId);
      res.status(201).json(created);
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await ExpenseService.delete(id);
      res.json({ message: "Gasto eliminado correctamente" });
    } catch (error) {
      next(error);
    }
  }
}
