import { prisma } from "../../config/db.js";
import { CreateStockEntryInput, AddPaymentInput, QueryStockEntryInput } from "./stockEntry.schemas.js";
import { Prisma } from "@prisma/client";

export class StockEntryService {
  /**
   * Genera el siguiente número correlativo de entrada/compra
   */
  private static async getNextEntryNumber(entryType: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = entryType === "COMPRA" ? `CMP-${year}` : `ENT-${year}`;

    const lastEntry = await prisma.stockEntry.findFirst({
      where: {
        entry_number: {
          startsWith: prefix,
        },
      },
      orderBy: {
        created_at: "desc",
      },
      select: {
        entry_number: true,
      },
    });

    let nextSeq = 1;
    if (lastEntry?.entry_number) {
      const parts = lastEntry.entry_number.split("-");
      const lastSeq = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastSeq)) {
        nextSeq = lastSeq + 1;
      }
    }

    return `${prefix}-${String(nextSeq).padStart(4, "0")}`;
  }

  /**
   * Listar entradas y compras con paginación, filtros y ordenamiento
   */
  static async list(query: QueryStockEntryInput) {
    const { page, limit, search, supplier_id, entry_type, payment_status, sortBy, order } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.StockEntryWhereInput = {};

    if (search && search.trim()) {
      const term = search.trim();
      where.OR = [
        { entry_number: { contains: term } },
        { invoice_number: { contains: term } },
        { notes: { contains: term } },
        { supplier: { name: { contains: term } } },
      ];
    }

    if (supplier_id && supplier_id.trim()) {
      where.supplier_id = supplier_id;
    }

    if (entry_type && entry_type.trim()) {
      where.entry_type = entry_type;
    }

    if (payment_status && payment_status.trim()) {
      where.payment_status = payment_status;
    }

    const [total, data] = await Promise.all([
      prisma.stockEntry.count({ where }),
      prisma.stockEntry.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          [sortBy]: order,
        },
        include: {
          supplier: {
            select: {
              id: true,
              name: true,
              contact_name: true,
              phone: true,
              category: true,
            },
          },
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                  base_unit: {
                    select: {
                      name: true,
                      symbol: true,
                    },
                  },
                },
              },
            },
          },
          payments: {
            orderBy: {
              payment_date: "asc",
            },
          },
        },
      }),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Obtener detalle de una entrada por ID
   */
  static async getById(id: string) {
    const entry = await prisma.stockEntry.findUnique({
      where: { id },
      include: {
        supplier: true,
        items: {
          include: {
            product: {
              include: {
                base_unit: true,
              },
            },
          },
        },
        payments: {
          orderBy: {
            payment_date: "desc",
          },
        },
      },
    });

    if (!entry) {
      throw new Error("Entrada de almacén no encontrada");
    }

    return entry;
  }

  /**
   * Crear nueva entrada de inventario / compra con transacción ACID
   */
  static async create(input: CreateStockEntryInput, userId?: string) {
    return await prisma.$transaction(async (tx) => {
      const entryNumber = await this.getNextEntryNumber(input.entry_type);

      // 1. Validar productos y calcular totales
      let totalCostSum = 0;
      const itemsToCreate = [];

      for (const item of input.items) {
        const product = await tx.product.findUnique({
          where: { id: item.product_id },
          include: { base_unit: true },
        });

        if (!product) {
          throw new Error(`Producto con ID ${item.product_id} no existe`);
        }

        const quantity = Number(item.quantity);
        const conversionFactor = item.conversion_factor || 1;
        const baseQuantity = quantity * conversionFactor;
        const unitCost = Number(item.unit_cost);
        const itemTotal = quantity * unitCost;
        const unitCostBase = baseQuantity > 0 ? itemTotal / baseQuantity : 0;

        totalCostSum += itemTotal;

        itemsToCreate.push({
          product_id: product.id,
          presentation_name: item.presentation_name || null,
          quantity: new Prisma.Decimal(quantity),
          conversion_factor: conversionFactor,
          base_quantity: new Prisma.Decimal(baseQuantity),
          unit_cost: new Prisma.Decimal(unitCostBase),
          total_cost: new Prisma.Decimal(itemTotal),
          created_by: userId,
          updated_by: userId,
        });

        // 2. Incrementar stock del producto
        const currentStock = Number(product.current_stock || 0);
        const newStock = currentStock + baseQuantity;

        // 3. Recalcular Costo Promedio Ponderado (CPP) si es compra con costo > 0
        let newCurrentCost = Number(product.current_cost || 0);
        if (input.entry_type === "COMPRA" && itemTotal > 0) {
          if (currentStock > 0 && newStock > 0) {
            newCurrentCost = (currentStock * newCurrentCost + itemTotal) / newStock;
          } else {
            newCurrentCost = unitCostBase;
          }
        }

        await tx.product.update({
          where: { id: product.id },
          data: {
            current_stock: new Prisma.Decimal(newStock),
            current_cost: new Prisma.Decimal(Number(newCurrentCost.toFixed(2))),
            updated_by: userId,
          },
        });
      }

      // 4. Determinar estado y montos financieros
      let paymentType = input.payment_type;
      let paymentStatus = "PAGADA";
      let paidAmount = 0;
      let balanceAmount = 0;

      if (input.entry_type === "DONACION" || input.entry_type === "AJUSTE") {
        paymentType = "NO_APLICA";
        paymentStatus = "NO_APLICA";
        paidAmount = 0;
        balanceAmount = 0;
      } else if (input.entry_type === "COMPRA") {
        if (paymentType === "CREDITO") {
          paymentStatus = "PENDIENTE";
          paidAmount = 0;
          balanceAmount = totalCostSum;
        } else {
          // CONTADO
          paymentStatus = "PAGADA";
          paidAmount = totalCostSum;
          balanceAmount = 0;
        }
      }

      const entryDate = input.entry_date ? new Date(input.entry_date) : new Date();
      const dueDate = input.due_date ? new Date(input.due_date) : null;

      // 5. Crear la cabecera StockEntry
      const entry = await tx.stockEntry.create({
        data: {
          entry_number: entryNumber,
          supplier_id: input.supplier_id || null,
          entry_type: input.entry_type,
          entry_date: entryDate,
          invoice_number: input.invoice_number || null,
          payment_type: paymentType,
          payment_status: paymentStatus,
          total_cost: new Prisma.Decimal(totalCostSum),
          paid_amount: new Prisma.Decimal(paidAmount),
          balance_amount: new Prisma.Decimal(balanceAmount),
          due_date: dueDate,
          notes: input.notes || null,
          created_by: userId,
          updated_by: userId,
          items: {
            create: itemsToCreate,
          },
        },
      });

      // 6. Si es compra al contado, registrar el pago inicial
      if (input.entry_type === "COMPRA" && paymentType === "CONTADO" && totalCostSum > 0) {
        const initPay = input.initial_payment;
        await tx.purchasePayment.create({
          data: {
            entry_id: entry.id,
            payment_date: entryDate,
            amount: new Prisma.Decimal(totalCostSum),
            payment_method: initPay?.payment_method || "EFECTIVO",
            bank_name: initPay?.bank_name || null,
            document_number: initPay?.document_number || null,
            document_date: initPay?.document_date ? new Date(initPay.document_date) : null,
            notes: initPay?.notes || "Pago total al contado al recibir mercadería",
            created_by: userId,
            updated_by: userId,
          },
        });
      }

      return entry;
    }, { maxWait: 10000, timeout: 30000 });
  }

  /**
   * Registrar abono o liquidación total a una compra a crédito
   */
  static async addPayment(entryId: string, input: AddPaymentInput, userId?: string) {
    return await prisma.$transaction(async (tx) => {
      const entry = await tx.stockEntry.findUnique({
        where: { id: entryId },
      });

      if (!entry) {
        throw new Error("Compra o entrada de almacén no encontrada");
      }

      if (entry.entry_type !== "COMPRA" || entry.payment_type !== "CREDITO") {
        throw new Error("Esta entrada no corresponde a una compra a crédito");
      }

      const balance = Number(entry.balance_amount);
      if (balance <= 0) {
        throw new Error("Esta compra ya se encuentra totalmente pagada");
      }

      const payAmount = Number(input.amount);
      if (payAmount <= 0) {
        throw new Error("El monto del abono debe ser mayor a 0");
      }

      if (payAmount > balance) {
        throw new Error(`El abono (Q${payAmount.toFixed(2)}) no puede exceder el saldo pendiente (Q${balance.toFixed(2)})`);
      }

      const newPaid = Number(entry.paid_amount) + payAmount;
      const newBalance = balance - payAmount;
      const newStatus = newBalance <= 0.009 ? "PAGADA" : "PARCIAL";

      // 1. Registrar pago
      const payment = await tx.purchasePayment.create({
        data: {
          entry_id: entry.id,
          payment_date: new Date(),
          amount: new Prisma.Decimal(payAmount),
          payment_method: input.payment_method,
          bank_name: input.bank_name || null,
          document_number: input.document_number || null,
          document_date: input.document_date ? new Date(input.document_date) : null,
          notes: input.notes || null,
          created_by: userId,
          updated_by: userId,
        },
      });

      // 2. Actualizar estado y saldos de la compra
      const updatedEntry = await tx.stockEntry.update({
        where: { id: entry.id },
        data: {
          paid_amount: new Prisma.Decimal(newPaid),
          balance_amount: new Prisma.Decimal(Math.max(0, newBalance)),
          payment_status: newStatus,
          updated_by: userId,
        },
        include: {
          supplier: true,
          payments: {
            orderBy: { payment_date: "desc" },
          },
        },
      });

      return { payment, entry: updatedEntry };
    }, { maxWait: 10000, timeout: 30000 });
  }

  /**
   * Resumen de métricas para el encabezado de Entradas
   */
  static async getMetrics() {
    const [totalEntries, totalPurchasesAgg, pendingCreditAgg, creditEntriesCount] = await Promise.all([
      prisma.stockEntry.count(),
      prisma.stockEntry.aggregate({
        _sum: {
          total_cost: true,
        },
        where: {
          entry_type: "COMPRA",
        },
      }),
      prisma.stockEntry.aggregate({
        _sum: {
          balance_amount: true,
        },
        where: {
          entry_type: "COMPRA",
          payment_type: "CREDITO",
          payment_status: { in: ["PENDIENTE", "PARCIAL"] },
        },
      }),
      prisma.stockEntry.count({
        where: {
          entry_type: "COMPRA",
          payment_type: "CREDITO",
          payment_status: { in: ["PENDIENTE", "PARCIAL"] },
        },
      }),
    ]);

    return {
      totalEntries,
      totalPurchasesAmount: Number(totalPurchasesAgg._sum.total_cost || 0),
      totalPendingBalance: Number(pendingCreditAgg._sum.balance_amount || 0),
      pendingCreditCount: creditEntriesCount,
    };
  }
}
