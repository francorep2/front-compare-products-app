// src/api/clients.ts
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";


function resolveBaseUrl() {
  const fromExpoConfig = (Constants?.expoConfig as any)?.extra?.EXPO_PUBLIC_API_URL;
  const fromManifest = (Constants as any)?.manifest?.extra?.EXPO_PUBLIC_API_URL;
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;

  const raw = (fromExpoConfig || fromManifest || fromEnv || "").trim();
  const withProtocol = raw && !/^https?:\/\//i.test(raw) ? `https://${raw}` : raw;
  return (withProtocol || "").replace(/\/+$/, "");
}

export const BASE_URL = resolveBaseUrl();

if (!BASE_URL) {
  console.warn("⚠️ BASE_URL vacío. Configurá EXPO_PUBLIC_API_URL en app.config.js o .env");
  console.log("URL:" ,BASE_URL)
} else {
  console.log("🌐 BASE_URL =", BASE_URL);
}

const TOKEN_KEY = "access_token";
let memoryToken: string | null = null;

export async function getToken() {
  if (memoryToken != null) return memoryToken;
  memoryToken = (await SecureStore.getItemAsync(TOKEN_KEY)) || null;
  return memoryToken;
}

export async function setToken(t: string | null) {
  memoryToken = t;
  if (!t) return SecureStore.deleteItemAsync(TOKEN_KEY);
  return SecureStore.setItemAsync(TOKEN_KEY, t);
}

export class ApiError<T = unknown> extends Error {
  status: number;
  data?: T;
  constructor(message: string, status: number, data?: T) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

// 3) Request con armado de URL seguro y logs
export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!BASE_URL) {
    throw new Error("BASE_URL no configurada");
  }

  const token = await getToken();
  const safePath = path.startsWith("/") ? path : `/${path}`;
  const url = `${BASE_URL}${safePath}`;

  const headers: HeadersInit = {
    ...(init.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(init.headers || {}),
  };

  // LOGS ÚTILES
  console.log("➡️ fetch", init.method || "GET", url);

  let res: Response;
  try {
    res = await fetch(url, { ...init, headers });
  } catch (netErr: any) {
    console.error("❌ Error de Conexión:", netErr?.message || netErr);
    throw new Error("No se pudo conectar al servidor. Verificá IP/puerto/firewall.");
  }

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await res.json().catch(() => undefined) : undefined;

  if (!res.ok) {
    const msg = (data as any)?.message || `${res.status} ${res.statusText}`;
    throw new ApiError(msg, res.status, data);
  }
  return data as T;
}
