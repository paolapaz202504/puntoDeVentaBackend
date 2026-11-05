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

  static async getDashboardMetrics() {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // 1. Métricas de hoy
    const [todaySales, todayPurchasePayments, todayExpenses] = await Promise.all([
      prisma.sale.findMany({
        where: {
          status: "COMPLETADA",
          sale_date: { gte: startOfToday },
        },
      }),
      prisma.purchasePayment.findMany({
        where: {
          payment_date: { gte: startOfToday },
        },
      }),
      prisma.expense.findMany({
        where: {
          expense_date: { gte: startOfToday },
        },
      }),
    ]);

    const todaySalesTotal = todaySales.reduce((acc, s) => acc + Number(s.total), 0);
    const todayOutflowsTotal =
      todayPurchasePayments.reduce((acc, p) => acc + Number(p.amount), 0) +
      todayExpenses.reduce((acc, e) => acc + Number(e.amount), 0);

    // 2. Métricas del mes actual
    const [monthSales, monthPurchasePayments, monthExpenses] = await Promise.all([
      prisma.sale.findMany({
        where: {
          status: "COMPLETADA",
          sale_date: { gte: startOfMonth },
        },
      }),
      prisma.purchasePayment.findMany({
        where: {
          payment_date: { gte: startOfMonth },
        },
      }),
      prisma.expense.findMany({
        where: {
          expense_date: { gte: startOfMonth },
        },
      }),
    ]);

    const monthSalesTotal = monthSales.reduce((acc, s) => acc + Number(s.total), 0);
    const monthPurchasesTotal = monthPurchasePayments.reduce((acc, p) => acc + Number(p.amount), 0);
    const monthExpensesTotal = monthExpenses.reduce((acc, e) => acc + Number(e.amount), 0);
    const monthOutflowsTotal = monthPurchasesTotal + monthExpensesTotal;
    const monthNetProfit = monthSalesTotal - monthOutflowsTotal;

    // 3. Inventario Crítico
    const allProducts = await prisma.product.findMany({
      where: { is_active: true },
      include: { base_unit: { select: { symbol: true } } },
    });

    const criticalProducts = allProducts
      .filter((p) => Number(p.current_stock) <= Number(p.min_stock_alert))
      .map((p) => ({
        id: p.id,
        code: p.code,
        name: p.name,
        current_stock: Number(p.current_stock),
        min_stock_alert: Number(p.min_stock_alert),
        unit_symbol: p.base_unit.symbol,
      }));

    // 4. Últimos 7 días para gráfico de barras
    const chartDays: Array<{ date: string; sales: number; outflows: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

      const daySales = monthSales.filter(
        (s) => new Date(s.sale_date) >= dayStart && new Date(s.sale_date) <= dayEnd
      );
      const dayPurchases = monthPurchasePayments.filter(
        (p) => new Date(p.payment_date) >= dayStart && new Date(p.payment_date) <= dayEnd
      );
      const dayExpensesList = monthExpenses.filter(
        (e) => new Date(e.expense_date) >= dayStart && new Date(e.expense_date) <= dayEnd
      );

      const salesSum = daySales.reduce((acc, s) => acc + Number(s.total), 0);
      const outSum =
        dayPurchases.reduce((acc, p) => acc + Number(p.amount), 0) +
        dayExpensesList.reduce((acc, e) => acc + Number(e.amount), 0);

      const dayLabel = `${d.getDate()}/${d.getMonth() + 1}`;
      chartDays.push({
        date: dayLabel,
        sales: salesSum,
        outflows: outSum,
      });
    }

    // 5. Top 5 productos más vendidos del mes
    const saleItems = await prisma.saleItem.findMany({
      where: {
        sale: {
          status: "COMPLETADA",
          sale_date: { gte: startOfMonth },
        },
      },
    });

    const productSalesMap: Record<string, { name: string; quantity: number; revenue: number }> = {};
    for (const item of saleItems) {
      if (!productSalesMap[item.product_id]) {
        productSalesMap[item.product_id] = {
          name: item.product_name,
          quantity: 0,
          revenue: 0,
        };
      }
      productSalesMap[item.product_id].quantity += Number(item.quantity);
      productSalesMap[item.product_id].revenue += Number(item.subtotal);
    }

    const topProducts = Object.values(productSalesMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // 6. Actividad reciente
    const recentSales = await prisma.sale.findMany({
      take: 5,
      orderBy: { sale_date: "desc" },
      select: {
        id: true,
        sale_number: true,
        customer_name: true,
        sale_date: true,
        total: true,
        payment_method: true,
        status: true,
      },
    });

    return {
      today: {
        salesTotal: todaySalesTotal,
        salesCount: todaySales.length,
        outflowsTotal: todayOutflowsTotal,
        netBalance: todaySalesTotal - todayOutflowsTotal,
      },
      month: {
        salesTotal: monthSalesTotal,
        purchasesTotal: monthPurchasesTotal,
        expensesTotal: monthExpensesTotal,
        outflowsTotal: monthOutflowsTotal,
        netProfit: monthNetProfit,
      },
      criticalInventory: {
        totalCritical: criticalProducts.length,
        products: criticalProducts.slice(0, 8),
      },
      chartData: chartDays,
      topProducts,
      recentSales: recentSales.map((s) => ({
        ...s,
        total: Number(s.total),
      })),
    };
  }
}
