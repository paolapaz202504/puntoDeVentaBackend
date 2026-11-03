import { prisma } from "../../config/db.js";

export class TableService {
  static async list(params: {
    page: number;
    limit: number;
    search: string;
    area_id?: string;
    sortBy: "name" | "created_at";
    order: "asc" | "desc";
  }) {
    const { page, limit, search, area_id, sortBy, order } = params;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.name = {
        contains: search,
      };
    }

    if (area_id && area_id.trim() !== "") {
      where.area_id = area_id;
    }

    const [total, items] = await Promise.all([
      prisma.restaurantTable.count({ where }),
      prisma.restaurantTable.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: order },
        include: {
          area: {
            select: {
              id: true,
              name: true,
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
      items: items.map((t) => ({
        id: t.id,
        name: t.name,
        area_id: t.area_id,
        area: t.area,
        created_at: t.created_at,
        updated_at: t.updated_at,
        created_by: t.created_by,
        updated_by: t.updated_by,
      })),
    };
  }

  static async getById(id: string) {
    const table = await prisma.restaurantTable.findUnique({
      where: { id },
      include: {
        area: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!table) {
      const error: any = new Error("Mesa o espacio no encontrado");
      error.statusCode = 404;
      throw error;
    }

    return table;
  }

  static async create(
    data: { name: string; area_id: string },
    createdBy?: string
  ) {
    // 1. Validar que el área exista
    const area = await prisma.area.findUnique({
      where: { id: data.area_id },
    });

    if (!area) {
      const error: any = new Error("El área seleccionada no existe");
      error.statusCode = 404;
      throw error;
    }

    // 2. Validar duplicidad de nombre dentro de la misma área
    const existing = await prisma.restaurantTable.findFirst({
      where: {
        area_id: data.area_id,
        name: data.name,
      },
    });

    if (existing) {
      const error: any = new Error(
        `Ya existe una mesa o espacio llamado "${data.name}" en el área "${area.name}"`
      );
      error.statusCode = 409;
      throw error;
    }

    return prisma.restaurantTable.create({
      data: {
        name: data.name,
        area_id: data.area_id,
        created_by: createdBy || null,
        updated_by: createdBy || null,
      },
      include: {
        area: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  static async update(
    id: string,
    data: { name?: string; area_id?: string },
    updatedBy?: string
  ) {
    const table = await this.getById(id);

    const targetAreaId = data.area_id || table.area_id;
    const targetName = data.name || table.name;

    if (data.area_id && data.area_id !== table.area_id) {
      const area = await prisma.area.findUnique({
        where: { id: data.area_id },
      });
      if (!area) {
        const error: any = new Error("El área seleccionada no existe");
        error.statusCode = 404;
        throw error;
      }
    }

    // Validar duplicidad si cambió nombre o área
    if (data.name || data.area_id) {
      const duplicate = await prisma.restaurantTable.findFirst({
        where: {
          area_id: targetAreaId,
          name: targetName,
          NOT: { id },
        },
      });

      if (duplicate) {
        const error: any = new Error(
          `Ya existe otra mesa o espacio llamado "${targetName}" en esta área`
        );
        error.statusCode = 409;
        throw error;
      }
    }

    return prisma.restaurantTable.update({
      where: { id },
      data: {
        ...data,
        updated_by: updatedBy || null,
      },
      include: {
        area: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  static async delete(id: string) {
    await this.getById(id);

    return prisma.restaurantTable.delete({
      where: { id },
    });
  }
}
