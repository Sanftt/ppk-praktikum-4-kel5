import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';

export default async function Home() {
  const session = await getSession();

  // Jika sudah login, langsung ke dashboard
  if (session) {
    redirect('/dashboard');
  }

  // Jika belum login, langsung ke halaman login (membuang UI landing page)
  redirect('/login');
}
