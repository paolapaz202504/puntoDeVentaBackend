import { prisma } from "../../config/db.js";
import { cache } from "../../services/cache.service.js";

export class ProductService {
  static async list(params: {
    page: number;
    limit: number;
    search: string;
    category_id?: string;
    brand_id?: string;
    supplier_id?: string;
    product_type?: string;
    presentation?: string;
    sortBy: "name" | "code" | "sale_price" | "current_stock" | "created_at" | "category" | "brand";
    order: "asc" | "desc";
  }) {
    const { page, limit, search, category_id, brand_id, supplier_id, product_type, presentation, sortBy, order } = params;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { code: { contains: search } },
        { brand: { name: { contains: search } } },
      ];
    }

    if (category_id && category_id.trim() !== "") {
      where.category_id = category_id;
    }

    if (brand_id && brand_id.trim() !== "") {
      where.brand_id = brand_id;
    }

    if (supplier_id && supplier_id.trim() !== "") {
      where.supplier_id = supplier_id;
    }

    if (product_type && product_type.trim() !== "") {
      where.product_type = product_type;
    }

    if (presentation && presentation.trim() !== "") {
      where.presentations = {
        some: {
          name: { contains: presentation.trim() },
        },
      };
    }

    let orderByClause: any = { [sortBy]: order };
    if (sortBy === "category") {
      orderByClause = {
        category: {
          name: order,
        },
      };
    } else if (sortBy === "brand") {
      orderByClause = {
        brand: {
          name: order,
        },
      };
    }

    const [total, items] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: orderByClause,
        include: {
          category: {
            select: { id: true, name: true },
          },
          brand: {
            select: { id: true, name: true },
          },
          base_unit: {
            select: { id: true, name: true, symbol: true },
          },
          supplier: {
            select: { id: true, name: true, category: true },
          },
          recipes_as_final: {
            include: {
              items: {
                include: {
                  ingredient: {
                    select: { id: true, name: true, code: true, current_stock: true, base_unit: true },
                  },
                },
              },
            },
          },
          presentations: {
            orderBy: { conversion_factor: "desc" },
          },
        },
      }),
    ]);

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      items: items.map((p) => ({
        id: p.id,
        code: p.code,
        name: p.name,
        brand_id: p.brand_id,
        brand: p.brand,
        category_id: p.category_id,
        category: p.category,
        base_unit_id: p.base_unit_id,
        base_unit: p.base_unit,
        supplier_id: p.supplier_id,
        supplier: p.supplier,
        recipes_as_final: p.recipes_as_final,
        product_type: p.product_type,
        sale_price: Number(p.sale_price),
        current_cost: Number(p.current_cost),
        current_stock: Number(p.current_stock),
        min_stock_alert: Number(p.min_stock_alert),
        image_url: p.image_url,
        is_active: p.is_active,
        presentations: p.presentations.map((pr) => ({
          id: pr.id,
          name: pr.name,
          conversion_factor: pr.conversion_factor,
          barcode: pr.barcode,
          default_cost: pr.default_cost ? Number(pr.default_cost) : null,
        })),
        created_at: p.created_at,
        updated_at: p.updated_at,
        created_by: p.created_by,
        updated_by: p.updated_by,
      })),
    };
  }

  static async getById(id: string) {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        brand: true,
        base_unit: true,
        supplier: true,
        recipes_as_final: {
          include: {
            items: {
              include: {
                ingredient: true,
              },
            },
          },
        },
        presentations: {
          orderBy: { conversion_factor: "desc" },
        },
      },
    });

    if (!product) {
      const error: any = new Error("Producto no encontrado");
      error.statusCode = 404;
      throw error;
    }

    return {
      ...product,
      sale_price: Number(product.sale_price),
      current_cost: Number(product.current_cost),
      current_stock: Number(product.current_stock),
      min_stock_alert: Number(product.min_stock_alert),
      presentations: product.presentations.map((pr) => ({
        ...pr,
        default_cost: pr.default_cost ? Number(pr.default_cost) : null,
      })),
    };
  }

  static async create(data: any, createdBy?: string) {
    // 1. Validar unicidad de código
    const existingCode = await prisma.product.findUnique({
      where: { code: data.code.toUpperCase() },
    });

    if (existingCode) {
      const error: any = new Error(`Ya existe un producto con el código "${data.code}"`);
      error.statusCode = 409;
      throw error;
    }

    // 2. Validar que categoría, marca y unidad de medida existan
    const [category, unit, brand] = await Promise.all([
      prisma.category.findUnique({ where: { id: data.category_id } }),
      prisma.measurementUnit.findUnique({ where: { id: data.base_unit_id } }),
      data.brand_id ? prisma.brand.findUnique({ where: { id: data.brand_id } }) : Promise.resolve(null),
    ]);

    if (!category) {
      const error: any = new Error("La categoría seleccionada no existe");
      error.statusCode = 404;
      throw error;
    }

    if (!unit) {
      const error: any = new Error("La unidad de medida seleccionada no existe");
      error.statusCode = 404;
      throw error;
    }

    if (data.brand_id && !brand) {
      const error: any = new Error("La marca seleccionada no existe");
      error.statusCode = 404;
      throw error;
    }

    // 3. Crear producto y presentaciones en transacción ACID
    const newProduct = await prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          code: data.code.toUpperCase(),
          name: data.name,
          brand_id: data.brand_id || null,
          category_id: data.category_id,
          base_unit_id: data.base_unit_id,
          supplier_id: data.supplier_id || null,
          product_type: data.product_type || "DIRECT_SALE",
          sale_price: data.sale_price,
          current_cost: data.current_cost || 0,
          current_stock: data.current_stock || 0,
          min_stock_alert: data.min_stock_alert || 5,
          image_url: data.image_url || null,
          is_active: data.is_active !== undefined ? data.is_active : true,
          created_by: createdBy || null,
          updated_by: createdBy || null,
        },
      });

      if (data.presentations && Array.isArray(data.presentations) && data.presentations.length > 0) {
        for (const pres of data.presentations) {
          await tx.productPurchasePresentation.create({
            data: {
              product_id: product.id,
              name: pres.name,
              conversion_factor: pres.conversion_factor,
              barcode: pres.barcode || null,
              default_cost: pres.default_cost || null,
              created_by: createdBy || null,
              updated_by: createdBy || null,
            },
          });
        }
      }

      return tx.product.findUnique({
        where: { id: product.id },
        include: {
          category: true,
          brand: true,
          base_unit: true,
          supplier: true,
          presentations: true,
        },
      });
    }, { maxWait: 10000, timeout: 30000 });

    // Invalidar reactivamente la caché de productos POS y reportes
    await cache.invalidatePosProducts();
    await cache.invalidateDashboard();

    return newProduct;
  }

  static async update(id: string, data: any, updatedBy?: string) {
    const product = await this.getById(id);

    if (data.code && data.code.toUpperCase() !== product.code) {
      const duplicate = await prisma.product.findFirst({
        where: {
          code: data.code.toUpperCase(),
          NOT: { id },
        },
      });

      if (duplicate) {
        const error: any = new Error(`Ya existe otro producto con el código "${data.code}"`);
        error.statusCode = 409;
        throw error;
      }
    }

    if (data.brand_id) {
      const brand = await prisma.brand.findUnique({ where: { id: data.brand_id } });
      if (!brand) {
        const error: any = new Error("La marca seleccionada no existe");
        error.statusCode = 404;
        throw error;
      }
    }

    const updatedProduct = await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id },
        data: {
          code: data.code ? data.code.toUpperCase() : undefined,
          name: data.name,
          brand_id: data.brand_id !== undefined ? (data.brand_id || null) : undefined,
          category_id: data.category_id,
          base_unit_id: data.base_unit_id,
          supplier_id: data.supplier_id !== undefined ? (data.supplier_id || null) : undefined,
          product_type: data.product_type,
          sale_price: data.sale_price,
          current_cost: data.current_cost,
          current_stock: data.current_stock,
          min_stock_alert: data.min_stock_alert,
          image_url: data.image_url !== undefined ? data.image_url : undefined,
          is_active: data.is_active !== undefined ? data.is_active : undefined,
          updated_by: updatedBy || null,
        },
      });

      // Si se envían presentaciones, actualizar sincronizando
      if (data.presentations && Array.isArray(data.presentations)) {
        await tx.productPurchasePresentation.deleteMany({
          where: { product_id: id },
        });

        for (const pres of data.presentations) {
          await tx.productPurchasePresentation.create({
            data: {
              product_id: id,
              name: pres.name,
              conversion_factor: pres.conversion_factor,
              barcode: pres.barcode || null,
              default_cost: pres.default_cost || null,
              created_by: updatedBy || null,
              updated_by: updatedBy || null,
            },
          });
        }
      }

      return tx.product.findUnique({
        where: { id },
        include: {
          category: true,
          brand: true,
          base_unit: true,
          presentations: true,
        },
      });
    }, { maxWait: 10000, timeout: 30000 });

    // Invalidar reactivamente la caché de productos POS y reportes
    await cache.invalidatePosProducts();
    await cache.invalidateDashboard();

    return updatedProduct;
  }

  static async delete(id: string) {
    await this.getById(id);

    const deleted = await prisma.product.delete({
      where: { id },
    });

    // Invalidar reactivamente la caché de productos POS y reportes
    await cache.invalidatePosProducts();
    await cache.invalidateDashboard();

    return deleted;
  }

  static async getDistinctPresentations() {
    const presentations = await prisma.productPurchasePresentation.findMany({
      select: { name: true },
      distinct: ["name"],
      orderBy: { name: "asc" },
    });
    return presentations.map((p) => p.name);
  }
}
