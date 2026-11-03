import { prisma } from "../../config/db.js";

export class BrandService {
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
      prisma.brand.count({ where }),
      prisma.brand.findMany({
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
      items: items.map((b) => ({
        id: b.id,
        name: b.name,
        description: b.description,
        created_at: b.created_at,
        updated_at: b.updated_at,
        created_by: b.created_by,
        updated_by: b.updated_by,
        _count: {
          products: b._count.products,
        },
      })),
    };
  }

  static async getById(id: string) {
    const brand = await prisma.brand.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },
    });

    if (!brand) {
      const error: any = new Error("Marca no encontrada");
      error.statusCode = 404;
      throw error;
    }

    return brand;
  }

  static async create(data: { name: string; description?: string | null }, createdBy?: string) {
    const existing = await prisma.brand.findUnique({
      where: { name: data.name },
    });

    if (existing) {
      const error: any = new Error(`Ya existe una marca con el nombre "${data.name}"`);
      error.statusCode = 409;
      throw error;
    }

    return prisma.brand.create({
      data: {
        name: data.name,
        description: data.description || null,
        created_by: createdBy || null,
        updated_by: createdBy || null,
      },
    });
  }

  static async update(
    id: string,
    data: { name?: string; description?: string | null },
    updatedBy?: string
  ) {
    await this.getById(id);

    if (data.name) {
      const duplicate = await prisma.brand.findFirst({
        where: {
          name: data.name,
          NOT: { id },
        },
      });

      if (duplicate) {
        const error: any = new Error(`Ya existe otra marca con el nombre "${data.name}"`);
        error.statusCode = 409;
        throw error;
      }
    }

    return prisma.brand.update({
      where: { id },
      data: {
        ...data,
        updated_by: updatedBy || null,
      },
    });
  }

  static async delete(id: string) {
    const brand = await this.getById(id);

    if (brand._count.products > 0) {
      const error: any = new Error(
        `No se puede eliminar la marca "${brand.name}" porque contiene ${brand._count.products} producto(s) asignado(s).`
      );
      error.statusCode = 400;
      throw error;
    }

    return prisma.brand.delete({
      where: { id },
    });
  }
}
