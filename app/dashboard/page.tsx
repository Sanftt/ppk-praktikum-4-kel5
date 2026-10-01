import { getSession, logout } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import TransactionDashboard from '@/components/transaction-dashboard';
import { cookies } from 'next/headers';

export const metadata = {
  title: 'Dashboard Keuangan | TaskFlow',
};

export default async function DashboardPage() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  // Ambil preferensi tema dari cookies
  const cookieStore = await cookies();
  const theme = cookieStore.get('theme')?.value || 'light';
  const isDark = theme === 'dark';

  // Fetch data transaksi khusus user ini
  const transactions = await prisma.transaction.findMany({
    where: { userId: session.userId },
    orderBy: { date: 'desc' },
  });

  return (
    <div className={`min-h-screen flex flex-col ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <header className={`shadow-sm border-b ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className={`text-xl font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            </div>
            TaskFlow
          </h1>
          <div className="flex items-center gap-4">
            <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              Halo, <span className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{session.username}</span>
            </span>
            <form action={async () => {
              'use server';
              await logout();
              redirect('/login');
            }}>
              <button type="submit" className="text-sm font-medium text-red-500 hover:text-red-600 transition-colors">
                Logout
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <TransactionDashboard 
          userId={session.userId} 
          transactions={transactions} 
          theme={theme}
        />
      </main>
    </div>
  );
}
