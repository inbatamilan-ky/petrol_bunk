import AsyncStorage from '@react-native-async-storage/async-storage';

// FastAPI backend
const BASE_URL = 'http://localhost:8000';

export async function getToken(): Promise<string | null> {
  return await AsyncStorage.getItem('access_token');
}

export async function setToken(token: string): Promise<void> {
  await AsyncStorage.setItem('access_token', token);
}

export async function clearToken(): Promise<void> {
  await AsyncStorage.removeItem('access_token');
}

export async function apiFetch(
  path: string,
  options: RequestInit = {}
): Promise<any> {
  const token = await getToken();

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body}`);
  }

  if (res.status === 204) {
    return null;
  }

  return res.json();
}