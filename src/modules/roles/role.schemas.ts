import { z } from "zod";

// Acepta alfanuméricos, acentos (áéíóúÁÉÍÓÚñÑ), diéresis y espacios
const roleNameRegex = /^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑüÜ\s/]+$/;

export const createRoleSchema = z.object({
  name: z
    .string({ required_error: "El nombre del rol es obligatorio" })
    .trim()
    .min(3, "El nombre del rol debe contener entre 3 y 50 caracteres")
    .max(50, "El nombre del rol no puede superar los 50 caracteres")
    .regex(
      roleNameRegex,
      "El nombre solo acepta caracteres alfanuméricos, acentos y espacios, sin símbolos especiales"
    ),
  default_path: z.string().trim().max(100).optional().default("/"),
});

export const updateRoleSchema = createRoleSchema.partial();

export const queryRoleSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  search: z.string().optional().default(""),
  sortBy: z.enum(["name", "created_at"]).default("name"),
  order: z.enum(["asc", "desc"]).default("asc"),
});
