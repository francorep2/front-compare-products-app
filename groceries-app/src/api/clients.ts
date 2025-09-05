import * as SecureStore from "expo-secure-store";

// Expo expone EXPO_PUBLIC_* en process.env en runtime
const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  "http://10.0.2.2:8000"; // fallback útil en emulador

export class ApiError<T = unknown> extends Error {
  status: number;
  data?: T;
  constructor(message: string, status: number, data?: T) {
    super(message); this.status = status; this.data = data;
  }
}

export async function getToken() {
  return (await SecureStore.getItemAsync("access_token")) || null;
}
export async function setToken(t: string | null) {
  if (!t) return SecureStore.deleteItemAsync("access_token");
  return SecureStore.setItemAsync("access_token", t);
}

export async function request<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const token = await getToken();
  const headers: HeadersInit = {
    "Content-Type": init.body instanceof FormData ? (undefined as any) : "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(init.headers || {}),
  };
  const res = await fetch(`${BASE_URL}${path}`, { ...init, headers });
  const isJson = res.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await res.json().catch(() => undefined) : undefined;
  if (!res.ok) throw new ApiError(data?.message || res.statusText || "Request failed", res.status, data);
  return data as T;
}
