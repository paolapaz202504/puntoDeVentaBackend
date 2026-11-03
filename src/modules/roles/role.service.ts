import { prisma } from "../../config/db.js";

export class RoleService {
  static async list(params: {
    page: number;
    limit: number;
    search: string;
    sortBy: "name" | "created_at";
    order: "asc" | "desc";
  }) {
    const { page, limit, search, sortBy, order } = params;
    const skip = (page - 1) * limit;

    const where = search
      ? {
          name: {
            contains: search,
          },
        }
      : {};

    const [total, items] = await Promise.all([
      prisma.role.count({ where }),
      prisma.role.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: order },
        include: {
          _count: {
            select: {
              user_roles: true,
              role_permissions: true,
            },
          },
        },
      }),
    ]);

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      items: items.map((r) => ({
        ...r,
        _count: {
          users: r._count.user_roles,
          permissions: r._count.role_permissions,
        },
      })),
    };
  }

  static async getById(id: string) {
    const role = await prisma.role.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            user_roles: true,
            role_permissions: true,
          },
        },
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

    return {
      ...role,
      _count: {
        users: role._count.user_roles,
        permissions: role._count.role_permissions,
      },
    };
  }

  static async create(data: { name: string }, createdBy?: string) {
    const existing = await prisma.role.findFirst({
      where: { name: data.name },
    });

    if (existing) {
      const error: any = new Error("Ya existe un rol con este nombre");
      error.statusCode = 409;
      throw error;
    }

    return prisma.role.create({
      data: {
        name: data.name,
        created_by: createdBy || null,
        updated_by: createdBy || null,
      },
    });
  }

  static async update(id: string, data: { name?: string }, updatedBy?: string) {
    await this.getById(id);

    if (data.name) {
      const duplicate = await prisma.role.findFirst({
        where: {
          name: data.name,
          NOT: { id },
        },
      });

      if (duplicate) {
        const error: any = new Error("Ya existe otro rol con este nombre");
        error.statusCode = 409;
        throw error;
      }
    }

    return prisma.role.update({
      where: { id },
      data: {
        ...data,
        updated_by: updatedBy || null,
      },
    });
  }

  static async delete(id: string) {
    const role = await this.getById(id);

    if (role._count.users > 0) {
      const error: any = new Error(
        `No se puede eliminar el rol porque tiene ${role._count.users} usuario(s) asignado(s)`
      );
      error.statusCode = 400;
      throw error;
    }

    if (role.name === "Administrador") {
      const error: any = new Error("No se puede eliminar el rol predeterminado de Administrador");
      error.statusCode = 403;
      throw error;
    }

    return prisma.role.delete({
      where: { id },
    });
  }
}
