import { Prisma } from "@prisma/client";
import { prisma } from "../../config/db.js";

export class SaleService {
  private static async generateSaleNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `VTA-${year}-`;

    const lastSale = await prisma.sale.findFirst({
      where: {
        sale_number: {
          startsWith: prefix,
        },
      },
      orderBy: {
        sale_number: "desc",
      },
    });

    if (!lastSale) {
      return `${prefix}0001`;
    }

    const lastCorrelative = parseInt(lastSale.sale_number.replace(prefix, ""), 10);
    const nextCorrelative = (lastCorrelative + 1).toString().padStart(4, "0");
    return `${prefix}${nextCorrelative}`;
  }

  static async getPosProducts(search?: string, categoryId?: string) {
    const where: Prisma.ProductWhereInput = {
      is_active: true,
      product_type: {
        in: ["DIRECT_SALE", "MANUFACTURED", "ON_DEMAND"],
      },
      category: {
        show_in_pos: true,
      },
    };

    if (categoryId) {
      where.category_id = categoryId;
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { code: { contains: search } },
      ];
    }

    const products = await prisma.product.findMany({
      where,
      orderBy: { name: "asc" },
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
      },
    });

    return products.map((p) => ({
      ...p,
      sale_price: Number(p.sale_price),
      current_cost: Number(p.current_cost),
      current_stock: Number(p.current_stock),
      min_stock_alert: Number(p.min_stock_alert),
    }));
  }

  static async list(params: {
    page: number;
    limit: number;
    search?: string;
    sale_type?: string;
    payment_method?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    sortBy: "sale_date" | "total" | "created_at";
    order: "asc" | "desc";
  }) {
    const { page, limit, search, sale_type, payment_method, status, startDate, endDate, sortBy, order } =
      params;
    const skip = (page - 1) * limit;

    const where: Prisma.SaleWhereInput = {};

    if (search) {
      where.OR = [
        { sale_number: { contains: search } },
        { customer_name: { contains: search } },
        { document_number: { contains: search } },
        { table: { name: { contains: search } } },
      ];
    }

    if (sale_type) {
      where.sale_type = sale_type;
    }

    if (payment_method) {
      where.payment_method = payment_method;
    }

    if (status) {
      where.status = status;
    }

    if (startDate || endDate) {
      where.sale_date = {};
      if (startDate) {
        where.sale_date.gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.sale_date.lte = end;
      }
    }

    const [total, items, aggregateSum] = await Promise.all([
      prisma.sale.count({ where }),
      prisma.sale.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: order },
        include: {
          table: {
            select: { id: true, name: true },
          },
          items: true,
        },
      }),
      prisma.sale.aggregate({
        where: { ...where, status: "COMPLETADA" },
        _sum: {
          total: true,
        },
      }),
    ]);

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      totalSalesAmount: aggregateSum._sum.total ? Number(aggregateSum._sum.total) : 0,
      items: items.map((sale) => ({
        ...sale,
        subtotal: Number(sale.subtotal),
        total: Number(sale.total),
        cash_received: sale.cash_received ? Number(sale.cash_received) : null,
        change_returned: sale.change_returned ? Number(sale.change_returned) : null,
        items: sale.items.map((i) => ({
          ...i,
          quantity: Number(i.quantity),
          unit_price: Number(i.unit_price),
          subtotal: Number(i.subtotal),
          unit_cost: Number(i.unit_cost),
        })),
      })),
    };
  }

  static async getById(id: string) {
    const sale = await prisma.sale.findUnique({
      where: { id },
      include: {
        table: {
          select: { id: true, name: true, area: { select: { id: true, name: true } } },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                code: true,
                name: true,
                base_unit: { select: { symbol: true } },
              },
            },
          },
        },
      },
    });

    if (!sale) {
      const error: any = new Error("Venta no encontrada");
      error.statusCode = 404;
      throw error;
    }

    return {
      ...sale,
      subtotal: Number(sale.subtotal),
      total: Number(sale.total),
      cash_received: sale.cash_received ? Number(sale.cash_received) : null,
      change_returned: sale.change_returned ? Number(sale.change_returned) : null,
      items: sale.items.map((i) => ({
        ...i,
        quantity: Number(i.quantity),
        unit_price: Number(i.unit_price),
        subtotal: Number(i.subtotal),
        unit_cost: Number(i.unit_cost),
      })),
    };
  }

  static async create(
    data: {
      customer_name?: string;
      sale_type?: string;
      table_id?: string | null;
      payment_method?: string;
      bank_name?: string | null;
      document_number?: string | null;
      cash_received?: number | null;
      notes?: string | null;
      items: Array<{
        product_id: string;
        quantity: number;
        unit_price: number;
      }>;
    },
    userId?: string
  ) {
    return prisma.$transaction(async (tx) => {
      const saleNumber = await this.generateSaleNumber();

      let calculatedSubtotal = 0;
      const itemsToCreate: Array<{
        product_id: string;
        product_name: string;
        quantity: Prisma.Decimal;
        unit_price: Prisma.Decimal;
        subtotal: Prisma.Decimal;
        unit_cost: Prisma.Decimal;
        created_by: string | null;
        updated_by: string | null;
      }> = [];

      for (const item of data.items) {
        const product = await tx.product.findUnique({
          where: { id: item.product_id },
        });

        if (!product) {
          const error: any = new Error(`Producto con ID ${item.product_id} no existe`);
          error.statusCode = 400;
          throw error;
        }

        if (!product.is_active) {
          const error: any = new Error(`El producto "${product.name}" se encuentra inactivo`);
          error.statusCode = 400;
          throw error;
        }

        const itemSubtotal = item.quantity * item.unit_price;
        calculatedSubtotal += itemSubtotal;

        itemsToCreate.push({
          product_id: product.id,
          product_name: product.name,
          quantity: new Prisma.Decimal(item.quantity),
          unit_price: new Prisma.Decimal(item.unit_price),
          subtotal: new Prisma.Decimal(itemSubtotal),
          unit_cost: product.current_cost,
          created_by: userId || null,
          updated_by: userId || null,
        });

        // Descontar inventario para productos que controlan stock
        const currentStock = Number(product.current_stock || 0);
        const newStock = Math.max(0, currentStock - item.quantity);

        await tx.product.update({
          where: { id: product.id },
          data: {
            current_stock: new Prisma.Decimal(newStock),
            updated_by: userId,
          },
        });
      }

      const total = calculatedSubtotal;
      let changeReturned: number | null = null;
      if (data.payment_method === "EFECTIVO" && data.cash_received != null) {
        changeReturned = Math.max(0, data.cash_received - total);
      }

      const sale = await tx.sale.create({
        data: {
          sale_number: saleNumber,
          sale_date: new Date(),
          customer_name: data.customer_name || "Consumidor Final",
          sale_type: data.sale_type || "DIRECTA",
          table_id: data.table_id || null,
          payment_method: data.payment_method || "EFECTIVO",
          bank_name: data.bank_name || null,
          document_number: data.document_number || null,
          subtotal: new Prisma.Decimal(calculatedSubtotal),
          total: new Prisma.Decimal(total),
          cash_received: data.cash_received != null ? new Prisma.Decimal(data.cash_received) : null,
          change_returned: changeReturned != null ? new Prisma.Decimal(changeReturned) : null,
          status: "COMPLETADA",
          notes: data.notes || null,
          created_by: userId || null,
          updated_by: userId || null,
          items: {
            create: itemsToCreate,
          },
        },
        include: {
          items: true,
          table: {
            select: { id: true, name: true, area: { select: { id: true, name: true } } },
          },
        },
      });

      return {
        ...sale,
        subtotal: Number(sale.subtotal),
        total: Number(sale.total),
        cash_received: sale.cash_received ? Number(sale.cash_received) : null,
        change_returned: sale.change_returned ? Number(sale.change_returned) : null,
        items: sale.items.map((i) => ({
          ...i,
          quantity: Number(i.quantity),
          unit_price: Number(i.unit_price),
          subtotal: Number(i.subtotal),
          unit_cost: Number(i.unit_cost),
        })),
      };
    });
  }

  static async cancel(id: string, userId?: string) {
    return prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findUnique({
        where: { id },
        include: { items: true },
      });

      if (!sale) {
        const error: any = new Error("Venta no encontrada");
        error.statusCode = 404;
        throw error;
      }

      if (sale.status === "ANULADA") {
        const error: any = new Error("La venta ya ha sido anulada previamente");
        error.statusCode = 400;
        throw error;
      }

      // Devolver stock
      for (const item of sale.items) {
        const product = await tx.product.findUnique({
          where: { id: item.product_id },
        });

        if (product) {
          const currentStock = Number(product.current_stock || 0);
          const restoredStock = currentStock + Number(item.quantity);

          await tx.product.update({
            where: { id: product.id },
            data: {
              current_stock: new Prisma.Decimal(restoredStock),
              updated_by: userId,
            },
          });
        }
      }

      const updatedSale = await tx.sale.update({
        where: { id },
        data: {
          status: "ANULADA",
          updated_by: userId,
        },
      });

      return updatedSale;
    });
  }
}
