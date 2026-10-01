import { prisma } from "./prisma";
import { getSession } from "./auth";
import { revalidatePath } from "next/cache";

export type MonthlyBudgetSummary = {
  year: number;
  month: number;
  budgetAmount: number | null;
  spentAmount: number;
  remainingAmount: number | null;
  usagePercentage: number | null;
  status: "NO_BUDGET" | "NORMAL" | "WARNING" | "EXCEEDED";
};

export type BudgetActionResult =
  | { success: true }
  | { success: false; error: string };

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

/**
 * Menentukan tahun dan bulan (1-12) menurut zona waktu Asia/Jakarta.
 */
export function getJakartaYearMonth(date: Date = new Date()): { year: number; month: number } {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "numeric",
  });
  const parts = formatter.formatToParts(date);
  let year = date.getFullYear();
  let month = date.getMonth() + 1;
  for (const part of parts) {
    if (part.type === "year") year = parseInt(part.value, 10);
    if (part.type === "month") month = parseInt(part.value, 10);
  }
  return { year, month };
}

/**
 * Menghitung rentang tanggal awal bulan (inklusif) dan awal bulan berikutnya (eksklusif)
 * berdasarkan zona waktu Asia/Jakarta (WIB = UTC+7).
 */
export function getJakartaMonthRange(year: number, month: number): { start: Date; end: Date } {
  const monthStr = String(month).padStart(2, "0");
  const start = new Date(`${year}-${monthStr}-01T00:00:00.000+07:00`);

  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextMonthStr = String(nextMonth).padStart(2, "0");
  const end = new Date(`${nextYear}-${nextMonthStr}-01T00:00:00.000+07:00`);

  return { start, end };
}

/**
 * Menghitung pemakaian budget untuk bulan berjalan milik pengguna yang sedang login.
 * Aman dipanggil dari Server Component dashboard.
 */
export async function getCurrentMonthlyBudgetSummary(): Promise<MonthlyBudgetSummary> {
  const session = await getSession();
  if (!session?.userId) {
    throw new BudgetError("Unauthorized: Pengguna belum login", { status: 401 });
  }

  const { year, month } = getJakartaYearMonth();
  return await calculateMonthlyBudgetSummary(session.userId, year, month);
}

/**
 * Fungsi internal untuk menghitung ringkasan budget berdasarkan user, tahun, dan bulan.
 */
export async function calculateMonthlyBudgetSummary(
  userId: string,
  year: number,
  month: number
): Promise<MonthlyBudgetSummary> {
  const { start, end } = getJakartaMonthRange(year, month);

  // Ambil data budget user untuk bulan & tahun ini
  const budget = await prisma.monthlyBudget.findUnique({
    where: {
      userId_year_month: {
        userId,
        year,
        month,
      },
    },
  });

  // Agregasi transaksi pengeluaran (EXPENSE) di periode Asia/Jakarta
  const expenseAggregation = await prisma.transaction.aggregate({
    where: {
      userId,
      type: "EXPENSE",
      date: {
        gte: start,
        lt: end,
      },
    },
    _sum: {
      amount: true,
    },
  });

  const rawSpent = expenseAggregation._sum.amount ?? 0;
  const spentAmount = Math.round(rawSpent);

  if (!budget) {
    return {
      year,
      month,
      budgetAmount: null,
      spentAmount,
      remainingAmount: null,
      usagePercentage: null,
      status: "NO_BUDGET",
    };
  }

  const budgetAmount = Math.round(budget.budgetAmount);
  const remainingAmount = budgetAmount - spentAmount;
  const usagePercentage = budgetAmount > 0 ? (spentAmount / budgetAmount) * 100 : 0;

  let status: "NORMAL" | "WARNING" | "EXCEEDED" = "NORMAL";
  if (usagePercentage >= 100) {
    status = "EXCEEDED";
  } else if (usagePercentage >= 80) {
    status = "WARNING";
  } else {
    status = "NORMAL";
  }

  return {
    year,
    month,
    budgetAmount,
    spentAmount,
    remainingAmount,
    usagePercentage,
    status,
  };
}

/**
 * Menyimpan atau memperbarui budget bulan berjalan untuk pengguna sesi.
 */
export async function saveMonthlyBudget(amount: number): Promise<BudgetActionResult> {
  const session = await getSession();
  if (!session?.userId) {
    return { success: false, error: "Unauthorized: Pengguna belum login" };
  }

  if (!Number.isSafeInteger(amount) || amount <= 0) {
    return { success: false, error: "Nominal budget harus berupa bilangan bulat positif" };
  }

  try {
    const { year, month } = getJakartaYearMonth();

    await prisma.monthlyBudget.upsert({
      where: {
        userId_year_month: {
          userId: session.userId,
          year,
          month,
        },
      },
      create: {
        userId: session.userId,
        year,
        month,
        budgetAmount: amount,
      },
      update: {
        budgetAmount: amount,
      },
    });

    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal menyimpan budget";
    return { success: false, error: message };
  }
}

/**
 * Menghapus budget bulan berjalan milik pengguna sesi.
 */
export async function deleteMonthlyBudget(): Promise<BudgetActionResult> {
  const session = await getSession();
  if (!session?.userId) {
    return { success: false, error: "Unauthorized: Pengguna belum login" };
  }

  try {
    const { year, month } = getJakartaYearMonth();

    await prisma.monthlyBudget.deleteMany({
      where: {
        userId: session.userId,
        year,
        month,
      },
    });

    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal menghapus budget";
    return { success: false, error: message };
  }
}

// ----------------------------------------------------
// Helper queries tambahan untuk API routes
// ----------------------------------------------------

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
      userId_year_month: {
        userId,
        year,
        month,
      },
    },
  });
}

export async function createBudget(input: {
  userId: string;
  month: number;
  year: number;
  budgetAmount: number;
}) {
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

export async function updateBudget(input: {
  id: string;
  userId: string;
  budgetAmount?: number;
  month?: number;
  year?: number;
}) {
  const current = await getBudgetById(input.id, input.userId);
  if (!current) {
    throw new BudgetError("Budget tidak ditemukan atau bukan milik Anda", { status: 404 });
  }

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
  const summary = await calculateMonthlyBudgetSummary(userId, year, month);
  const { start, end } = getJakartaMonthRange(year, month);

  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      type: "EXPENSE",
      date: {
        gte: start,
        lt: end,
      },
    },
    orderBy: { date: "desc" },
  });

  return {
    ...summary,
    totalBudget: summary.budgetAmount ?? 0,
    totalExpense: summary.spentAmount,
    remainingBudget: summary.remainingAmount ?? -summary.spentAmount,
    percentage: summary.usagePercentage ? Number(summary.usagePercentage.toFixed(2)) : 0,
    statusLabel:
      summary.status === "EXCEEDED"
        ? "Melebihi anggaran"
        : summary.status === "WARNING"
        ? "Mendekati batas"
        : summary.status === "NORMAL"
        ? "Aman"
        : "Belum ada budget",
    transactions,
  };
}
