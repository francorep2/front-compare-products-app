import { createContext, useContext, useEffect, useState } from "react";
import { getToken, setToken } from "../api/clients";
import { login as loginFn, me as meFn } from "../api/endpoints";
import { TokenOut } from "../api/types";

type User = { id: number; email: string; name?: string } | null;

type Ctx = {
  user: User;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
};

const Ctx = createContext<Ctx>({
  user: null,
  login: async () => {},
  logout: async () => {},
  loading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const t = await getToken();
        if (t) {
          const me = await meFn(); // requiere Authorization: Bearer <token> desde request()
          setUser({ id: me.id, email: me.email, name: (me as any).name }); // opcional
        } else {
          setUser(null);
        }
      } catch {
        await setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const tok: TokenOut = await loginFn({ email, password }); // debe devolver access_token (y opcional refresh_token)
      // Guarda SOLO el access_token que tu request() usa en Authorization
      await setToken(tok.access_token);
      const profile = await meFn();
      setUser({ id: profile.id, email: profile.email });
    } catch (e: any) {
      await setToken(null);
      setUser(null);
      throw new Error(e?.message ?? "No se pudo iniciar sesión");
    }
  };

  const logout = async () => {
    await setToken(null);
    setUser(null);
  };

  return (
    <Ctx.Provider value={{ user, login, logout, loading }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
