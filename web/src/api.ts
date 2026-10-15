// Cliente del backend (mismos endpoints que groceries-app/src/api/endpoints.ts)
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

const post = <T,>(path: string, body?: unknown, opts?: { auth?: boolean }) =>
  request<T>(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) }, opts);

// ---------- tipos ----------
export type Me = { id: number; email: string; is_verified: boolean; first_name?: string | null; last_name?: string | null };
export type ShoppingList = { id: number; nombre: string; created_at: string };
export type ShoppingItem = { id: number; list_id: number; nombre: string; cantidad: string; done: boolean; created_at: string };
export type ListDetail = ShoppingList & { items: ShoppingItem[] };
export type StoreItem = { title: string; price: string; url: string; image_url?: string | null; barcode?: string | null; promotion?: string | null };
export type SearchResults = Record<string, StoreItem[]>;
export type Sources = { coto: boolean; carrefour: boolean; dia: boolean; jumbo: boolean };
export type StoreSummary = { total: number; missing_count: number; missing_items: string[] };
export type Comparison = {
  status: "processing" | "completed";
  data: null | { totals_by_store: Record<string, StoreSummary>; winner: string | null; updated_at: string };
};

export const STORES = ["coto", "carrefour", "jumbo", "dia"] as const;
export type Store = (typeof STORES)[number];

// ---------- auth ----------
export const login = (email: string, password: string) =>
  post<{ access_token: string }>("/auth/login", { email, password }, { auth: false });
export const me = () => request<Me>("/auth/me");
export const registerStart = (p: { first_name: string; last_name: string; email: string; password: string }) =>
  post<{ challenge_id: string; message: string }>("/auth/register/start", p, { auth: false });
export const registerVerify = (challenge_id: string, code: string) =>
  post<{ access_token: string }>("/auth/register/verify", { challenge_id, code }, { auth: false });
export const registerResend = (challenge_id: string) =>
  post<{ message: string }>(`/auth/register/resend?challenge_id=${encodeURIComponent(challenge_id)}`, undefined, { auth: false });
export const resetStart = (email: string) =>
  post<{ challenge_id: string; message: string }>("/auth/password/reset/start", { email }, { auth: false });
export const resetVerify = (challenge_id: string, code: string) =>
  post<{ reset_token: string }>("/auth/password/reset/verify", { challenge_id, code }, { auth: false });
export const resetConfirm = (reset_token: string, new_password: string) =>
  post<{ message: string }>("/auth/password/reset/confirm", { reset_token, new_password }, { auth: false });
export const updateMe = (p: Partial<{ email: string; password: string; first_name: string; last_name: string }>) =>
  request<Me>("/user/me", { method: "PUT", body: JSON.stringify(p) });
export const sendSupport = (message: string) => post<{ detail?: string }>("/support/tickets", { message });

// ---------- listas ----------
export const getLists = () => request<ShoppingList[]>("/shopping/lists");
export const createList = (nombre: string) => post<ShoppingList>("/shopping/lists", { nombre });
export const getList = (id: number) => request<ListDetail>(`/shopping/lists/${id}`);
export const renameList = (id: number, nombre: string) =>
  request<ShoppingList>(`/shopping/${id}`, { method: "PUT", body: JSON.stringify({ nombre }) });
export const deleteList = (id: number) => request<void>(`/shopping/lists/${id}`, { method: "DELETE" });
export const addItem = (listId: number, nombre: string, cantidad: string) =>
  post<ShoppingItem>(`/shopping/lists/${listId}/items`, { nombre, cantidad });
export const updateItem = (id: number, p: Partial<{ nombre: string; cantidad: string; done: boolean }>) =>
  request<ShoppingItem>(`/shopping/items/${id}`, { method: "PATCH", body: JSON.stringify(p) });
export const deleteItem = (id: number) => request<void>(`/shopping/items/${id}`, { method: "DELETE" });

// ---------- búsqueda ----------
const enabledQs = (enabled: string[]) => enabled.map((s) => `enabled=${encodeURIComponent(s)}`).join("&");
export const searchAll = async (q: string, enabled: string[], limit = 3): Promise<SearchResults> =>
  (await request<{ results: SearchResults }>(`/search/all?q=${encodeURIComponent(q)}&limit=${limit}&${enabledQs(enabled)}`)).results;
export const searchBarcode = async (barcode: string, enabled: string[], limit = 3): Promise<SearchResults> =>
  (await request<{ results: SearchResults }>(`/search/barcode/all?barcode=${encodeURIComponent(barcode)}&limit=${limit}&${enabledQs(enabled)}`)).results;

type ApiPrefs = { include_coto: boolean; include_carrefour: boolean; include_dia: boolean; include_jumbo: boolean };
const fromPrefs = (p: ApiPrefs): Sources => ({ coto: p.include_coto, carrefour: p.include_carrefour, dia: p.include_dia, jumbo: p.include_jumbo });
export const getSources = async () => fromPrefs(await request<ApiPrefs>("/search/config"));
export const setSources = async (s: Sources) =>
  fromPrefs(await request<ApiPrefs>("/search/config", {
    method: "PUT",
    body: JSON.stringify({ include_coto: s.coto, include_carrefour: s.carrefour, include_dia: s.dia, include_jumbo: s.jumbo }),
  }));
export const enabledOf = (s: Sources): string[] => STORES.filter((k) => s[k]);

// ---------- comparación ----------
export const startComparison = (items: { nombre: string; cantidad: number }[], enabled: string[]) =>
  post<{ task_id: string }>("/compare/start", { items, enabled });
export const getComparison = (taskId: string) => request<Comparison>(`/compare/results/${encodeURIComponent(taskId)}`);

// ---------- helpers ----------
export const priceNumber = (p: string) => Number(String(p).replace("ARS", "").trim());
export const money = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);
