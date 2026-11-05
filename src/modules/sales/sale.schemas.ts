import { z } from "zod";

export const SaleTypeEnum = z.enum(["DIRECTA", "MESA", "LLEVAR", "DELIVERY"]);
export const SalePaymentMethodEnum = z.enum(["EFECTIVO", "TARJETA", "TRANSFERENCIA"]);

export const createSaleItemSchema = z.object({
  product_id: z.string().uuid("ID de producto inválido"),
  quantity: z.coerce.number().positive("La cantidad debe ser mayor a 0"),
  unit_price: z.coerce.number().min(0, "El precio unitario no puede ser negativo"),
});

export const createSaleSchema = z.object({
  customer_name: z.string().trim().max(100).optional().default("Consumidor Final"),
  sale_type: SaleTypeEnum.default("DIRECTA"),
  table_id: z.string().uuid().optional().nullable(),
  payment_method: SalePaymentMethodEnum.default("EFECTIVO"),
  bank_name: z.string().trim().max(80).optional().nullable(),
  document_number: z.string().trim().max(50).optional().nullable(),
  cash_received: z.coerce.number().optional().nullable(),
  notes: z.string().trim().max(255).optional().nullable(),
  items: z.array(createSaleItemSchema).min(1, "Debe agregar al menos un producto a la venta"),
});

export const querySaleSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  search: z.string().optional().default(""),
  sale_type: SaleTypeEnum.optional(),
  payment_method: SalePaymentMethodEnum.optional(),
  status: z.enum(["COMPLETADA", "ANULADA"]).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  sortBy: z.enum(["sale_date", "total", "created_at"]).default("sale_date"),
  order: z.enum(["asc", "desc"]).default("desc"),
});
