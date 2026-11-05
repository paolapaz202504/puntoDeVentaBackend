import { z } from "zod";

export const ExpenseCategoryEnum = z.enum([
  "PERSONAL_PLANILLA",
  "ENERGIA_ELECTRICA",
  "AGUA_POTABLE",
  "GAS_PROPANO",
  "IMPUESTOS_SAT",
  "ALQUILER",
  "MANTENIMIENTO",
  "DESECHABLES_LIMPIEZA",
  "OTROS",
]);

export const PaymentMethodEnum = z.enum([
  "EFECTIVO",
  "CHEQUE",
  "DEPOSITO",
  "TRANSFERENCIA",
]);

export const createExpenseSchema = z
  .object({
    expense_date: z.string().optional(),
    category: ExpenseCategoryEnum,
    description: z
      .string({ required_error: "La descripción del gasto es obligatoria" })
      .trim()
      .min(3, "La descripción debe tener al menos 3 caracteres")
      .max(200, "La descripción no puede exceder 200 caracteres"),
    amount: z.coerce
      .number({ required_error: "El monto es obligatorio" })
      .positive("El monto debe ser mayor a 0"),
    payment_method: PaymentMethodEnum.default("EFECTIVO"),
    bank_name: z.string().trim().max(80).optional().nullable(),
    document_number: z.string().trim().max(50).optional().nullable(),
    document_date: z.string().optional().nullable(),
    notes: z.string().trim().max(255).optional().nullable(),
  })
  .refine(
    (data) => {
      if (data.payment_method !== "EFECTIVO") {
        return !!data.bank_name && !!data.document_number;
      }
      return true;
    },
    {
      message:
        "Para pagos bancarios (cheque, depósito o transferencia), el banco y el número de documento son obligatorios",
      path: ["bank_name"],
    }
  );

export const queryExpenseSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  search: z.string().optional().default(""),
  category: ExpenseCategoryEnum.optional(),
  payment_method: PaymentMethodEnum.optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  sortBy: z.enum(["expense_date", "amount", "created_at"]).default("expense_date"),
  order: z.enum(["asc", "desc"]).default("desc"),
});
