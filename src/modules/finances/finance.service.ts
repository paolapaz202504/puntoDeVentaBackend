import { prisma } from "../../config/db.js";

export class FinanceService {
  static async getOutflows(params: {
    page: number;
    limit: number;
    search?: string;
    outflow_type?: "TODOS" | "COMPRA" | "GASTO";
    payment_method?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const { page, limit, search, outflow_type = "TODOS", payment_method, startDate, endDate } = params;

    const dateFilterPurchase: any = {};
    const dateFilterExpense: any = {};
    if (startDate) {
      dateFilterPurchase.gte = new Date(startDate);
      dateFilterExpense.gte = new Date(startDate);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateFilterPurchase.lte = end;
      dateFilterExpense.lte = end;
    }

    // 1. Obtener pagos de compras
    let purchasePayments: any[] = [];
    if (outflow_type === "TODOS" || outflow_type === "COMPRA") {
      const wherePurchase: any = {};
      if (startDate || endDate) wherePurchase.payment_date = dateFilterPurchase;
      if (payment_method) wherePurchase.payment_method = payment_method;
      if (search) {
        wherePurchase.OR = [
          { entry: { entry_number: { contains: search } } },
          { entry: { supplier: { name: { contains: search } } } },
          { bank_name: { contains: search } },
          { document_number: { contains: search } },
        ];
      }

      purchasePayments = await prisma.purchasePayment.findMany({
        where: wherePurchase,
        include: {
          entry: {
            select: {
              entry_number: true,
              entry_type: true,
              supplier: { select: { name: true } },
            },
          },
        },
        orderBy: { payment_date: "desc" },
      });
    }

    // 2. Obtener gastos operativos
    let expenses: any[] = [];
    if (outflow_type === "TODOS" || outflow_type === "GASTO") {
      const whereExpense: any = {};
      if (startDate || endDate) whereExpense.expense_date = dateFilterExpense;
      if (payment_method) whereExpense.payment_method = payment_method;
      if (search) {
        whereExpense.OR = [
          { expense_number: { contains: search } },
          { description: { contains: search } },
          { bank_name: { contains: search } },
          { document_number: { contains: search } },
          { notes: { contains: search } },
        ];
      }

      expenses = await prisma.expense.findMany({
        where: whereExpense,
        orderBy: { expense_date: "desc" },
      });
    }

    // 3. Unificar en una lista común de egresos
    const formattedPurchases = purchasePayments.map((p) => ({
      id: p.id,
      outflow_type: "COMPRA" as const,
      reference_number: p.entry.entry_number,
      date: p.payment_date,
      category: "COMPRA_MERCADERIA",
      description: `Pago de ${p.entry.entry_type} - Prov: ${p.entry.supplier?.name || "Proveedor sin nombre"}`,
      amount: Number(p.amount),
      payment_method: p.payment_method,
      bank_name: p.bank_name,
      document_number: p.document_number,
      document_date: p.document_date,
      notes: p.notes,
    }));

    const formattedExpenses = expenses.map((e) => ({
      id: e.id,
      outflow_type: "GASTO" as const,
      reference_number: e.expense_number,
      date: e.expense_date,
      category: e.category,
      description: e.description,
      amount: Number(e.amount),
      payment_method: e.payment_method,
      bank_name: e.bank_name,
      document_number: e.document_number,
      document_date: e.document_date,
      notes: e.notes,
    }));

    const unified = [...formattedPurchases, ...formattedExpenses].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    const totalPurchasesAmount = formattedPurchases.reduce((sum, item) => sum + item.amount, 0);
    const totalExpensesAmount = formattedExpenses.reduce((sum, item) => sum + item.amount, 0);
    const grandTotal = totalPurchasesAmount + totalExpensesAmount;

    const total = unified.length;
    const startIndex = (page - 1) * limit;
    const paginatedItems = unified.slice(startIndex, startIndex + limit);

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      summary: {
        totalOutflows: grandTotal,
        totalPurchasesAmount,
        totalExpensesAmount,
      },
      items: paginatedItems,
    };
  }

  static async getFinancialFlow(params: { startDate?: string; endDate?: string }) {
    const { startDate, endDate } = params;

    const dateFilter: any = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter.lte = end;
    }

    const salesWhere: any = { status: "COMPLETADA" };
    const purchaseWhere: any = {};
    const expenseWhere: any = {};

    if (startDate || endDate) {
      salesWhere.sale_date = dateFilter;
      purchaseWhere.payment_date = dateFilter;
      expenseWhere.expense_date = dateFilter;
    }

    const [sales, purchasePayments, expenses] = await Promise.all([
      prisma.sale.findMany({ where: salesWhere }),
      prisma.purchasePayment.findMany({ where: purchaseWhere }),
      prisma.expense.findMany({ where: expenseWhere }),
    ]);

    const totalInflows = sales.reduce((sum, s) => sum + Number(s.total), 0);
    const purchasesOutflows = purchasePayments.reduce((sum, p) => sum + Number(p.amount), 0);
    const expensesOutflows = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const totalOutflows = purchasesOutflows + expensesOutflows;
    const netCashFlow = totalInflows - totalOutflows;

    // Desglose de ingresos por método de pago
    const inflowsByMethod: Record<string, number> = {
      EFECTIVO: 0,
      TARJETA: 0,
      TRANSFERENCIA: 0,
    };
    for (const s of sales) {
      inflowsByMethod[s.payment_method] = (inflowsByMethod[s.payment_method] || 0) + Number(s.total);
    }

    // Desglose de egresos por método
    const outflowsByMethod: Record<string, number> = {
      EFECTIVO: 0,
      CHEQUE: 0,
      DEPOSITO: 0,
      TRANSFERENCIA: 0,
    };
    for (const p of purchasePayments) {
      outflowsByMethod[p.payment_method] = (outflowsByMethod[p.payment_method] || 0) + Number(p.amount);
    }
    for (const e of expenses) {
      outflowsByMethod[e.payment_method] = (outflowsByMethod[e.payment_method] || 0) + Number(e.amount);
    }

    // Desglose de gastos por categoría
    const expensesByCategory: Record<string, number> = {};
    for (const e of expenses) {
      expensesByCategory[e.category] = (expensesByCategory[e.category] || 0) + Number(e.amount);
    }

    return {
      summary: {
        totalInflows,
        totalOutflows,
        purchasesOutflows,
        expensesOutflows,
        netCashFlow,
        salesCount: sales.length,
        purchasesCount: purchasePayments.length,
        expensesCount: expenses.length,
      },
      inflowsByMethod,
      outflowsByMethod,
      expensesByCategory,
    };
  }

  static async getDashboardMetrics(startDateStr?: string, endDateStr?: string) {
    let start: Date;
    let end: Date;

    if (startDateStr) {
      if (startDateStr.includes("T")) {
        start = new Date(startDateStr);
      } else {
        const [y, m, d] = startDateStr.split("-").map(Number);
        start = new Date(y, m - 1, d, 0, 0, 0, 0);
      }
    } else {
      const now = new Date();
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    }

    if (endDateStr) {
      if (endDateStr.includes("T")) {
        end = new Date(endDateStr);
      } else {
        const [y, m, d] = endDateStr.split("-").map(Number);
        end = new Date(y, m - 1, d, 23, 59, 59, 999);
      }
    } else {
      const now = new Date();
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    }

    // 1. Consultar Ventas en el período
    const sales = await prisma.sale.findMany({
      where: {
        status: "COMPLETADA",
        sale_date: { gte: start, lte: end },
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                category_id: true,
                category: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
      orderBy: { sale_date: "asc" },
    });

    // 2. Consultar Compras (Stock Entries) en el período
    const stockEntries = await prisma.stockEntry.findMany({
      where: {
        entry_date: { gte: start, lte: end },
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                category_id: true,
                category: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
      orderBy: { entry_date: "asc" },
    });

    // 3. Consultar Gastos Operativos en el período
    const expenses = await prisma.expense.findMany({
      where: {
        expense_date: { gte: start, lte: end },
      },
      orderBy: { expense_date: "asc" },
    });

    // 4. Categorías de productos
    const categories = await prisma.category.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });

    // 5. Inventario Crítico
    const allProducts = await prisma.product.findMany({
      where: { is_active: true },
      include: {
        base_unit: { select: { symbol: true } },
        category: { select: { id: true, name: true } },
      },
      orderBy: { current_stock: "asc" },
    });

    const criticalProducts = allProducts
      .filter((p) => Number(p.current_stock) <= Number(p.min_stock_alert))
      .map((p) => ({
        id: p.id,
        code: p.code,
        name: p.name,
        category_id: p.category_id,
        category_name: p.category?.name || "Sin Categoría",
        current_stock: Number(p.current_stock),
        min_stock_alert: Number(p.min_stock_alert),
        unit_symbol: p.base_unit.symbol,
      }));

    // Cálculos de Resumen
    const salesTotal = sales.reduce((acc, s) => acc + Number(s.total), 0);
    const purchasesTotal = stockEntries.reduce((acc, e) => acc + Number(e.total_cost), 0);
    const expensesTotal = expenses.reduce((acc, ex) => acc + Number(ex.amount), 0);
    const netProfit = salesTotal - purchasesTotal - expensesTotal;

    // 6. Tendencia diaria para el gráfico de líneas (cada día dentro del rango)
    const dailyMap: Record<string, { sales: number; purchases: number; expenses: number }> = {};
    const curr = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const lastDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());

    while (curr <= lastDay) {
      const key = `${curr.getFullYear()}-${String(curr.getMonth() + 1).padStart(2, "0")}-${String(
        curr.getDate()
      ).padStart(2, "0")}`;
      dailyMap[key] = { sales: 0, purchases: 0, expenses: 0 };
      curr.setDate(curr.getDate() + 1);
    }

    for (const s of sales) {
      const d = new Date(s.sale_date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate()
      ).padStart(2, "0")}`;
      if (dailyMap[key]) {
        dailyMap[key].sales += Number(s.total);
      }
    }

    for (const p of stockEntries) {
      const d = new Date(p.entry_date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate()
      ).padStart(2, "0")}`;
      if (dailyMap[key]) {
        dailyMap[key].purchases += Number(p.total_cost);
      }
    }

    for (const ex of expenses) {
      const d = new Date(ex.expense_date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate()
      ).padStart(2, "0")}`;
      if (dailyMap[key]) {
        dailyMap[key].expenses += Number(ex.amount);
      }
    }

    const dailyTrend = Object.entries(dailyMap).map(([dateKey, values]) => {
      const [y, m, d] = dateKey.split("-");
      const profit = values.sales - values.purchases - values.expenses;
      return {
        date: dateKey,
        label: `${d}/${m}`,
        sales: values.sales,
        purchases: values.purchases,
        expenses: values.expenses,
        profit,
      };
    });

    // 7. Listas formateadas para agrupaciones temporales flexibles en el cliente
    const formattedSales = sales.map((s) => ({
      id: s.id,
      sale_date: s.sale_date,
      total: Number(s.total),
      items: s.items.map((i) => ({
        product_id: i.product_id,
        product_name: i.product_name,
        category_id: i.product?.category_id || "",
        category_name: i.product?.category?.name || "Sin Categoría",
        quantity: Number(i.quantity),
        unit_price: Number(i.unit_price),
        subtotal: Number(i.subtotal),
      })),
    }));

    const formattedPurchases = stockEntries.map((e) => ({
      id: e.id,
      entry_date: e.entry_date,
      total_cost: Number(e.total_cost),
      items: e.items.map((i) => ({
        product_id: i.product_id,
        product_name: i.product?.name || "Producto",
        category_id: i.product?.category_id || "",
        category_name: i.product?.category?.name || "Sin Categoría",
        quantity: Number(i.quantity),
        unit_cost: Number(i.unit_cost),
        total_cost: Number(i.total_cost),
      })),
    }));

    const formattedExpenses = expenses.map((ex) => ({
      id: ex.id,
      expense_date: ex.expense_date,
      category: ex.category,
      description: ex.description,
      amount: Number(ex.amount),
    }));

    return {
      period: {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      },
      summary: {
        salesTotal,
        purchasesTotal,
        expensesTotal,
        netProfit,
      },
      dailyTrend,
      categories,
      sales: formattedSales,
      purchases: formattedPurchases,
      expenses: formattedExpenses,
      criticalInventory: {
        totalCritical: criticalProducts.length,
        products: criticalProducts,
      },
    };
  }
}
