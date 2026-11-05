import { z } from "zod";

export const createBatchSchema = z.object({
  recipe_id: z.string().uuid("ID de receta inválido"),
  container_capacity_liters: z.coerce.number().min(0.5).max(50).optional().nullable(),
  multiplier: z.coerce.number().positive("El multiplicador debe ser mayor a 0").default(1),
  notes: z.string().trim().max(255).optional().nullable(),
});

export const queryBatchSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  product_id: z.string().optional().default(""),
});
