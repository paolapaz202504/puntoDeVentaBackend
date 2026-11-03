import { prisma } from "../../config/db.js";

export class UnitService {
  static async list(params: {
    page: number;
    limit: number;
    search: string;
    sortBy: "name" | "symbol" | "created_at";
    order: "asc" | "desc";
  }) {
    const { page, limit, search, sortBy, order } = params;
    const skip = (page - 1) * limit;

    const where = search
      ? {
          OR: [
            { name: { contains: search } },
            { symbol: { contains: search } },
          ],
        }
      : {};

    const [total, items] = await Promise.all([
      prisma.measurementUnit.count({ where }),
      prisma.measurementUnit.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: order },
        include: {
          _count: {
            select: {
              products: true,
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
        symbol: u.symbol,
        created_at: u.created_at,
        updated_at: u.updated_at,
        created_by: u.created_by,
        updated_by: u.updated_by,
        _count: {
          products: u._count.products,
        },
      })),
    };
  }

  static async getById(id: string) {
    const unit = await prisma.measurementUnit.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },
    });

    if (!unit) {
      const error: any = new Error("Unidad de medida no encontrada");
      error.statusCode = 404;
      throw error;
    }

    return unit;
  }

  static async create(data: { name: string; symbol: string }, createdBy?: string) {
    const existing = await prisma.measurementUnit.findUnique({
      where: { symbol: data.symbol.toUpperCase() },
    });

    if (existing) {
      const error: any = new Error(`Ya existe una unidad de medida con el símbolo "${data.symbol}"`);
      error.statusCode = 409;
      throw error;
    }

    return prisma.measurementUnit.create({
      data: {
        name: data.name,
        symbol: data.symbol.toUpperCase(),
        created_by: createdBy || null,
        updated_by: createdBy || null,
      },
    });
  }

  static async update(
    id: string,
    data: { name?: string; symbol?: string },
    updatedBy?: string
  ) {
    await this.getById(id);

    if (data.symbol) {
      const duplicate = await prisma.measurementUnit.findFirst({
        where: {
          symbol: data.symbol.toUpperCase(),
          NOT: { id },
        },
      });

      if (duplicate) {
        const error: any = new Error(`Ya existe otra unidad con el símbolo "${data.symbol}"`);
        error.statusCode = 409;
        throw error;
      }
    }

    return prisma.measurementUnit.update({
      where: { id },
      data: {
        name: data.name,
        symbol: data.symbol ? data.symbol.toUpperCase() : undefined,
        updated_by: updatedBy || null,
      },
    });
  }

  static async delete(id: string) {
    const unit = await this.getById(id);

    if (unit._count.products > 0) {
      const error: any = new Error(
        `No se puede eliminar la unidad "${unit.name}" (${unit.symbol}) porque está asignada a ${unit._count.products} producto(s).`
      );
      error.statusCode = 400;
      throw error;
    }

    return prisma.measurementUnit.delete({
      where: { id },
    });
  }
}
