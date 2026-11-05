import { prisma } from "../../config/db.js";

export class CategoryService {
  static async list(params: {
    page: number;
    limit: number;
    search: string;
    show_in_pos?: boolean;
    sortBy: "name" | "created_at";
    order: "asc" | "desc";
  }) {
    const { page, limit, search, show_in_pos, sortBy, order } = params;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.name = { contains: search };
    }
    if (show_in_pos !== undefined) {
      where.show_in_pos = show_in_pos;
    }

    const [total, items] = await Promise.all([
      prisma.category.count({ where }),
      prisma.category.findMany({
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
      items: items.map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        show_in_pos: (c as any).show_in_pos ?? true,
        created_at: c.created_at,
        updated_at: c.updated_at,
        created_by: c.created_by,
        updated_by: c.updated_by,
        _count: {
          products: c._count.products,
        },
      })),
    };
  }

  static async getById(id: string) {
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },
    });

    if (!category) {
      const error: any = new Error("Categoría no encontrada");
      error.statusCode = 404;
      throw error;
    }

    return category;
  }

  static async create(
    data: { name: string; description?: string | null; show_in_pos?: boolean },
    createdBy?: string
  ) {
    const existing = await prisma.category.findUnique({
      where: { name: data.name },
    });

    if (existing) {
      const error: any = new Error("Ya existe una categoría con este nombre");
      error.statusCode = 409;
      throw error;
    }

    return prisma.category.create({
      data: {
        name: data.name,
        description: data.description || null,
        show_in_pos: data.show_in_pos !== undefined ? data.show_in_pos : true,
        created_by: createdBy || null,
        updated_by: createdBy || null,
      },
    });
  }

  static async update(
    id: string,
    data: { name?: string; description?: string | null; show_in_pos?: boolean },
    updatedBy?: string
  ) {
    await this.getById(id);

    if (data.name) {
      const duplicate = await prisma.category.findFirst({
        where: {
          name: data.name,
          NOT: { id },
        },
      });

      if (duplicate) {
        const error: any = new Error("Ya existe otra categoría con este nombre");
        error.statusCode = 409;
        throw error;
      }
    }

    return prisma.category.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description !== undefined ? data.description : undefined,
        show_in_pos: data.show_in_pos !== undefined ? data.show_in_pos : undefined,
        updated_by: updatedBy || null,
      },
    });
  }

  static async delete(id: string) {
    const category = await this.getById(id);

    if (category._count.products > 0) {
      const error: any = new Error(
        `No se puede eliminar la categoría "${category.name}" porque contiene ${category._count.products} producto(s) asignado(s).`
      );
      error.statusCode = 400;
      throw error;
    }

    return prisma.category.delete({
      where: { id },
    });
  }
}
