const raw = ((import.meta.env.VITE_API_URL as string | undefined) || "https://groceries-api-60pi.onrender.com").trim();
export const BASE_URL = (/^https?:\/\//i.test(raw) ? raw : `https://${raw}`).replace(/\/+$/, "");

const TOKEN_KEY = "changuito_token";
export const getToken = () => {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
};
export const setToken = (t: string | null) => {
  try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch { /* sin storage */ }
};

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

// Avisa a la app cuando el token ya no sirve (401) para volver al login.
let onUnauthorized: (() => void) | null = null;
export const setUnauthorizedHandler = (fn: (() => void) | null) => { onUnauthorized = fn; };

function errorText(data: any, status: number): string {
  const d = data?.detail ?? data?.message;
  if (typeof d === "string") return d;
  if (Array.isArray(d)) return d.map((x) => x?.msg).filter(Boolean).join(". ") || `Error ${status}`;
  return `Error ${status}`;
}

export async function request<T>(path: string, init: RequestInit = {}, opts: { auth?: boolean } = {}): Promise<T> {
  const token = getToken();
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init.headers || {}),
      },
    });
  } catch {
    throw new ApiError("No se pudo conectar con el servidor. Si recién despertó, esperá un minuto y reintentá.", 0);
  }
  const isJson = res.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await res.json().catch(() => undefined) : undefined;
  if (!res.ok) {
    if (res.status === 401 && opts.auth !== false) onUnauthorized?.();
    throw new ApiError(errorText(data, res.status), res.status);
  }
  return data as T;
}

export const post = <T,>(path: string, body?: unknown, opts?: { auth?: boolean }) =>
  request<T>(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) }, opts);
export const put = <T,>(path: string, body?: unknown) => request<T>(path, { method: "PUT", body: JSON.stringify(body) });
export const patch = <T,>(path: string, body?: unknown) => request<T>(path, { method: "PATCH", body: JSON.stringify(body) });
export const del = <T,>(path: string) => request<T>(path, { method: "DELETE" });
