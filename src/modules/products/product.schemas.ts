import { z } from "zod";

export const purchasePresentationItemSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2, "Nombre de presentación obligatorio"),
  conversion_factor: z.coerce.number().int().min(1, "El factor de conversión debe ser al menos 1"),
  barcode: z.string().trim().optional().nullable(),
  default_cost: z.coerce.number().min(0).optional().nullable(),
});

export const createProductSchema = z.object({
  code: z
    .string({ required_error: "El código es obligatorio" })
    .trim()
    .min(2, "El código debe contener entre 2 y 30 caracteres")
    .max(30, "El código no puede superar los 30 caracteres")
    .toUpperCase(),
  name: z
    .string({ required_error: "El nombre del producto es obligatorio" })
    .trim()
    .min(3, "El nombre debe contener al menos 3 caracteres")
    .max(100, "El nombre no puede superar los 100 caracteres"),
  brand_id: z.string().uuid("Marca inválida").optional().nullable(),
  category_id: z.string().uuid("Categoría inválida"),
  base_unit_id: z.string().uuid("Unidad de medida inválida"),
  supplier_id: z.string().uuid("Proveedor inválido").optional().nullable(),
  product_type: z.enum(["DIRECT_SALE", "MANUFACTURED", "RAW_MATERIAL", "SUB_RECIPE", "ON_DEMAND"]).default("DIRECT_SALE"),
  sale_price: z.coerce.number().min(0, "El precio de venta no puede ser negativo"),
  current_cost: z.coerce.number().min(0, "El costo no puede ser negativo").default(0),
  current_stock: z.coerce.number().default(0),
  min_stock_alert: z.coerce.number().min(0).default(5),
  image_url: z.string().trim().optional().nullable(),
  is_active: z.boolean().default(true),
  presentations: z.array(purchasePresentationItemSchema).optional().default([]),
});

export const updateProductSchema = createProductSchema.partial();

export const queryProductSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(500).default(10),
  search: z.string().optional().default(""),
  category_id: z.string().optional().default(""),
  brand_id: z.string().optional().default(""),
  supplier_id: z.string().optional().default(""),
  product_type: z.string().optional().default(""),
  presentation: z.string().optional().default(""),
  sortBy: z.enum(["name", "code", "sale_price", "current_stock", "created_at", "category", "brand"]).default("name"),
  order: z.enum(["asc", "desc"]).default("asc"),
});
