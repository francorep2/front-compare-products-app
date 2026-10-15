import { del, patch, post, put, request } from "./client";
import {
  STORES,
  type CompareItemIn, type ComparisonTask, type HistoryEntry, type ListDetail, type Me, type SearchResults,
  type ShoppingItem, type ShoppingList, type Sources, type Store,
} from "./types";

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
  put<Me>("/user/me", p);
export const sendSupport = (message: string) => post<{ detail?: string }>("/support/tickets", { message });

// ---------- listas ----------
export const getLists = () => request<ShoppingList[]>("/shopping/lists");
export const createList = (nombre: string) => post<ShoppingList>("/shopping/lists", { nombre });
export const getList = (id: number) => request<ListDetail>(`/shopping/lists/${id}`);
export const renameList = (id: number, nombre: string) => put<ShoppingList>(`/shopping/${id}`, { nombre });
export const deleteList = (id: number) => del<void>(`/shopping/lists/${id}`);
export const addItem = (listId: number, nombre: string, cantidad: string) =>
  post<ShoppingItem>(`/shopping/lists/${listId}/items`, { nombre, cantidad });
export const updateItem = (id: number, p: Partial<{ nombre: string; cantidad: string; done: boolean }>) =>
  patch<ShoppingItem>(`/shopping/items/${id}`, p);
export const deleteItem = (id: number) => del<void>(`/shopping/items/${id}`);

// ---------- búsqueda ----------
const enabledQs = (enabled: string[]) => enabled.map((s) => `enabled=${encodeURIComponent(s)}`).join("&");
export const searchAll = async (q: string, enabled: string[], limit = 5): Promise<SearchResults> =>
  (await request<{ results: SearchResults }>(`/search/all?q=${encodeURIComponent(q)}&limit=${limit}&${enabledQs(enabled)}`)).results;
export const searchBarcode = async (barcode: string, enabled: string[], limit = 3): Promise<SearchResults> =>
  (await request<{ results: SearchResults }>(`/search/barcode/all?barcode=${encodeURIComponent(barcode)}&limit=${limit}&${enabledQs(enabled)}`)).results;

type ApiPrefs = { include_coto: boolean; include_carrefour: boolean; include_dia: boolean; include_jumbo: boolean };
const fromPrefs = (p: ApiPrefs): Sources => ({ coto: p.include_coto, carrefour: p.include_carrefour, dia: p.include_dia, jumbo: p.include_jumbo });
export const getSources = async () => fromPrefs(await request<ApiPrefs>("/search/config"));
export const setSources = async (s: Sources) =>
  fromPrefs(await put<ApiPrefs>("/search/config", { include_coto: s.coto, include_carrefour: s.carrefour, include_dia: s.dia, include_jumbo: s.jumbo }));
export const enabledOf = (s: Sources): Store[] => STORES.filter((k) => s[k]);
export const ALL_SOURCES: Sources = { coto: true, carrefour: true, jumbo: true, dia: true };

// ---------- comparación ----------
export const startComparison = (items: CompareItemIn[], enabled: string[], extra: { list_id?: number; title?: string } = {}) =>
  post<{ task_id: string }>("/compare/start", { items, enabled, ...extra });
export const getComparison = (taskId: string) => request<ComparisonTask>(`/compare/results/${encodeURIComponent(taskId)}`);
export const getHistory = (limit = 50) => request<HistoryEntry[]>(`/compare/history?limit=${limit}`);
export const deleteComparison = (taskId: string) => del<void>(`/compare/${encodeURIComponent(taskId)}`);
