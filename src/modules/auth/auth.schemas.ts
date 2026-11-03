import { z } from "zod";

export const loginSchema = z.object({
  user: z
    .string({ required_error: "El usuario es obligatorio" })
    .trim()
    .min(1, "Ingrese su usuario"),
  password: z
    .string({ required_error: "La contraseña es obligatoria" })
    .min(1, "Ingrese su contraseña"),
});

export const updateProfileSchema = z.object({
  name: z.string().trim().min(3).max(75).optional(),
  email: z.string().trim().email().optional().or(z.literal("")),
  current_password: z.string().optional(),
  new_password: z.string().min(3).optional(),
  pin_code: z.string().regex(/^\d{4}$/, "El PIN debe tener 4 dígitos").optional().or(z.literal("")),
});
