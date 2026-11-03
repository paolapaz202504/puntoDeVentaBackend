import { z } from "zod";

export const generateBackupSchema = z.object({
  custom_destination: z
    .string()
    .trim()
    .optional()
    .refine(
      (val) => {
        if (!val) return true;
        if (/[<>"|?*]/.test(val)) return false;
        const colons = (val.match(/:/g) || []).length;
        if (colons > 1 || (colons === 1 && !/^[a-zA-Z]:[\\/]/.test(val))) {
          return false;
        }
        return true;
      },
      {
        message: "La ruta o nombre de archivo de resguardo contiene caracteres inválidos",
      }
    ),
});

export const queryBackupLogSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  startDate: z.string().optional().default(""),
  endDate: z.string().optional().default(""),
  userId: z.string().optional().default(""),
});
