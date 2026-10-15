import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import * as api from "./api";

type AuthCtx = {
  token: string | null;
  user: api.Me | null;
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
  const [token, setTok] = useState<string | null>(api.getToken());
  const [user, setUser] = useState<api.Me | null>(null);
  const [loading, setLoading] = useState<boolean>(!!api.getToken());

  const signOut = useCallback(() => {
    api.setToken(null);
    setTok(null);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    setUser(await api.me());
  }, []);

  const signIn = useCallback(async (t: string) => {
    api.setToken(t);
    setTok(t);
    setUser(await api.me());
  }, []);

  useEffect(() => {
    api.setUnauthorizedHandler(signOut);
    return () => api.setUnauthorizedHandler(null);
  }, [signOut]);

  // Al abrir la web con un token guardado, lo validamos.
  useEffect(() => {
    if (!api.getToken()) return;
    api.me().then(setUser).catch(() => signOut()).finally(() => setLoading(false));
  }, [signOut]);

  const value = useMemo(() => ({ token, user, loading, signIn, signOut, refreshUser }), [token, user, loading, signIn, signOut, refreshUser]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
