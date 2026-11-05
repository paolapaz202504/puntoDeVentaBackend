import { Prisma } from "@prisma/client";
import { prisma } from "../../config/db.js";

export class ExpenseService {
  private static async generateExpenseNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `GAS-${year}-`;

    const lastExpense = await prisma.expense.findFirst({
      where: {
        expense_number: {
          startsWith: prefix,
        },
      },
      orderBy: {
        expense_number: "desc",
      },
    });

    if (!lastExpense) {
      return `${prefix}0001`;
    }

    const lastCorrelative = parseInt(lastExpense.expense_number.replace(prefix, ""), 10);
    const nextCorrelative = (lastCorrelative + 1).toString().padStart(4, "0");
    return `${prefix}${nextCorrelative}`;
  }

  static async list(params: {
    page: number;
    limit: number;
    search?: string;
    category?: string;
    payment_method?: string;
    startDate?: string;
    endDate?: string;
    sortBy: "expense_date" | "amount" | "created_at";
    order: "asc" | "desc";
  }) {
    const { page, limit, search, category, payment_method, startDate, endDate, sortBy, order } =
      params;
    const skip = (page - 1) * limit;

    const where: Prisma.ExpenseWhereInput = {};

    if (search) {
      where.OR = [
        { expense_number: { contains: search } },
        { description: { contains: search } },
        { notes: { contains: search } },
        { bank_name: { contains: search } },
        { document_number: { contains: search } },
      ];
    }

    if (category) {
      where.category = category;
    }

    if (payment_method) {
      where.payment_method = payment_method;
    }

    if (startDate || endDate) {
      where.expense_date = {};
      if (startDate) {
        where.expense_date.gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.expense_date.lte = end;
      }
    }

    const [total, items, aggregateSum] = await Promise.all([
      prisma.expense.count({ where }),
      prisma.expense.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: order },
      }),
      prisma.expense.aggregate({
        where,
        _sum: {
          amount: true,
        },
      }),
    ]);

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      totalAmount: aggregateSum._sum.amount ? Number(aggregateSum._sum.amount) : 0,
      items: items.map((item) => ({
        ...item,
        amount: Number(item.amount),
      })),
    };
  }

  static async getById(id: string) {
    const expense = await prisma.expense.findUnique({
      where: { id },
    });

    if (!expense) {
      const error: any = new Error("Registro de gasto no encontrado");
      error.statusCode = 404;
      throw error;
    }

    return {
      ...expense,
      amount: Number(expense.amount),
    };
  }

  static async create(
    data: {
      expense_date?: string;
      category: string;
      description: string;
      amount: number;
      payment_method: string;
      bank_name?: string | null;
      document_number?: string | null;
      document_date?: string | null;
      notes?: string | null;
    },
    userId?: string
  ) {
    const expenseNumber = await this.generateExpenseNumber();

    const created = await prisma.expense.create({
      data: {
        expense_number: expenseNumber,
        expense_date: data.expense_date ? new Date(data.expense_date) : new Date(),
        category: data.category,
        description: data.description,
        amount: new Prisma.Decimal(data.amount),
        payment_method: data.payment_method,
        bank_name: data.bank_name || null,
        document_number: data.document_number || null,
        document_date: data.document_date ? new Date(data.document_date) : null,
        notes: data.notes || null,
        created_by: userId || null,
        updated_by: userId || null,
      },
    });

    return {
      ...created,
      amount: Number(created.amount),
    };
  }

  static async delete(id: string) {
    await this.getById(id);
    return prisma.expense.delete({
      where: { id },
    });
  }
}
