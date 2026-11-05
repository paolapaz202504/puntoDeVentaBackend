import { z } from "zod";

export const createAreaSchema = z.object({
  name: z
    .string({ required_error: "El nombre del área es obligatorio" })
    .trim()
    .min(3, "El nombre del área debe contener entre 3 y 50 caracteres")
    .max(50, "El nombre del área no puede superar los 50 caracteres"),
});

export const updateAreaSchema = createAreaSchema.partial();

export const queryAreaSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(500).default(10),
  search: z.string().optional().default(""),
  sortBy: z.enum(["name", "created_at"]).default("name"),
  order: z.enum(["asc", "desc"]).default("asc"),
});
