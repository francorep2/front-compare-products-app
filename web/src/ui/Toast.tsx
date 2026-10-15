import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { IoAlertCircle, IoCheckmarkCircle, IoInformationCircle } from "react-icons/io5";

type Kind = "success" | "error" | "info";
type ToastItem = { id: number; kind: Kind; text: string };
type Ctx = { toast: (text: string, kind?: Kind) => void };

const ToastCtx = createContext<Ctx>({ toast: () => {} });
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const toast = useCallback((text: string, kind: Kind = "success") => {
    const id = Date.now() + Math.random();
    setItems((l) => [...l.slice(-3), { id, kind, text }]);
    window.setTimeout(() => setItems((l) => l.filter((t) => t.id !== id)), kind === "error" ? 6000 : 3200);
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);
  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`toast ${t.kind}`}>
            {t.kind === "success" ? <IoCheckmarkCircle size={20} /> : t.kind === "error" ? <IoAlertCircle size={20} /> : <IoInformationCircle size={20} />}
            <span>{t.text}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export const errMsg = (e: unknown) => (e instanceof Error ? e.message : "Ocurrió un error. Intentá nuevamente.");
