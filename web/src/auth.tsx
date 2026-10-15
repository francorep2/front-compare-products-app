import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import * as client from "./api/client";
import * as api from "./api/endpoints";
import type { Me } from "./api/types";

type AuthCtx = {
  token: string | null;
  user: Me | null;
  loading: boolean;
  signIn: (token: string) => Promise<void>;
  signOut: () => void;
  refreshUser: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);
export const useAuth = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth fuera de AuthProvider");
  return v;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [token, setTok] = useState<string | null>(client.getToken());
  const [user, setUser] = useState<Me | null>(null);
  const [loading, setLoading] = useState<boolean>(!!client.getToken());

  const signOut = useCallback(() => {
    client.setToken(null);
    setTok(null);
    setUser(null);
    qc.clear(); // no dejar datos del usuario anterior en memoria
  }, [qc]);

  const refreshUser = useCallback(async () => {
    setUser(await api.me());
  }, []);

  const signIn = useCallback(async (t: string) => {
    client.setToken(t);
    const u = await api.me(); // primero el usuario, así Home nunca se ve "vacío"
    setUser(u);
    setTok(t);
  }, []);

  useEffect(() => {
    client.setUnauthorizedHandler(signOut);
    return () => client.setUnauthorizedHandler(null);
  }, [signOut]);

  // Al abrir la web con un token guardado, lo validamos.
  useEffect(() => {
    if (!client.getToken()) return;
    api.me().then(setUser).catch(() => signOut()).finally(() => setLoading(false));
  }, [signOut]);

  const value = useMemo(() => ({ token, user, loading, signIn, signOut, refreshUser }), [token, user, loading, signIn, signOut, refreshUser]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
