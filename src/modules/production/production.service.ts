import { prisma } from "../../config/db.js";

export class ProductionService {
  static async listBatches(params: {
    page: number;
    limit: number;
    product_id?: string;
  }) {
    const { page, limit, product_id } = params;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (product_id && product_id.trim() !== "") {
      where.product_id = product_id;
    }

    const [total, items] = await Promise.all([
      prisma.productionBatch.count({ where }),
      prisma.productionBatch.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
        include: {
          product: {
            select: { id: true, code: true, name: true, base_unit: true, current_stock: true },
          },
          recipe: {
            select: { id: true, name: true, recipe_type: true },
          },
          consumed_items: {
            include: {
              ingredient: {
                select: { id: true, code: true, name: true, base_unit: true },
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
      items: items.map((b) => ({
        id: b.id,
        recipe_id: b.recipe_id,
        recipe_name: b.recipe.name,
        product_id: b.product_id,
        product_name: b.product.name,
        container_capacity_liters: b.container_capacity_liters ? Number(b.container_capacity_liters) : null,
        produced_quantity: Number(b.produced_quantity),
        unit: b.product.base_unit.symbol,
        total_cost: Number(b.total_cost),
        notes: b.notes,
        created_at: b.created_at,
        created_by: b.created_by,
        consumed_items: b.consumed_items.map((it) => ({
          id: it.id,
          ingredient_name: it.ingredient.name,
          quantity_consumed: Number(it.quantity_consumed),
          unit: it.ingredient.base_unit.symbol,
          unit_cost_applied: Number(it.unit_cost_applied),
          total_cost: Number(it.total_cost),
        })),
      })),
    };
  }

  static async produceBatch(data: {
    recipe_id: string;
    container_capacity_liters?: number | null;
    multiplier?: number;
    notes?: string | null;
    createdBy?: string;
  }) {
    const { recipe_id, container_capacity_liters, notes, createdBy } = data;

    // 1. Obtener la receta con sus ingredientes
    const recipe = await prisma.recipe.findUnique({
      where: { id: recipe_id },
      include: {
        product: { include: { base_unit: true } },
        items: {
          include: {
            ingredient: { include: { base_unit: true } },
          },
        },
      },
    });

    if (!recipe) {
      const error: any = new Error("Receta no encontrada");
      error.statusCode = 404;
      throw error;
    }

    if (!recipe.is_active) {
      const error: any = new Error(`La receta "${recipe.name}" se encuentra inactiva`);
      error.statusCode = 400;
      throw error;
    }

    // 2. Determinar el multiplicador efectivo
    let effectiveMultiplier = data.multiplier || 1;

    if (recipe.recipe_type === "BATCH_SCALABLE" && container_capacity_liters) {
      // Si la receta base es por 1,000 ML (1L) y la cubeta es de 5L, multiplicador = 5
      const baseLiters = Number(recipe.base_yield) / 1000;
      effectiveMultiplier = container_capacity_liters / (baseLiters > 0 ? baseLiters : 1);
    }

    const producedQuantity = Number(recipe.base_yield) * effectiveMultiplier;

    // 3. Ejecutar transacción ACID de producción
    return prisma.$transaction(async (tx) => {
      let totalBatchCost = 0;
      const consumedItemsRecords: Array<{
        ingredient_id: string;
        quantity_consumed: number;
        unit_cost_applied: number;
        total_cost: number;
      }> = [];

      // A. Descontar ingredientes del inventario
      for (const item of recipe.items) {
        const qtyToConsume = Number(item.quantity) * effectiveMultiplier;
        const unitCost = Number(item.ingredient.current_cost);
        const itemCost = qtyToConsume * unitCost;
        totalBatchCost += itemCost;

        await tx.product.update({
          where: { id: item.ingredient_id },
          data: {
            current_stock: {
              decrement: qtyToConsume,
            },
            updated_by: createdBy || "SYSTEM_PRODUCTION",
          },
        });

        consumedItemsRecords.push({
          ingredient_id: item.ingredient_id,
          quantity_consumed: qtyToConsume,
          unit_cost_applied: unitCost,
          total_cost: itemCost,
        });
      }

      // B. Incrementar el stock del producto elaborado
      const updatedProduct = await tx.product.update({
        where: { id: recipe.product_id },
        data: {
          current_stock: {
            increment: producedQuantity,
          },
          current_cost: producedQuantity > 0 ? totalBatchCost / producedQuantity : undefined,
          updated_by: createdBy || "SYSTEM_PRODUCTION",
        },
        include: { base_unit: true },
      });

      // C. Registrar auditoría de la tanda
      const batch = await tx.productionBatch.create({
        data: {
          recipe_id: recipe.id,
          product_id: recipe.product_id,
          container_capacity_liters: container_capacity_liters ? container_capacity_liters : null,
          produced_quantity: producedQuantity,
          total_cost: totalBatchCost,
          notes: notes || (container_capacity_liters ? `Cubeta de ${container_capacity_liters} Litros` : `Tanda x${effectiveMultiplier}`),
          created_by: createdBy || "USER",
          updated_by: createdBy || "USER",
        },
      });

      for (const c of consumedItemsRecords) {
        await tx.productionBatchItem.create({
          data: {
            batch_id: batch.id,
            ingredient_id: c.ingredient_id,
            quantity_consumed: c.quantity_consumed,
            unit_cost_applied: c.unit_cost_applied,
            total_cost: c.total_cost,
            created_by: createdBy || "USER",
            updated_by: createdBy || "USER",
          },
        });
      }

      return {
        batch_id: batch.id,
        product_id: updatedProduct.id,
        product_name: updatedProduct.name,
        produced_quantity: producedQuantity,
        unit: updatedProduct.base_unit.symbol,
        new_stock: Number(updatedProduct.current_stock),
        total_batch_cost: totalBatchCost,
        unit_cost: producedQuantity > 0 ? totalBatchCost / producedQuantity : 0,
        consumed_ingredients_count: consumedItemsRecords.length,
      };
    });
  }
}
