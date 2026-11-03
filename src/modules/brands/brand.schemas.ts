import { z } from "zod";

export const createBrandSchema = z.object({
  name: z
    .string({ required_error: "El nombre de la marca es obligatorio" })
    .trim()
    .min(2, "El nombre debe contener al menos 2 caracteres")
    .max(80, "El nombre no puede superar los 80 caracteres"),
  description: z.string().trim().max(255).optional().nullable(),
});

export const updateBrandSchema = createBrandSchema.partial();

export const queryBrandSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  search: z.string().optional().default(""),
  sortBy: z.enum(["name", "created_at"]).default("name"),
  order: z.enum(["asc", "desc"]).default("asc"),
});
