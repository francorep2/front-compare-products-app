import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { getToken, setToken } from "../api/clients";
import { apiLogin, me } from "../api/endpoints";
import type { MeOut } from "../api/types";

type AuthContextType = {
  user: MeOut | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithToken: (token: string) => Promise<void>;
  logout: () => Promise<void>;
  showDisclaimerOnLoad: boolean;
  clearDisclaimerFlag: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MeOut | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showDisclaimerOnLoad, setShowDisclaimerOnLoad] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        if (token) {
          const data = await me();
          setUser(data);
        }
      } catch (e) {
        // --- AQUÍ ESTÁ LA CORRECCIÓN ---
        // Si el token es inválido o expiró, limpiamos la sesión completa.
        console.log("Token inválido o expirado. Limpiando sesión...");
        await setToken(null);
        setUser(null); // <-- Se establece explícitamente el usuario a null
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = async (email: string, password: string) => {
    const { access_token } = await apiLogin({ email, password });
    await setToken(access_token);
    const data = await me();
    setUser(data);
    setShowDisclaimerOnLoad(true); 
  };
  
  const loginWithToken = async (token: string) => {
    await setToken(token);
    const data = await me();
    setUser(data);
    setShowDisclaimerOnLoad(true);
  };

  const logout = async () => {
    await setToken(null);
    setUser(null);
  };

  const clearDisclaimerFlag = () => {
    setShowDisclaimerOnLoad(false);
  };

  return (
    <AuthContext.Provider 
      value={{ user, isLoading, login, loginWithToken, logout, showDisclaimerOnLoad, clearDisclaimerFlag }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};