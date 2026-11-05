import { z } from "zod";

export const stockEntryItemSchema = z.object({
  product_id: z.string({ required_error: "El producto es obligatorio" }).uuid("ID de producto inválido"),
  presentation_name: z.string().trim().max(60).optional().nullable(),
  quantity: z.coerce.number().positive("La cantidad debe ser mayor a 0"),
  conversion_factor: z.coerce.number().int().positive().default(1),
  unit_cost: z.coerce.number().min(0, "El costo unitario no puede ser negativo"),
});

export const initialPaymentSchema = z.object({
  payment_method: z.enum(["EFECTIVO", "CHEQUE", "DEPOSITO", "TRANSFERENCIA"]).default("EFECTIVO"),
  bank_name: z.string().trim().max(80).optional().nullable(),
  document_number: z.string().trim().max(50).optional().nullable(),
  document_date: z.string().optional().nullable(),
  notes: z.string().trim().max(255).optional().nullable(),
});

export const createStockEntrySchema = z
  .object({
    supplier_id: z.string().uuid("ID de proveedor inválido").optional().nullable(),
    entry_type: z.enum(["COMPRA", "DONACION", "AJUSTE"]).default("COMPRA"),
    entry_date: z.string().optional(),
    invoice_number: z.string().trim().max(50).optional().nullable(),
    payment_type: z.enum(["CONTADO", "CREDITO", "NO_APLICA"]).default("CONTADO"),
    due_date: z.string().optional().nullable(),
    notes: z.string().trim().optional().nullable(),
    items: z.array(stockEntryItemSchema).min(1, "Debe ingresar al menos un producto"),
    initial_payment: initialPaymentSchema.optional().nullable(),
  })
  .superRefine((data, ctx) => {
    // Si es COMPRA al contado, validar datos bancarios si no es efectivo
    if (data.entry_type === "COMPRA" && data.payment_type === "CONTADO") {
      const payment = data.initial_payment;
      if (payment && payment.payment_method !== "EFECTIVO") {
        if (!payment.bank_name || payment.bank_name.trim() === "") {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Debe especificar el banco para pagos con cheque, depósito o transferencia",
            path: ["initial_payment", "bank_name"],
          });
        }
        if (!payment.document_number || payment.document_number.trim() === "") {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Debe indicar el número de comprobante, cheque o transferencia",
            path: ["initial_payment", "document_number"],
          });
        }
      }
    }
  });

export const addPaymentSchema = z
  .object({
    amount: z.coerce.number().positive("El monto a abonar debe ser mayor a 0"),
    payment_method: z.enum(["EFECTIVO", "CHEQUE", "DEPOSITO", "TRANSFERENCIA"]).default("EFECTIVO"),
    bank_name: z.string().trim().max(80).optional().nullable(),
    document_number: z.string().trim().max(50).optional().nullable(),
    document_date: z.string().optional().nullable(),
    notes: z.string().trim().max(255).optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.payment_method !== "EFECTIVO") {
      if (!data.bank_name || data.bank_name.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Debe especificar el banco para abonos con cheque, depósito o transferencia",
          path: ["bank_name"],
        });
      }
      if (!data.document_number || data.document_number.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Debe indicar el número de comprobante, cheque o transferencia",
          path: ["document_number"],
        });
      }
    }
  });

export const queryStockEntrySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  search: z.string().optional().default(""),
  supplier_id: z.string().optional().default(""),
  entry_type: z.string().optional().default(""),
  payment_status: z.string().optional().default(""),
  sortBy: z.enum(["entry_date", "entry_number", "total_cost", "created_at"]).default("entry_date"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export type CreateStockEntryInput = z.infer<typeof createStockEntrySchema>;
export type AddPaymentInput = z.infer<typeof addPaymentSchema>;
export type QueryStockEntryInput = z.infer<typeof queryStockEntrySchema>;
