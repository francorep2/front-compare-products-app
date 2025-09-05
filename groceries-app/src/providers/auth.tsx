import { createContext, useContext, useEffect, useState } from "react";
import { getToken, setToken } from "../api/clients";
import { login as loginFn, me as meFn } from "../api/endpoints";

type User = { id: number; email: string } | null;
type Ctx = { user: User; login: (email: string, password: string) => Promise<void>; logout: () => Promise<void>; loading: boolean };

const Ctx = createContext<Ctx>({ user: null, login: async () => {}, logout: async () => {}, loading: true });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const t = await getToken();
      if (t) {
        try {
          const me = await meFn();
          setUser({ id: me.id, email: me.email });
        } catch { await setToken(null); }
      }
      setLoading(false);
    })();
  }, []);

  const login = async (email: string, password: string) => {
    const tok = await loginFn({ email, password });           // <-- /auth/login
    await setToken(tok.access_token);                         // guarda token
    const me = await meFn();                                  // <-- /auth/me
    setUser({ id: me.id, email: me.email });
  };

  const logout = async () => { await setToken(null); setUser(null); };

  return <Ctx.Provider value={{ user, login, logout, loading }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
