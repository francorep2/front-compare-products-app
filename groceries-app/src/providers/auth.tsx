import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { getToken, setToken } from "../api/clients";
import { apiLogin, me } from "../api/endpoints";
import type { MeOut } from "../api/types";

// 1. AÑADIMOS LAS PROPIEDADES DEL MODAL AL TIPO
type AuthContextType = {
  user: MeOut | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  showDisclaimerOnLoad: boolean;
  clearDisclaimerFlag: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MeOut | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // 2. AÑADIMOS EL ESTADO PARA EL MODAL
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
        await setToken(null);
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
    // 3. ACTIVAMOS LA BANDERA AL INICIAR SESIÓN
    setShowDisclaimerOnLoad(true); 
  };

  const logout = async () => {
    await setToken(null);
    setUser(null);
  };

  // 4. CREAMOS UNA FUNCIÓN PARA LIMPIAR LA BANDERA
  const clearDisclaimerFlag = () => {
    setShowDisclaimerOnLoad(false);
  };

  return (
    <AuthContext.Provider 
      // 5. EXPONEMOS LOS NUEVOS VALORES EN EL CONTEXTO
      value={{ user, isLoading, login, logout, showDisclaimerOnLoad, clearDisclaimerFlag }}
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