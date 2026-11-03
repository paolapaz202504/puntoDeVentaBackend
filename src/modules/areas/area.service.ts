import { prisma } from "../../config/db.js";

export class AreaService {
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
      prisma.area.count({ where }),
      prisma.area.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: order },
        include: {
          _count: {
            select: {
              tables: true,
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
      items: items.map((a) => ({
        id: a.id,
        name: a.name,
        created_at: a.created_at,
        updated_at: a.updated_at,
        created_by: a.created_by,
        updated_by: a.updated_by,
        _count: {
          tables: a._count.tables,
        },
      })),
    };
  }

  static async getById(id: string) {
    const area = await prisma.area.findUnique({
      where: { id },
      include: {
        tables: {
          orderBy: { name: "asc" },
        },
        _count: {
          select: {
            tables: true,
          },
        },
      },
    });

    if (!area) {
      const error: any = new Error("Área no encontrada");
      error.statusCode = 404;
      throw error;
    }

    return area;
  }

  static async create(data: { name: string }, createdBy?: string) {
    const existing = await prisma.area.findUnique({
      where: { name: data.name },
    });

    if (existing) {
      const error: any = new Error("Ya existe un área registrada con este nombre");
      error.statusCode = 409;
      throw error;
    }

    return prisma.area.create({
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
      const duplicate = await prisma.area.findFirst({
        where: {
          name: data.name,
          NOT: { id },
        },
      });

      if (duplicate) {
        const error: any = new Error("Ya existe otra área registrada con este nombre");
        error.statusCode = 409;
        throw error;
      }
    }

    return prisma.area.update({
      where: { id },
      data: {
        ...data,
        updated_by: updatedBy || null,
      },
    });
  }

  static async delete(id: string) {
    const area = await this.getById(id);

    if (area._count.tables > 0) {
      const error: any = new Error(
        `No se puede eliminar el área "${area.name}" porque contiene ${area._count.tables} mesa(s) o espacio(s) registrado(s). Debe reasignar o eliminar los espacios primero.`
      );
      error.statusCode = 400;
      throw error;
    }

    return prisma.area.delete({
      where: { id },
    });
  }
}
