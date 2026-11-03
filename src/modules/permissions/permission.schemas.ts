import { z } from "zod";

export const queryPermissionSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(50),
  search: z.string().optional().default(""),
  module: z.string().optional().default(""),
});

export const assignRolePermissionsSchema = z.object({
  permission_ids: z.array(z.string().uuid("Identificador de permiso inválido")),
});
