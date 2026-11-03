import { z } from "zod";

export const updateSettingsSchema = z.object({
  company_name: z
    .string({ required_error: "El nombre de la empresa es obligatorio" })
    .trim()
    .min(2, "El nombre de la empresa debe tener al menos 2 caracteres")
    .max(120, "El nombre no puede exceder 120 caracteres"),
  tax_id: z.string().trim().max(50).optional().or(z.literal("")),
  phone: z.string().trim().max(50).optional().or(z.literal("")),
  email: z.string().trim().email("Formato de correo inválido").optional().or(z.literal("")),
  address: z.string().trim().max(255).optional().or(z.literal("")),
  currency_symbol: z.string().trim().min(1).max(10).default("$"),
});
