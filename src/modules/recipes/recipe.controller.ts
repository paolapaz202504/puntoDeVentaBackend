import { Request, Response, NextFunction } from "express";
import { RecipeService } from "./recipe.service.js";
import { createRecipeSchema, updateRecipeSchema, queryRecipeSchema } from "./recipe.schemas.js";

export class RecipeController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const query = queryRecipeSchema.parse(req.query);
      const result = await RecipeService.list(query);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const recipe = await RecipeService.getById(id);
      res.json(recipe);
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = createRecipeSchema.parse(req.body);
      const user = (req as any).user;
      const created = await RecipeService.create(data, user?.user || "USER");
      res.status(201).json({
        message: "Receta registrada exitosamente",
        recipe: created,
      });
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const data = updateRecipeSchema.parse(req.body);
      const user = (req as any).user;
      const updated = await RecipeService.update(id, data, user?.user || "USER");
      res.json({
        message: "Receta actualizada exitosamente",
        recipe: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await RecipeService.delete(id);
      res.json({
        message: "Receta eliminada exitosamente",
      });
    } catch (error) {
      next(error);
    }
  }
}
