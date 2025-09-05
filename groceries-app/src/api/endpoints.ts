import { request } from "./clients";
import type { LoginStartIn, MeOut, TokenOut } from "./types";

// AUTH
export const login = (payload: LoginStartIn) =>
  request<TokenOut>("/auth/login", { method: "POST", body: JSON.stringify(payload) });

export const me = () => request<MeOut>("/auth/me");
