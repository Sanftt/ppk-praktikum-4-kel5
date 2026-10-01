'use server';

import { addUser as dbAddUser } from './user';
import { revalidatePath } from 'next/cache';
import { prisma } from './prisma';
import bcrypt from 'bcrypt';
import { setSessionCookie } from './auth';

export async function addUser(formData: FormData) {
  try {
    const username = formData.get('username') as string;
    const password = formData.get('password') as string;

    if (!username || !password) {
      return { success: false, error: 'Username dan password wajib diisi' };
    }

    await dbAddUser({ username, password });
    revalidatePath('/register');
    return { success: true, message: 'User berhasil ditambahkan, silahkan login.' };
  } catch (error: any) {
    if (error.code === 'P2002') {
      return { success: false, error: 'Username sudah digunakan' };
    }
    return { success: false, error: 'Terjadi kesalahan saat menambahkan user' };
  }
}

export async function loginUser(formData: FormData) {
  const username = formData.get('username') as string;
  const password = formData.get('password') as string;

  if (!username || !password) {
    return { success: false, error: 'Username dan password wajib diisi' };
  }

  const user = await prisma.user.findUnique({ where: { username } });
  
  if (!user) {
    return { success: false, error: 'Username atau password salah' };
  }

  const isValidPassword = await bcrypt.compare(password, user.password);
  
  if (!isValidPassword) {
    return { success: false, error: 'Username atau password salah' };
  }

  // Set Cookie sesi
  await setSessionCookie(user.id, user.username);
  
  return { success: true };
}

export async function addTransaction(data: {
  userId: string;
  type: 'INCOME' | 'EXPENSE';
  amount: number;
  description: string;
  date?: Date;
}) {
  await prisma.transaction.create({
    data: {
      userId: data.userId,
      type: data.type,
      amount: data.amount,
      description: data.description,
      date: data.date || new Date(),
    },
  });
  revalidatePath('/dashboard');
}

export async function deleteTransaction(id: string) {
  await prisma.transaction.delete({
    where: { id },
  });
  revalidatePath('/dashboard');
}

import { cookies } from 'next/headers';
export async function toggleThemePreference() {
  const cookieStore = await cookies();
  const currentTheme = cookieStore.get('theme')?.value || 'light';
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  cookieStore.set('theme', newTheme, { maxAge: 60 * 60 * 24 * 365, path: '/' });
  revalidatePath('/dashboard');
}
