"use server";

import { addUser as dbAddUser } from "./user";
import { revalidatePath } from "next/cache";
import { prisma } from "./prisma";
import bcrypt from "bcrypt";
import { getSession, setSessionCookie } from "./auth";

export async function addUser(formData: FormData) {
  try {
    const username = formData.get("username") as string;
    const password = formData.get("password") as string;

    if (!username || !password) {
      return { success: false, error: "Username dan password wajib diisi" };
    }

    await dbAddUser({ username, password });
    revalidatePath("/register");
    return {
      success: true,
      message: "User berhasil ditambahkan, silahkan login.",
    };
  } catch (error: unknown) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return { success: false, error: "Username sudah digunakan" };
    }
    return { success: false, error: "Terjadi kesalahan saat menambahkan user" };
  }
}

export async function loginUser(formData: FormData) {
  const username = formData.get("username") as string;
  const password = formData.get("password") as string;

  if (!username || !password) {
    return { success: false, error: "Username dan password wajib diisi" };
  }

  const user = await prisma.user.findUnique({ where: { username } });

  if (!user) {
    return { success: false, error: "Username atau password salah" };
  }

  const isValidPassword = await bcrypt.compare(password, user.password);

  if (!isValidPassword) {
    return { success: false, error: "Username atau password salah" };
  }

  // Set Cookie sesi
  await setSessionCookie(user.id, user.username);

  return { success: true };
}

export async function addTransaction(data: {
  type: "INCOME" | "EXPENSE";
  amount: number;
  description: string;
}) {
  const session = await getSession();
  if (!session?.userId) {
    throw new Error("Unauthorized");
  }

  const description = data.description.trim();
  if (
    (data.type !== "INCOME" && data.type !== "EXPENSE") ||
    !Number.isSafeInteger(data.amount) ||
    data.amount <= 0 ||
    !description
  ) {
    throw new Error("Invalid transaction data");
  }

  await prisma.transaction.create({
    data: {
      userId: session.userId,
      type: data.type,
      amount: data.amount,
      description,
    },
  });
  revalidatePath("/dashboard");
}

export async function deleteTransaction(id: string) {
  const session = await getSession();
  if (!session?.userId) {
    throw new Error("Unauthorized");
  }

  const result = await prisma.transaction.deleteMany({
    where: { id, userId: session.userId },
  });
  if (result.count === 0) {
    throw new Error("Transaction not found or unauthorized");
  }

  revalidatePath("/dashboard");
}

import { cookies } from "next/headers";
export async function toggleThemePreference() {
  const cookieStore = await cookies();
  const currentTheme = cookieStore.get("theme")?.value || "light";
  const newTheme = currentTheme === "light" ? "dark" : "light";
  cookieStore.set("theme", newTheme, { maxAge: 60 * 60 * 24 * 365, path: "/" });
  revalidatePath("/dashboard");
}

import {
  createBudget as dbCreateBudget,
  updateBudget as dbUpdateBudget,
  deleteBudget as dbDeleteBudget,
  getBudgetStats as dbGetBudgetStats,
  getCurrentMonthlyBudgetSummary as dbGetCurrentMonthlyBudgetSummary,
  saveMonthlyBudget as dbSaveMonthlyBudget,
  deleteMonthlyBudget as dbDeleteMonthlyBudget,
  BudgetError,
} from "./budget";

export async function getCurrentMonthlyBudgetSummary() {
  return await dbGetCurrentMonthlyBudgetSummary();
}

export async function saveMonthlyBudget(amount: number) {
  return await dbSaveMonthlyBudget(amount);
}

export async function deleteMonthlyBudget() {
  return await dbDeleteMonthlyBudget();
}

export async function createBudgetAction(data: {
  month: number;
  year: number;
  budgetAmount: number;
}) {
  const session = await getSession();
  if (!session?.userId) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const budget = await dbCreateBudget({
      userId: session.userId,
      month: data.month,
      year: data.year,
      budgetAmount: data.budgetAmount,
    });
    revalidatePath("/dashboard");
    return { success: true, data: budget };
  } catch (error: unknown) {
    if (error instanceof BudgetError && error.code === "P2002") {
      return {
        success: false,
        error: "Budget untuk bulan dan tahun ini sudah ada",
      };
    }
    const message = error instanceof Error ? error.message : "Gagal membuat budget";
    return { success: false, error: message };
  }
}

export async function updateBudgetAction(data: {
  id: string;
  budgetAmount?: number;
  month?: number;
  year?: number;
}) {
  const session = await getSession();
  if (!session?.userId) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const updated = await dbUpdateBudget({
      ...data,
      userId: session.userId,
    });
    revalidatePath("/dashboard");
    return { success: true, data: updated };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal memperbarui budget";
    return { success: false, error: message };
  }
}

export async function deleteBudgetAction(id: string) {
  const session = await getSession();
  if (!session?.userId) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    await dbDeleteBudget(id, session.userId);
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal menghapus budget";
    return { success: false, error: message };
  }
}

export async function getBudgetStatsAction(month: number, year: number) {
  const session = await getSession();
  if (!session?.userId) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const stats = await dbGetBudgetStats(session.userId, month, year);
    return { success: true, data: stats };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal mengambil statistik budget";
    return { success: false, error: message };
  }
}

