'use client';

import { useState, useTransition } from 'react';
import { addUser } from '@/lib/actions';
import { useRouter } from 'next/navigation';

export default function AddUserForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const accessOptions = [
    { id: 'read', label: 'Read' },
    { id: 'write', label: 'Write' },
    { id: 'delete', label: 'Delete' },
    { id: 'admin', label: 'Admin' },
  ];

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotification(null);
    const formData = new FormData(event.currentTarget);
    const form = event.currentTarget;

    startTransition(async () => {
      try {
        const result = await addUser(formData);
        
        if (result.success) {
          setNotification({ type: 'success', message: result.message || 'Berhasil!' });
          form.reset(); // Reset form jika sukses
          router.refresh(); // Refresh halaman agar data terbaru tampil di tabel
        } else {
          setNotification({ type: 'error', message: result.error || 'Terjadi kesalahan.' });
        }
      } catch (error) {
        setNotification({ type: 'error', message: 'Terjadi kesalahan server.' });
      }
    });
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 max-w-md w-full">
      <h2 className="text-xl font-semibold mb-6 text-gray-800">Tambah User Baru</h2>

      {notification && (
        <div 
          className={`p-4 mb-6 rounded-lg text-sm font-medium ${
            notification.type === 'success' 
              ? 'bg-green-50 text-green-700 border border-green-200' 
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {notification.message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="username">
            Username
          </label>
          <input
            type="text"
            id="username"
            name="username"
            required
            placeholder="Masukkan username"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="password">
            Password
          </label>
          <input
            type="password"
            id="password"
            name="password"
            required
            placeholder="••••••••"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            List Access (Hak Akses)
          </label>
          <div className="space-y-2">
            {accessOptions.map((option) => (
              <div key={option.id} className="flex items-center">
                <input
                  type="checkbox"
                  id={`access-${option.id}`}
                  name="list_access"
                  value={option.id}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                />
                <label
                  htmlFor={`access-${option.id}`}
                  className="ml-2 text-sm font-medium text-gray-700 cursor-pointer"
                >
                  {option.label}
                </label>
              </div>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full bg-blue-600 text-white font-medium py-2.5 px-4 rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 transition-all disabled:opacity-70 disabled:cursor-not-allowed mt-2"
        >
          {isPending ? 'Menyimpan...' : 'Simpan User'}
        </button>
      </form>
    </div>
  );
}
