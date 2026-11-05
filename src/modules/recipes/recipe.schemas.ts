import { z } from "zod";

export const recipeItemSchema = z.object({
  ingredient_id: z.string().uuid("ID de ingrediente inválido"),
  quantity: z.coerce.number().positive("La cantidad debe ser mayor a 0"),
  unit: z.string().trim().min(1, "Unidad de medida obligatoria"),
});

export const createRecipeSchema = z.object({
  product_id: z.string().uuid("ID de producto final inválido"),
  name: z.string().trim().min(3, "El nombre de la receta debe tener al menos 3 caracteres"),
  recipe_type: z.enum(["BATCH_SCALABLE", "SUB_RECIPE_BATCH", "ON_DEMAND_UNIT"]).default("BATCH_SCALABLE"),
  base_yield: z.coerce.number().positive("El rendimiento base debe ser mayor a 0").default(1000),
  yield_unit: z.string().trim().min(1, "Unidad de rendimiento obligatoria").default("ML"),
  instructions: z.string().trim().optional().nullable(),
  is_active: z.boolean().default(true),
  items: z.array(recipeItemSchema).min(1, "La receta debe contener al menos 1 ingrediente"),
});

export const updateRecipeSchema = createRecipeSchema.partial();

export const queryRecipeSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  search: z.string().optional().default(""),
  recipe_type: z.string().optional().default(""),
  product_id: z.string().optional().default(""),
  sortBy: z.enum(["name", "recipe_type", "base_yield", "created_at"]).default("name"),
  order: z.enum(["asc", "desc"]).default("asc"),
});
