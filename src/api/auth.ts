import { apiFetch, setToken, clearToken, saveAuthSession } from './client';

export interface AuthUser {
  id: number;
  username: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  dob?: string;
  employment_status: number; // 0 = Unemployed, 1 = Employed
  role: number; // 1 = Owner, 2 = Manager
  is_active: boolean;
}

/** Returns 1-2 uppercase initials for display in profile avatars.
 *  Priority: first_name + last_name → first_name only → username[0] */
export function getInitials(user: AuthUser | null): string {
  if (!user) return '?';
  const f = user.first_name?.trim();
  const l = user.last_name?.trim();
  if (f && l) return `${f[0]}${l[0]}`.toUpperCase();
  if (f)      return f[0].toUpperCase();
  return user.username[0].toUpperCase();
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
    let errorMsg = 'Login failed';
    try {
      const errObj = await res.json();
      errorMsg = errObj.detail || errObj.message || 'Incorrect username or password';
    } catch {
      const text = await res.text();
      errorMsg = text || 'Login failed. Please check credentials.';
    }
    throw new Error(errorMsg);
  }

  const data = await res.json();

  await saveAuthSession(data.user, data.access_token);

  return data.user as AuthUser;
}

export async function logout(): Promise<void> {
  await clearToken();
}

export async function getMe(): Promise<AuthUser> {
  return apiFetch('/api/auth/me');
}

export async function changePassword(oldPassword: string, newPassword: string): Promise<{ status: string; message: string }> {
  return apiFetch('/api/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
  });
}

export async function forgotPassword(username: string): Promise<{ status: string; message: string; token: string | null }> {
  const res = await fetch('http://localhost:8000/api/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Request failed');
  return data;
}

export async function resetPassword(token: string, newPassword: string): Promise<{ status: string; message: string }> {
  const res = await fetch('http://localhost:8000/api/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, new_password: newPassword }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Reset failed');
  return data;
}