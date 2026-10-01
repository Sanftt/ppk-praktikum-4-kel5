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
  } catch (error: any) {
    if (error.code === "P2002") {
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
