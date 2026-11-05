import { prisma } from "../../config/db.js";

export class SupplierService {
  static async list(params: {
    page: number;
    limit: number;
    search: string;
    category?: string;
    sortBy: "name" | "category" | "created_at";
    order: "asc" | "desc";
  }) {
    const { page, limit, search, category, sortBy, order } = params;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { contact_name: { contains: search } },
        { phone: { contains: search } },
      ];
    }

    if (category && category.trim() !== "") {
      where.category = category;
    }

    const [total, items] = await Promise.all([
      prisma.supplier.count({ where }),
      prisma.supplier.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: order },
        include: {
          _count: {
            select: { products: true },
          },
        },
      }),
    ]);

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      items: items.map((s) => ({
        id: s.id,
        name: s.name,
        contact_name: s.contact_name,
        phone: s.phone,
        email: s.email,
        address: s.address,
        category: s.category,
        is_active: s.is_active,
        products_count: s._count.products,
        created_at: s.created_at,
        updated_at: s.updated_at,
        created_by: s.created_by,
        updated_by: s.updated_by,
      })),
    };
  }

  static async getById(id: string) {
    const supplier = await prisma.supplier.findUnique({
      where: { id },
      include: {
        products: {
          select: {
            id: true,
            code: true,
            name: true,
            product_type: true,
            current_cost: true,
            current_stock: true,
          },
        },
      },
    });

    if (!supplier) {
      const error: any = new Error("Proveedor no encontrado");
      error.statusCode = 404;
      throw error;
    }

    return supplier;
  }

  static async create(data: any, createdBy?: string) {
    const existing = await prisma.supplier.findUnique({
      where: { name: data.name },
    });

    if (existing) {
      const error: any = new Error(`Ya existe un proveedor registrado con el nombre "${data.name}"`);
      error.statusCode = 409;
      throw error;
    }

    return prisma.supplier.create({
      data: {
        name: data.name,
        contact_name: data.contact_name || null,
        phone: data.phone || null,
        email: data.email || null,
        address: data.address || null,
        category: data.category || "GENERAL",
        is_active: data.is_active !== undefined ? data.is_active : true,
        created_by: createdBy || null,
        updated_by: createdBy || null,
      },
    });
  }

  static async update(id: string, data: any, updatedBy?: string) {
    const supplier = await this.getById(id);

    if (data.name && data.name !== supplier.name) {
      const duplicate = await prisma.supplier.findFirst({
        where: {
          name: data.name,
          NOT: { id },
        },
      });

      if (duplicate) {
        const error: any = new Error(`Ya existe otro proveedor con el nombre "${data.name}"`);
        error.statusCode = 409;
        throw error;
      }
    }

    return prisma.supplier.update({
      where: { id },
      data: {
        name: data.name,
        contact_name: data.contact_name !== undefined ? (data.contact_name || null) : undefined,
        phone: data.phone !== undefined ? (data.phone || null) : undefined,
        email: data.email !== undefined ? (data.email || null) : undefined,
        address: data.address !== undefined ? (data.address || null) : undefined,
        category: data.category,
        is_active: data.is_active !== undefined ? data.is_active : undefined,
        updated_by: updatedBy || null,
      },
    });
  }

  static async delete(id: string) {
    const supplier = await this.getById(id);

    const productsCount = await prisma.product.count({
      where: { supplier_id: id },
    });

    if (productsCount > 0) {
      const error: any = new Error(
        `No se puede eliminar el proveedor "${supplier.name}" porque tiene ${productsCount} productos vinculados.`
      );
      error.statusCode = 400;
      throw error;
    }

    return prisma.supplier.delete({
      where: { id },
    });
  }
}
