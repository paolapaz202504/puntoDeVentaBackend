import { z } from "zod";

const nameRegex = /^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑüÜ\s]+$/;
const userRegex = /^[a-zA-Z0-9_]+$/;
const pinRegex = /^\d{4}$/;
const emailDomainRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export const createUserSchema = z.object({
  name: z
    .string({ required_error: "El nombre es obligatorio" })
    .trim()
    .min(3, "El nombre debe contener al menos 3 caracteres")
    .max(75, "El nombre no puede exceder 75 caracteres")
    .regex(
      nameRegex,
      "El nombre solo acepta caracteres alfanuméricos, acentos y espacios, sin símbolos especiales"
    ),
  user: z
    .string({ required_error: "El nombre de usuario es obligatorio" })
    .trim()
    .min(3, "El usuario debe contener al menos 3 caracteres")
    .max(50, "El usuario no puede exceder 50 caracteres")
    .regex(
      userRegex,
      "El usuario solo acepta caracteres alfanuméricos y guion bajo, sin espacios ni símbolos especiales"
    ),
  email: z
    .string()
    .trim()
    .min(3, "El correo debe tener al menos 3 caracteres")
    .max(75, "El correo no puede exceder 75 caracteres")
    .regex(
      emailDomainRegex,
      "El correo debe tener un formato válido (ejemplo: usuario@correo.com)"
    )
    .optional()
    .or(z.literal("")),
  password: z
    .string({ required_error: "La contraseña es obligatoria" })
    .min(3, "La contraseña debe contener al menos 3 caracteres"),
  pin_code: z
    .string()
    .regex(pinRegex, "El PIN debe contener exactamente 4 dígitos numéricos (ej. 1234)")
    .optional()
    .or(z.literal("")),
  role_ids: z
    .array(z.string().uuid("Identificador de rol inválido"))
    .min(1, "Debe asignar al menos 1 rol obligatorio al usuario"),
  is_active: z.boolean().default(true),
});

export const updateUserSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "El nombre debe contener al menos 3 caracteres")
    .max(75, "El nombre no puede exceder 75 caracteres")
    .regex(
      nameRegex,
      "El nombre solo acepta caracteres alfanuméricos, acentos y espacios, sin símbolos especiales"
    )
    .optional(),
  user: z
    .string()
    .trim()
    .min(3, "El usuario debe contener al menos 3 caracteres")
    .max(50, "El usuario no puede exceder 50 caracteres")
    .regex(
      userRegex,
      "El usuario solo acepta caracteres alfanuméricos y guion bajo, sin espacios ni símbolos especiales"
    )
    .optional(),
  email: z
    .string()
    .trim()
    .min(3, "El correo debe tener al menos 3 caracteres")
    .max(75, "El correo no puede exceder 75 caracteres")
    .regex(
      emailDomainRegex,
      "El correo debe tener un formato válido (ejemplo: usuario@correo.com)"
    )
    .optional()
    .or(z.literal("")),
  password: z
    .string()
    .min(3, "La contraseña debe contener al menos 3 caracteres")
    .optional()
    .or(z.literal("")),
  pin_code: z
    .string()
    .regex(pinRegex, "El PIN debe contener exactamente 4 dígitos numéricos")
    .optional()
    .or(z.literal("")),
  role_ids: z
    .array(z.string().uuid("Identificador de rol inválido"))
    .min(1, "Debe asignar al menos 1 rol obligatorio al usuario")
    .optional(),
  is_active: z.boolean().optional(),
});

export const queryUserSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  search: z.string().optional().default(""),
  roleId: z.string().optional().default(""),
  isActive: z.enum(["true", "false", "all"]).default("all"),
  sortBy: z.enum(["name", "user", "created_at"]).default("name"),
  order: z.enum(["asc", "desc"]).default("asc"),
});
