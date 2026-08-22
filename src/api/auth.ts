import { apiFetch, setToken, clearToken } from './client';

export interface AuthUser {
  id: number;
  username: string;
  email?: string;
  full_name?: string;
  role: number; // 1 = Owner, 2 = Manager
  is_active: boolean;
}

export async function login(
  username: string,
  password: string
): Promise<AuthUser> {
  const form = new URLSearchParams();

  form.append('username', username);
  form.append('password', password);

  const res = await fetch('http://localhost:8000/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form.toString(),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Login failed: ${body}`);
  }

  const data = await res.json();

  await setToken(data.access_token);

  return data.user as AuthUser;
}

export async function logout(): Promise<void> {
  await clearToken();
}

export async function getMe(): Promise<AuthUser> {
  return apiFetch('/api/auth/me');
}