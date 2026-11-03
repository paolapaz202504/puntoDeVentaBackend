import bcrypt from "bcrypt";
import { prisma } from "../../config/db.js";

export class UserService {
  static async list(params: {
    page: number;
    limit: number;
    search: string;
    roleId?: string;
    isActive: "true" | "false" | "all";
    sortBy: "name" | "user" | "created_at";
    order: "asc" | "desc";
  }) {
    const { page, limit, search, roleId, isActive, sortBy, order } = params;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { user: { contains: search } },
        { email: { contains: search } },
      ];
    }

    if (roleId) {
      where.user_roles = {
        some: {
          role_id: roleId,
        },
      };
    }

    if (isActive === "true") {
      where.is_active = true;
    } else if (isActive === "false") {
      where.is_active = false;
    }

    const [total, items] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: order },
        select: {
          id: true,
          name: true,
          user: true,
          email: true,
          pin_code: true,
          is_active: true,
          created_at: true,
          updated_at: true,
          created_by: true,
          updated_by: true,
          user_roles: {
            select: {
              role: {
                select: {
                  id: true,
                  name: true,
                },
              },
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
      items: items.map((u) => ({
        id: u.id,
        name: u.name,
        user: u.user,
        email: u.email,
        pin_code: u.pin_code,
        is_active: u.is_active,
        created_at: u.created_at,
        updated_at: u.updated_at,
        created_by: u.created_by,
        updated_by: u.updated_by,
        roles: u.user_roles.map((ur) => ur.role),
      })),
    };
  }

  static async getById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        user: true,
        email: true,
        pin_code: true,
        is_active: true,
        created_at: true,
        updated_at: true,
        created_by: true,
        updated_by: true,
        user_roles: {
          select: {
            role: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      const error: any = new Error("Usuario no encontrado");
      error.statusCode = 404;
      throw error;
    }

    return {
      id: user.id,
      name: user.name,
      user: user.user,
      email: user.email,
      pin_code: user.pin_code,
      is_active: user.is_active,
      created_at: user.created_at,
      updated_at: user.updated_at,
      created_by: user.created_by,
      updated_by: user.updated_by,
      roles: user.user_roles.map((ur) => ur.role),
    };
  }

  static async create(
    data: {
      name: string;
      user: string;
      email?: string;
      password: string;
      pin_code?: string;
      role_ids: string[];
      is_active?: boolean;
    },
    createdBy?: string
  ) {
    // 1. Validar nombre de usuario único
    const existingUser = await prisma.user.findUnique({
      where: { user: data.user },
    });
    if (existingUser) {
      const error: any = new Error("El nombre de usuario ya está registrado");
      error.statusCode = 409;
      throw error;
    }

    // 2. Validar correo si se proporciona
    if (data.email && data.email.trim() !== "") {
      const existingEmail = await prisma.user.findUnique({
        where: { email: data.email },
      });
      if (existingEmail) {
        const error: any = new Error("El correo electrónico ya está registrado");
        error.statusCode = 409;
        throw error;
      }
    }

    // 3. Validar que los roles existan
    const existingRoles = await prisma.role.findMany({
      where: { id: { in: data.role_ids } },
    });
    if (existingRoles.length !== data.role_ids.length) {
      const error: any = new Error("Uno o más roles seleccionados no existen");
      error.statusCode = 400;
      throw error;
    }

    // 4. Hashear contraseña con bcrypt
    const password_hash = await bcrypt.hash(data.password, 10);

    // 5. Crear usuario y asignaciones en transacción atómica
    return prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          name: data.name,
          user: data.user,
          email: data.email && data.email.trim() !== "" ? data.email : null,
          password_hash,
          pin_code: data.pin_code && data.pin_code.trim() !== "" ? data.pin_code : null,
          is_active: data.is_active ?? true,
          created_by: createdBy || null,
          updated_by: createdBy || null,
        },
      });

      await tx.userRole.createMany({
        data: data.role_ids.map((roleId) => ({
          user_id: newUser.id,
          role_id: roleId,
          created_by: createdBy || null,
          updated_by: createdBy || null,
        })),
      });

      return {
        id: newUser.id,
        name: newUser.name,
        user: newUser.user,
        email: newUser.email,
        pin_code: newUser.pin_code,
        is_active: newUser.is_active,
        roles: existingRoles.map((r) => ({ id: r.id, name: r.name })),
      };
    });
  }

  static async update(
    id: string,
    data: {
      name?: string;
      user?: string;
      email?: string;
      password?: string;
      pin_code?: string;
      role_ids?: string[];
      is_active?: boolean;
    },
    updatedBy?: string
  ) {
    await this.getById(id);

    // Validar nombre de usuario duplicado
    if (data.user) {
      const existing = await prisma.user.findFirst({
        where: { user: data.user, NOT: { id } },
      });
      if (existing) {
        const error: any = new Error("El nombre de usuario ya está en uso");
        error.statusCode = 409;
        throw error;
      }
    }

    // Validar email duplicado
    if (data.email && data.email.trim() !== "") {
      const existingEmail = await prisma.user.findFirst({
        where: { email: data.email, NOT: { id } },
      });
      if (existingEmail) {
        const error: any = new Error("El correo ya está en uso");
        error.statusCode = 409;
        throw error;
      }
    }

    // Validar que los roles existan si se especifican
    if (data.role_ids) {
      const existingRoles = await prisma.role.findMany({
        where: { id: { in: data.role_ids } },
      });
      if (existingRoles.length !== data.role_ids.length) {
        const error: any = new Error("Uno o más roles seleccionados no existen");
        error.statusCode = 400;
        throw error;
      }
    }

    const updateData: any = {
      updated_by: updatedBy || null,
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.user !== undefined) updateData.user = data.user;
    if (data.email !== undefined) {
      updateData.email = data.email && data.email.trim() !== "" ? data.email : null;
    }
    if (data.pin_code !== undefined) {
      updateData.pin_code = data.pin_code && data.pin_code.trim() !== "" ? data.pin_code : null;
    }
    if (data.is_active !== undefined) updateData.is_active = data.is_active;

    if (data.password && data.password.trim() !== "") {
      updateData.password_hash = await bcrypt.hash(data.password, 10);
    }

    return prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id },
        data: updateData,
      });

      if (data.role_ids && data.role_ids.length > 0) {
        await tx.userRole.deleteMany({
          where: { user_id: id },
        });

        await tx.userRole.createMany({
          data: data.role_ids.map((roleId) => ({
            user_id: id,
            role_id: roleId,
            created_by: updatedBy || null,
            updated_by: updatedBy || null,
          })),
        });
      }

      const freshUser = await tx.user.findUnique({
        where: { id },
        include: {
          user_roles: {
            include: { role: true },
          },
        },
      });

      return {
        id: freshUser!.id,
        name: freshUser!.name,
        user: freshUser!.user,
        email: freshUser!.email,
        pin_code: freshUser!.pin_code,
        is_active: freshUser!.is_active,
        roles: freshUser!.user_roles.map((ur) => ({ id: ur.role.id, name: ur.role.name })),
      };
    });
  }

  static async delete(id: string) {
    const user = await this.getById(id);

    if (user.user === "admin") {
      const error: any = new Error("No se puede eliminar el usuario administrador predeterminado");
      error.statusCode = 403;
      throw error;
    }

    return prisma.user.delete({
      where: { id },
    });
  }
}
