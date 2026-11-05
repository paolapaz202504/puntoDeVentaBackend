import { prisma } from "../../config/db.js";

export class RecipeService {
  static async list(params: {
    page: number;
    limit: number;
    search: string;
    recipe_type?: string;
    product_id?: string;
    sortBy?: "name" | "recipe_type" | "base_yield" | "created_at";
    order?: "asc" | "desc";
  }) {
    const {
      page,
      limit,
      search,
      recipe_type,
      product_id,
      sortBy = "name",
      order = "asc",
    } = params;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { product: { name: { contains: search } } },
      ];
    }

    if (recipe_type && recipe_type.trim() !== "") {
      where.recipe_type = recipe_type;
    }

    if (product_id && product_id.trim() !== "") {
      where.product_id = product_id;
    }

    const orderBy: any = {};
    orderBy[sortBy] = order;

    const [total, items] = await Promise.all([
      prisma.recipe.count({ where }),
      prisma.recipe.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          product: {
            select: {
              id: true,
              code: true,
              name: true,
              product_type: true,
              current_stock: true,
              base_unit: true,
            },
          },
          items: {
            include: {
              ingredient: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                  product_type: true,
                  current_stock: true,
                  current_cost: true,
                  base_unit: true,
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
      items: items.map((r) => ({
        id: r.id,
        product_id: r.product_id,
        product: r.product,
        name: r.name,
        recipe_type: r.recipe_type,
        base_yield: Number(r.base_yield),
        yield_unit: r.yield_unit,
        instructions: r.instructions,
        is_active: r.is_active,
        items: r.items.map((it) => ({
          id: it.id,
          ingredient_id: it.ingredient_id,
          ingredient: it.ingredient,
          quantity: Number(it.quantity),
          unit: it.unit,
        })),
        created_at: r.created_at,
        updated_at: r.updated_at,
      })),
    };
  }

  static async getById(id: string) {
    const recipe = await prisma.recipe.findUnique({
      where: { id },
      include: {
        product: {
          include: { base_unit: true },
        },
        items: {
          include: {
            ingredient: {
              include: { base_unit: true },
            },
          },
        },
      },
    });

    if (!recipe) {
      const error: any = new Error("Receta no encontrada");
      error.statusCode = 404;
      throw error;
    }

    return {
      ...recipe,
      base_yield: Number(recipe.base_yield),
      items: recipe.items.map((it) => ({
        ...it,
        quantity: Number(it.quantity),
      })),
    };
  }

  static async create(data: any, createdBy?: string) {
    // Validar producto
    const product = await prisma.product.findUnique({
      where: { id: data.product_id },
    });

    if (!product) {
      const error: any = new Error("El producto asignado a la receta no existe");
      error.statusCode = 404;
      throw error;
    }

    return prisma.$transaction(async (tx) => {
      const recipe = await tx.recipe.create({
        data: {
          product_id: data.product_id,
          name: data.name,
          recipe_type: data.recipe_type || "BATCH_SCALABLE",
          base_yield: data.base_yield || 1000,
          yield_unit: data.yield_unit || "ML",
          instructions: data.instructions || null,
          is_active: data.is_active !== undefined ? data.is_active : true,
          created_by: createdBy || null,
          updated_by: createdBy || null,
        },
      });

      for (const item of data.items) {
        await tx.recipeItem.create({
          data: {
            recipe_id: recipe.id,
            ingredient_id: item.ingredient_id,
            quantity: item.quantity,
            unit: item.unit,
            created_by: createdBy || null,
            updated_by: createdBy || null,
          },
        });
      }

      return tx.recipe.findUnique({
        where: { id: recipe.id },
        include: {
          product: true,
          items: {
            include: { ingredient: true },
          },
        },
      });
    }, { maxWait: 10000, timeout: 30000 });
  }

  static async update(id: string, data: any, updatedBy?: string) {
    await this.getById(id);

    return prisma.$transaction(async (tx) => {
      await tx.recipe.update({
        where: { id },
        data: {
          name: data.name,
          recipe_type: data.recipe_type,
          base_yield: data.base_yield,
          yield_unit: data.yield_unit,
          instructions: data.instructions !== undefined ? data.instructions : undefined,
          is_active: data.is_active !== undefined ? data.is_active : undefined,
          updated_by: updatedBy || null,
        },
      });

      if (data.items && Array.isArray(data.items)) {
        await tx.recipeItem.deleteMany({
          where: { recipe_id: id },
        });

        for (const item of data.items) {
          await tx.recipeItem.create({
            data: {
              recipe_id: id,
              ingredient_id: item.ingredient_id,
              quantity: item.quantity,
              unit: item.unit,
              created_by: updatedBy || null,
              updated_by: updatedBy || null,
            },
          });
        }
      }

      return tx.recipe.findUnique({
        where: { id },
        include: {
          product: true,
          items: {
            include: { ingredient: true },
          },
        },
      });
    }, { maxWait: 10000, timeout: 30000 });
  }

  static async delete(id: string) {
    await this.getById(id);

    // Validar si tiene registros de producción o elaboración asociados
    const batchesCount = await prisma.productionBatch.count({
      where: { recipe_id: id },
    });

    if (batchesCount > 0) {
      const error: any = new Error(
        `No se puede eliminar la receta porque ya cuenta con ${batchesCount} registro(s) de producción o elaboración en cocina.`
      );
      error.statusCode = 400;
      throw error;
    }

    return prisma.$transaction(async (tx) => {
      // Eliminar ingredientes asociados a la receta
      await tx.recipeItem.deleteMany({
        where: { recipe_id: id },
      });

      return tx.recipe.delete({
        where: { id },
      });
    }, { maxWait: 10000, timeout: 30000 });
  }
}
