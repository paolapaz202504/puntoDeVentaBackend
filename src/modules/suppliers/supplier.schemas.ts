import { z } from "zod";

export const createSupplierSchema = z.object({
  name: z
    .string({ required_error: "El nombre del proveedor es obligatorio" })
    .trim()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(100, "El nombre no puede exceder 100 caracteres"),
  contact_name: z.string().trim().max(100).optional().nullable(),
  phone: z.string().trim().max(50).optional().nullable(),
  email: z.string().trim().email("Correo electrónico inválido").optional().nullable().or(z.literal("")),
  address: z.string().trim().max(255).optional().nullable(),
  category: z.enum(["FRUTAS", "PANADERIA", "CARNICERIA", "ABARROTES", "GENERAL"]).default("GENERAL"),
  is_active: z.boolean().default(true),
});

export const updateSupplierSchema = createSupplierSchema.partial();

export const querySupplierSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  search: z.string().optional().default(""),
  category: z.string().optional().default(""),
  sortBy: z.enum(["name", "category", "created_at"]).default("name"),
  order: z.enum(["asc", "desc"]).default("asc"),
});
