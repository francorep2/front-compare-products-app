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
  ShoppingItemCreateIn,
  ShoppingItemOut,
  ShoppingItemUpdateIn,
  ShoppingListCreateIn,
  ShoppingListDetail,
  ShoppingListOut,
  ShoppingListRenameIn,
  TokenOut,
  UpdateMeIn,
} from "./types";

// ---------- AUTH ----------
export const login = (payload: LoginStartIn) =>
  request<TokenOut>("/auth/login", { method: "POST", body: JSON.stringify(payload) });

export const me = () => request<MeOut>("/auth/me");

// ---------- REGISTER (con OTP) ----------
export const registerStart = (payload: RegisterStartIn) =>
  request<RegisterStartOut>("/auth/register/start", { method: "POST", body: JSON.stringify(payload) });

export const registerVerify = (payload: RegisterVerifyIn) =>
  request<TokenOut>("/auth/register/verify", { method: "POST", body: JSON.stringify(payload) });

// FastAPI recibe `challenge_id` como query param en estos endpoints:
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
// USER
export const updateMe = (payload: UpdateMeIn) =>
  request<MeOut>("/user/me", {
    method: "PUT",             // PATCH para actualizar parcialmente
    body: JSON.stringify(payload),
  });

  // -------- SHOPPING: LISTS --------
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

// -------- SHOPPING: ITEMS --------
export const listItems = (listId: number) =>
  request<ShoppingItemOut[]>(`/shopping/lists/${listId}/items`);

export const addItem = (listId: number, payload: ShoppingItemCreateIn) =>
  request<ShoppingItemOut>(`/shopping/lists/${listId}/items`, { method: "POST", body: JSON.stringify(payload) });

export const updateItem = (itemId: number, payload: ShoppingItemUpdateIn) => {
  console.log("PATCH /shopping/items/"+itemId, payload); // debería mostrar { done: false } cuando destildás
  return request<ShoppingItemOut>(`/shopping/items/${itemId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
};


export const deleteItem = (itemId: number) =>
  request<void>(`/shopping/items/${itemId}`, { method: "DELETE" });