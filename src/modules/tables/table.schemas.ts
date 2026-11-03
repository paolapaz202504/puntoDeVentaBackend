import { z } from "zod";

export const createTableSchema = z.object({
  name: z
    .string({ required_error: "El nombre de la mesa o espacio es obligatorio" })
    .trim()
    .min(3, "El nombre debe contener entre 3 y 50 caracteres")
    .max(50, "El nombre no puede superar los 50 caracteres"),
  area_id: z
    .string({ required_error: "Debe seleccionar un área para la mesa" })
    .uuid("Identificador de área inválido"),
});

export const updateTableSchema = createTableSchema.partial();

export const queryTableSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  search: z.string().optional().default(""),
  area_id: z.string().optional().default(""),
  sortBy: z.enum(["name", "created_at"]).default("name"),
  order: z.enum(["asc", "desc"]).default("asc"),
});
