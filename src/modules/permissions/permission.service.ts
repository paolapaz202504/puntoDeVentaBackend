import { prisma } from "../../config/db.js";

export class PermissionService {
  static async list(params: { search?: string; module?: string }) {
    const where: any = {};

    if (params.search) {
      where.OR = [
        { name: { contains: params.search } },
        { slug: { contains: params.search } },
        { description: { contains: params.search } },
      ];
    }

    if (params.module) {
      where.module = params.module;
    }

    const items = await prisma.permission.findMany({
      where,
      orderBy: [{ module: "asc" }, { name: "asc" }],
    });

    // Agrupar por módulo
    const grouped = items.reduce((acc: Record<string, typeof items>, item) => {
      if (!acc[item.module]) {
        acc[item.module] = [];
      }
      acc[item.module].push(item);
      return acc;
    }, {});

    return {
      total: items.length,
      items,
      grouped,
    };
  }

  static async getRolePermissions(roleId: string) {
    const role = await prisma.role.findUnique({
      where: { id: roleId },
      include: {
        role_permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!role) {
      const error: any = new Error("Rol no encontrado");
      error.statusCode = 404;
      throw error;
    }

    const permissionIds = role.role_permissions.map((rp) => rp.permission_id);
    const permissions = role.role_permissions.map((rp) => rp.permission);

    return {
      roleId: role.id,
      roleName: role.name,
      permissionIds,
      permissions,
    };
  }

  static async setRolePermissions(
    roleId: string,
    permissionIds: string[],
    updatedBy?: string
  ) {
    const role = await prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      const error: any = new Error("Rol no encontrado");
      error.statusCode = 404;
      throw error;
    }

    // Transacción atómica ACID
    await prisma.$transaction(async (tx) => {
      // 1. Eliminar asignaciones actuales
      await tx.rolePermission.deleteMany({
        where: { role_id: roleId },
      });

      // 2. Insertar nuevas asignaciones con campos de auditoría
      if (permissionIds.length > 0) {
        await tx.rolePermission.createMany({
          data: permissionIds.map((pid) => ({
            role_id: roleId,
            permission_id: pid,
            created_by: updatedBy || null,
            updated_by: updatedBy || null,
          })),
        });
      }

      // 3. Registrar actualización en el rol
      await tx.role.update({
        where: { id: roleId },
        data: { updated_by: updatedBy || null },
      });
    }, { maxWait: 10000, timeout: 30000 });

    return this.getRolePermissions(roleId);
  }
}
