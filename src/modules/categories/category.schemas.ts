import { z } from "zod";

export const createCategorySchema = z.object({
  name: z
    .string({ required_error: "El nombre de la categoría es obligatorio" })
    .trim()
    .min(2, "El nombre debe contener al menos 2 caracteres")
    .max(60, "El nombre no puede superar los 60 caracteres"),
  description: z.string().trim().max(255).optional().nullable(),
  show_in_pos: z.boolean().optional().default(true),
});

export const updateCategorySchema = createCategorySchema.partial();

export const queryCategorySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  search: z.string().optional().default(""),
  show_in_pos: z.preprocess((val) => {
    if (val === "true" || val === true) return true;
    if (val === "false" || val === false) return false;
    return undefined;
  }, z.boolean().optional()),
  sortBy: z.enum(["name", "created_at"]).default("name"),
  order: z.enum(["asc", "desc"]).default("asc"),
});
