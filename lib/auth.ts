import { jwtVerify, SignJWT } from 'jose';
import { cookies } from 'next/headers';

const secretKey = 'super-secret-key-untuk-praktikum-ini-saja';
const key = new TextEncoder().encode(secretKey);

export async function encrypt(payload: any) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1d') // Sesi berlaku 1 hari
    .sign(key);
}

export async function decrypt(input: string): Promise<any> {
  const { payload } = await jwtVerify(input, key, {
    algorithms: ['HS256'],
  });
  return payload;
}

export async function setSessionCookie(userId: string, username: string) {
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 hari
  const session = await encrypt({ userId, username, expires });

  const cookieStore = await cookies();
  cookieStore.set('session', session, {
    expires,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });
}

export async function getSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get('session')?.value;
  if (!session) return null;
  try {
    return await decrypt(session);
  } catch (error) {
    return null;
  }
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete('session');
}

// Fitur tambahan: Cookie untuk menyimpan preferensi pengguna (contoh: tema)
export async function setThemePreference(theme: 'light' | 'dark') {
  const cookieStore = await cookies();
  cookieStore.set('theme', theme, { maxAge: 60 * 60 * 24 * 365, path: '/' });
}
