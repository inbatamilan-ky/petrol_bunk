import AsyncStorage from '@react-native-async-storage/async-storage';
import { logError } from '../services/errorLogger';

// FastAPI backend
const BASE_URL = 'http://localhost:8000';

export const SESSION_MAX_AGE_MS = 50 * 60 * 1000; // 50 minutes session timeout

export function getSyncAuthSession(): { user: any; token: string; remainingMs: number } | null {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const token = window.localStorage.getItem('access_token');
      const userJson = window.localStorage.getItem('auth_user');
      const loginTimeStr = window.localStorage.getItem('session_login_time');

      if (!token || !userJson || !loginTimeStr) return null;

      const loginTime = parseInt(loginTimeStr, 10);
      const now = Date.now();
      const elapsed = now - loginTime;

      if (isNaN(loginTime) || elapsed > SESSION_MAX_AGE_MS) {
        window.localStorage.removeItem('access_token');
        window.localStorage.removeItem('auth_user');
        window.localStorage.removeItem('session_login_time');
        return null;
      }

      return {
        token,
        user: JSON.parse(userJson),
        remainingMs: Math.max(0, SESSION_MAX_AGE_MS - elapsed),
      };
    } catch {
      return null;
    }
  }
  return null;
}

export async function getToken(): Promise<string | null> {
  if (typeof window !== 'undefined' && window.localStorage) {
    const t = window.localStorage.getItem('access_token');
    if (t) return t;
  }
  return await AsyncStorage.getItem('access_token');
}

export async function setToken(token: string): Promise<void> {
  const tokenStr = token || '';
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem('access_token', tokenStr);
  }
  await AsyncStorage.setItem('access_token', tokenStr);
}


export async function clearToken(): Promise<void> {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.removeItem('access_token');
      window.localStorage.removeItem('auth_user');
      window.localStorage.removeItem('session_login_time');
      window.localStorage.removeItem('has_selected_bunk');
    } catch {}
  }
  await AsyncStorage.removeItem('access_token');
  await AsyncStorage.removeItem('auth_user');
  await AsyncStorage.removeItem('session_login_time');
  await AsyncStorage.removeItem('has_selected_bunk');
}

export function getSyncSelectedBunk(): boolean {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      return window.localStorage.getItem('has_selected_bunk') === 'true';
    } catch {
      return false;
    }
  }
  return false;
}

export async function getStoredSelectedBunk(): Promise<boolean> {
  if (typeof window !== 'undefined' && window.localStorage) {
    const val = window.localStorage.getItem('has_selected_bunk');
    if (val !== null) return val === 'true';
  }
  const stored = await AsyncStorage.getItem('has_selected_bunk');
  return stored === 'true';
}

export async function setStoredSelectedBunk(selected: boolean): Promise<void> {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      if (selected) {
        window.localStorage.setItem('has_selected_bunk', 'true');
      } else {
        window.localStorage.removeItem('has_selected_bunk');
      }
    } catch {}
  }
  if (selected) {
    await AsyncStorage.setItem('has_selected_bunk', 'true');
  } else {
    await AsyncStorage.removeItem('has_selected_bunk');
  }
}

export async function saveAuthSession(user: any, token: string): Promise<void> {
  const tokenStr = token || '';
  const userStr = user != null ? JSON.stringify(user) : '{}';
  const loginTimeStr = String(Date.now());

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem('access_token', tokenStr);
      window.localStorage.setItem('auth_user', userStr);
      window.localStorage.setItem('session_login_time', loginTimeStr);
    } catch {}
  }
  await AsyncStorage.setItem('access_token', tokenStr);
  await AsyncStorage.setItem('auth_user', userStr);
  await AsyncStorage.setItem('session_login_time', loginTimeStr);
}


export async function getAuthSession(): Promise<{ user: any; token: string; remainingMs: number } | null> {
  const syncSess = getSyncAuthSession();
  if (syncSess) return syncSess;

  const token = await AsyncStorage.getItem('access_token');
  const userJson = await AsyncStorage.getItem('auth_user');
  const loginTimeStr = await AsyncStorage.getItem('session_login_time');

  if (!token || !userJson || !loginTimeStr) return null;

  const loginTime = parseInt(loginTimeStr, 10);
  const now = Date.now();
  const elapsed = now - loginTime;

  if (isNaN(loginTime) || elapsed > SESSION_MAX_AGE_MS) {
    // Session has expired after 50 minutes
    await clearToken();
    return null;
  }

  try {
    return {
      token,
      user: JSON.parse(userJson),
      remainingMs: Math.max(0, SESSION_MAX_AGE_MS - elapsed),
    };
  } catch {
    return null;
  }
}

export async function getActiveBranch(): Promise<string | null> {
  if (typeof window !== 'undefined' && window.localStorage) {
    const b = window.localStorage.getItem('active_branch_id');
    if (b) return b;
  }
  return await AsyncStorage.getItem('active_branch_id');
}

export async function setActiveBranch(branchId: string): Promise<void> {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem('active_branch_id', branchId);
  }
  await AsyncStorage.setItem('active_branch_id', branchId);
}

export async function clearActiveBranch(): Promise<void> {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.removeItem('active_branch_id');
  }
  await AsyncStorage.removeItem('active_branch_id');
}

export async function apiFetch(
  path: string,
  options: RequestInit = {}
): Promise<any> {
  const token = await getToken();
  let branchId = await getActiveBranch();
  if (!branchId) {
    branchId = 'B-01'; // Default fallback until UI is built
  }

  let originalPath = path;
  if (path === '/api/bunk-profile') {
    path = '/api/branches';
  }

  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(branchId ? { 'X-Branch-ID': branchId } : {}),
        ...(options.headers || {}),
      },
    });

    if (res.status === 404 && path.startsWith('/api/cash-reconciliation')) {
      return null;
    }

    if (!res.ok) {
      const body = await res.text();
      const err = new Error(`API ${res.status}: ${body}`);
      logError(`API ${options.method || 'GET'} ${path}`, err, { status: res.status, body });
      throw err;
    }


    if (res.status === 204) {
      return null;
    }

    const data = await res.json();
    
    // Hack to unbreak the UI since BunkProfile expects an object but branches returns array
    if (originalPath === '/api/bunk-profile' && Array.isArray(data)) {
      const b = data.find((x: any) => x.id === branchId) || data[0];
      if (b) {
        return {
          id: b.id,
          bunk_name: b.name,
          omc_brand: b.omc_brand,
          dealer_code: b.dealer_code,
          state: 'Unknown',
          city: b.location || 'Unknown',
          auto_fetch_enabled: false,
          auto_apply_enabled: false
        };
      }
      return null;
    }
    
    return data;
  } catch (err: any) {
    if (!err?.message?.startsWith('API ')) {
      logError(`API Network ${options.method || 'GET'} ${path}`, err);
    }
    throw err;
  }
}