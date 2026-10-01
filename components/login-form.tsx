'use client';

import { useState, useTransition } from 'react';
import { loginUser } from '@/lib/actions';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      try {
        const result = await loginUser(formData);
        
        if (result.success) {
          router.push('/dashboard');
          router.refresh();
        } else {
          setError(result.error || 'Terjadi kesalahan saat login.');
        }
      } catch (err) {
        setError('Terjadi kesalahan server.');
      }
    });
  }

  return (
    <div className="bg-white py-8 px-6 shadow-xl sm:rounded-2xl sm:px-10 w-full border border-gray-100 max-w-md mx-auto">
      <h2 className="text-2xl font-bold mb-2 text-gray-900 text-center">Selamat Datang Kembali</h2>
      <p className="text-sm text-gray-500 mb-8 text-center">Masuk ke akun TaskFlow kamu</p>

      {error && (
        <div className="p-4 mb-6 rounded-lg text-sm font-medium bg-red-50 text-red-700 border border-red-200">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="username">
            Username
          </label>
          <input
            type="text"
            id="username"
            name="username"
            required
            placeholder="Masukkan username kamu"
            className="w-full px-4 py-3 text-black bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-all outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="password">
            Password
          </label>
          <input
            type="password"
            id="password"
            name="password"
            required
            placeholder="••••••••"
            className="w-full px-4 py-3 text-black bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-all outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full bg-blue-600 text-white font-semibold py-3 px-4 rounded-xl hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 transition-all shadow-md shadow-blue-500/30 hover:shadow-lg hover:shadow-blue-500/40 disabled:opacity-70 disabled:cursor-not-allowed mt-2"
        >
          {isPending ? 'Memproses...' : 'Login Sekarang'}
        </button>
      </form>

      <div className="mt-8 text-center text-sm text-gray-600">
        Belum punya akun?{' '}
        <Link href="/register" className="font-semibold text-blue-600 hover:text-blue-800 transition-colors">
          Daftar di sini
        </Link>
      </div>
    </div>
  );
}
