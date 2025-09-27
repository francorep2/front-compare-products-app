import { request } from "./clients";
import type {
  // auth
  LoginStartIn, MeOut,
  PasswordResetConfirmIn, PasswordResetResendOut,
  // reset
  PasswordResetStartIn, PasswordResetStartOut,
  PasswordResetVerifyIn,
  RegisterResendOut,
  // register
  RegisterStartIn, RegisterStartOut, RegisterVerifyIn,
  ResetTokenOut,
  ScrapeSources,
  SearchRawResponse,
  ShoppingItemCreateIn,
  ShoppingItemOut,
  ShoppingItemUpdateIn,
  ShoppingListCreateIn,
  ShoppingListDetail,
  ShoppingListOut,
  ShoppingListRenameIn,
  TokenOut,
  UpdateMeIn
} from "./types";

type SearchAllArgs = {
  q?: string;
  barcode?: string;
  limit?: number;
  enabled?: string[] | string; // ej: ["carrefour","coto"] o "carrefour,coto"
  stores?: string;             // compatibilidad legacy CSV
};

// ---------- AUTH ----------
export const login = (payload: LoginStartIn) =>
  request<TokenOut>("/auth/login", { method: "POST", body: JSON.stringify(payload) });

export const me = () => request<MeOut>("/auth/me");

export const apiLogin = (credentials: LoginStartIn): Promise<TokenOut> => {
  return request<TokenOut>("/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
};

export type SubmitSupportTicketIn = { message: string };
export type SubmitSupportTicketOut = { detail: string };
export const submitSupportTicket = (payload: SubmitSupportTicketIn) =>
  request<SubmitSupportTicketOut>("/support/tickets", {
    method: "POST",
    body: JSON.stringify(payload),
  });


// ---------- REGISTER (con OTP) ----------
export const registerStart = (payload: RegisterStartIn) =>
  request<RegisterStartOut>("/auth/register/start", { method: "POST", body: JSON.stringify(payload) });

export const registerVerify = (payload: RegisterVerifyIn) =>
  request<TokenOut>("/auth/register/verify", { method: "POST", body: JSON.stringify(payload) });

export const registerResend = (challenge_id: string) =>
  request<RegisterResendOut>(`/auth/register/resend?challenge_id=${encodeURIComponent(challenge_id)}`, {
    method: "POST",
  });

// ---------- PASSWORD RESET ----------
export const passwordResetStart = (payload: PasswordResetStartIn) =>
  request<PasswordResetStartOut>("/auth/password/reset/start", { method: "POST", body: JSON.stringify(payload) });

export const passwordResetVerify = (payload: PasswordResetVerifyIn) =>
  request<ResetTokenOut>("/auth/password/reset/verify", { method: "POST", body: JSON.stringify(payload) });

export const passwordResetConfirm = (payload: PasswordResetConfirmIn) =>
  request<{ message: string }>("/auth/password/reset/confirm", { method: "POST", body: JSON.stringify(payload) });

export const passwordResetResend = (challenge_id: string) =>
  request<PasswordResetResendOut>(`/auth/password/reset/resend?challenge_id=${encodeURIComponent(challenge_id)}`, {
    method: "POST",
  });

// ---------- USER ----------
export const updateMe = (payload: UpdateMeIn) =>
  request<MeOut>("/user/me", {
    method: "PUT",
    body: JSON.stringify(payload),
  });

// ---------- SHOPPING: LISTS ----------
export const createShoppingList = (payload: ShoppingListCreateIn) =>
  request<ShoppingListOut>("/shopping/lists", { method: "POST", body: JSON.stringify(payload) });

export const getMyLists = () =>
  request<ShoppingListOut[]>("/shopping/lists");

export const getListDetail = (listId: number) =>
  request<ShoppingListDetail>(`/shopping/lists/${listId}`);

export const renameList = (listId: number, payload: ShoppingListRenameIn) =>
  request<ShoppingListOut>(`/shopping/lists/${listId}`, { method: "PATCH", body: JSON.stringify(payload) });

export const deleteList = (listId: number) =>
  request<void>(`/shopping/lists/${listId}`, { method: "DELETE" });

// ---------- SHOPPING: ITEMS ----------
export const listItems = (listId: number) =>
  request<ShoppingItemOut[]>(`/shopping/lists/${listId}/items`);

export const addItem = (listId: number, payload: ShoppingItemCreateIn) =>
  request<ShoppingItemOut>(`/shopping/lists/${listId}/items`, { method: "POST", body: JSON.stringify(payload) });

export const updateItem = (itemId: number, payload: ShoppingItemUpdateIn) => {
  console.log("PATCH /shopping/items/" + itemId, payload);
  return request<ShoppingItemOut>(`/shopping/items/${itemId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
};

export const deleteItem = (itemId: number) =>
  request<void>(`/shopping/items/${itemId}`, { method: "DELETE" });

// ---------- SEARCH / SCRAPER ----------

// Serializa la query manualmente (no se pierden enabled repetidos)
function buildSearchAllQuery(opts: {
  q?: string;
  barcode?: string;
  limit?: number;
  enabled?: string[] | string;
  stores?: string;
}) {
  const parts: string[] = [];
  if (opts.q && opts.q.trim()) parts.push(`q=${encodeURIComponent(opts.q.trim())}`);
  if (opts.barcode && opts.barcode.trim()) parts.push(`barcode=${encodeURIComponent(opts.barcode.trim())}`);
  parts.push(`limit=${encodeURIComponent(String(opts.limit ?? 3))}`);

  let list: string[] = [];
  if (Array.isArray(opts.enabled)) {
    list = opts.enabled.filter(Boolean);
  } else if (typeof opts.enabled === "string" && opts.enabled.trim()) {
    list = opts.enabled.split(",").map(s => s.trim()).filter(Boolean);
  } else if (typeof opts.stores === "string" && opts.stores.trim()) {
    list = opts.stores.split(",").map(s => s.trim()).filter(Boolean);
  }

  if (list.length) {
    parts.push(list.map(s => `enabled=${encodeURIComponent(s)}`).join("&"));
  }
  return parts.join("&");
}

export function searchAll(q: string, limit?: number, enabled?: string[] | string): Promise<SearchRawResponse>;
export function searchAll(opts: SearchAllArgs): Promise<SearchRawResponse>;
export function searchAll(
  arg1: string | SearchAllArgs,
  arg2?: number,
  arg3?: string[] | string
): Promise<SearchRawResponse> {
  let q: string | undefined;
  let barcode: string | undefined;
  let limit = 3;
  let enabled: string[] | string | undefined;
  let stores: string | undefined;

  if (typeof arg1 === "string") {
    q = arg1;
    if (typeof arg2 === "number") limit = arg2;
    enabled = arg3;
  } else {
    q = arg1?.q;
    barcode = arg1?.barcode;
    if (typeof arg1?.limit === "number") limit = arg1.limit;
    enabled = arg1?.enabled;
    stores = arg1?.stores;
  }

  const qs = buildSearchAllQuery({ q, barcode, limit, enabled, stores });
  const url = `/search/all?${qs}`;
  // console.log("[GET]", url);
  return request<SearchRawResponse>(url);
}

export function searchAllBarcode(barcode: string, limit = 3, enabled?: string[] | string) {
  const qs = buildSearchAllQuery({ barcode, limit, enabled });
  const url = `/search/barcode/all?${qs}`;
  return request<SearchRawResponse>(url);
}

// ---------- SCRAPER CONFIG ----------
type BackendScrapeSources = {
  include_carrefour: boolean;
  include_coto: boolean;
  include_jumbo: boolean;
  include_dia: boolean;
};

export const getScrapeSources = async (): Promise<ScrapeSources> => {
  const data = await request<BackendScrapeSources>("/search/config");
  return {
    carrefour: data.include_carrefour,
    coto: data.include_coto,
    jumbo: data.include_jumbo,
    dia: data.include_dia,
  };
};

export const setScrapeSources = async (payload: ScrapeSources): Promise<ScrapeSources> => {
  const body: BackendScrapeSources = {
    include_carrefour: payload.carrefour,
    include_coto: payload.coto,
    include_jumbo: payload.jumbo,
    include_dia: payload.dia,
  };

  let res: BackendScrapeSources;
  try {
    res = await request<BackendScrapeSources>("/search/config", {
      method: "PUT",
      body: JSON.stringify(body),
    });
  } catch (e: any) {
    if (e?.status === 405) {
      res = await request<BackendScrapeSources>("/search/config", {
        method: "PATCH",
        body: JSON.stringify(body),
      });
    } else {
      throw e;
    }
  }

  return {
    carrefour: res.include_carrefour,
    coto: res.include_coto,
    jumbo: res.include_jumbo,
    dia: res.include_dia,
  };
};

// ---- helpers de selección de tiendas ----
export type StoreKey = "carrefour" | "coto" | "jumbo" | "dia";

/** Convierte {carrefour:true, coto:false,...} en ["carrefour",...] */
export const sourcesToEnabled = (s: ScrapeSources): StoreKey[] => {
  const order: StoreKey[] = ["carrefour", "coto", "jumbo", "dia"];
  return order.filter(k => s[k]);
};

/** Azúcar: llama a searchAll usando enabled derivado de sources */
export function searchAllWithSources(opts: {
  q?: string;
  barcode?: string;
  limit?: number;
  sources: ScrapeSources;
}) {
  const enabled = sourcesToEnabled(opts.sources);
  return searchAll({ q: opts.q, barcode: opts.barcode, limit: opts.limit, enabled });
}
