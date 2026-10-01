import { prisma } from "./prisma";

export interface CreateBudgetInput {
  userId: string;
  month: number;
  year: number;
  budgetAmount: number;
}

export interface UpdateBudgetInput {
  id: string;
  userId: string;
  budgetAmount?: number;
  month?: number;
  year?: number;
}

export class BudgetError extends Error {
  code?: string;
  status?: number;

  constructor(message: string, options?: { code?: string; status?: number }) {
    super(message);
    this.name = "BudgetError";
    this.code = options?.code;
    this.status = options?.status;
  }
}

export async function getBudgets(userId: string) {
  return await prisma.monthlyBudget.findMany({
    where: { userId },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });
}

export async function getBudgetById(id: string, userId: string) {
  return await prisma.monthlyBudget.findFirst({
    where: { id, userId },
  });
}

export async function getBudgetByPeriod(userId: string, month: number, year: number) {
  return await prisma.monthlyBudget.findUnique({
    where: {
      userId_month_year: {
        userId,
        month,
        year,
      },
    },
  });
}

export async function createBudget(input: CreateBudgetInput) {
  // Cek apakah budget untuk bulan & tahun ini sudah pernah dibuat oleh user
  const existing = await getBudgetByPeriod(input.userId, input.month, input.year);
  if (existing) {
    throw new BudgetError("Budget untuk bulan dan tahun ini sudah ada", { code: "P2002", status: 409 });
  }

  return await prisma.monthlyBudget.create({
    data: {
      userId: input.userId,
      month: input.month,
      year: input.year,
      budgetAmount: input.budgetAmount,
    },
  });
}

export async function updateBudget(input: UpdateBudgetInput) {
  // Pastikan budget ada dan milik user yang bersangkutan
  const current = await getBudgetById(input.id, input.userId);
  if (!current) {
    throw new BudgetError("Budget tidak ditemukan atau bukan milik Anda", { status: 404 });
  }

  // Jika bulan atau tahun diubah, pastikan tidak konflik dengan budget lain
  if (
    (input.month && input.month !== current.month) ||
    (input.year && input.year !== current.year)
  ) {
    const targetMonth = input.month ?? current.month;
    const targetYear = input.year ?? current.year;

    const duplicate = await getBudgetByPeriod(input.userId, targetMonth, targetYear);
    if (duplicate && duplicate.id !== input.id) {
      throw new BudgetError("Budget untuk bulan dan tahun tersebut sudah ada", { code: "P2002", status: 409 });
    }
  }

  return await prisma.monthlyBudget.update({
    where: { id: input.id },
    data: {
      ...(input.budgetAmount !== undefined ? { budgetAmount: input.budgetAmount } : {}),
      ...(input.month !== undefined ? { month: input.month } : {}),
      ...(input.year !== undefined ? { year: input.year } : {}),
    },
  });
}

export async function deleteBudget(id: string, userId: string) {
  const result = await prisma.monthlyBudget.deleteMany({
    where: { id, userId },
  });

  if (result.count === 0) {
    throw new BudgetError("Budget tidak ditemukan atau bukan milik Anda", { status: 404 });
  }

  return { success: true };
}

export async function getBudgetStats(userId: string, month: number, year: number) {
  const budget = await getBudgetByPeriod(userId, month, year);

  const startDate = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);

  const expenseTransactions = await prisma.transaction.findMany({
    where: {
      userId,
      type: "EXPENSE",
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: { date: "desc" },
  });

  const totalExpense = expenseTransactions.reduce((acc, t) => acc + t.amount, 0);
  const budgetAmount = budget ? budget.budgetAmount : 0;
  const remainingBudget = budgetAmount - totalExpense;
  const percentage = budgetAmount > 0 ? (totalExpense / budgetAmount) * 100 : 0;

  let status: "SAFE" | "WARNING" | "DANGER" = "SAFE";
  let statusLabel = "Aman";

  if (budgetAmount > 0) {
    if (percentage >= 100) {
      status = "DANGER";
      statusLabel = "Melebihi anggaran";
    } else if (percentage >= 75) {
      status = "WARNING";
      statusLabel = "Mendekati batas";
    } else {
      status = "SAFE";
      statusLabel = "Aman";
    }
  } else if (totalExpense > 0) {
    status = "DANGER";
    statusLabel = "Melebihi anggaran (Belum ada budget)";
  }

  return {
    month,
    year,
    budget,
    totalBudget: budgetAmount,
    totalExpense,
    remainingBudget,
    percentage: Number(percentage.toFixed(2)),
    status,
    statusLabel,
    transactions: expenseTransactions,
  };
}
