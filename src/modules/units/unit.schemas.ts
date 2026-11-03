import { z } from "zod";

export const createUnitSchema = z.object({
  name: z
    .string({ required_error: "El nombre de la unidad es obligatorio" })
    .trim()
    .min(2, "El nombre debe contener al menos 2 caracteres")
    .max(50, "El nombre no puede superar los 50 caracteres"),
  symbol: z
    .string({ required_error: "El símbolo es obligatorio" })
    .trim()
    .min(1, "El símbolo debe contener al menos 1 caracter")
    .max(10, "El símbolo no puede superar los 10 caracteres")
    .toUpperCase(),
});

export const updateUnitSchema = createUnitSchema.partial();

export const queryUnitSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  search: z.string().optional().default(""),
  sortBy: z.enum(["name", "symbol", "created_at"]).default("name"),
  order: z.enum(["asc", "desc"]).default("asc"),
});
