import { useState, type InputHTMLAttributes, type ReactNode } from "react";
import { IoAlertCircleOutline, IoEyeOffOutline, IoEyeOutline } from "react-icons/io5";

/** Campo con ícono, igual que los inputs de la app (borde redondeado, ícono rojo). */
export function Field({
  icon,
  invalid,
  password,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { icon?: ReactNode; invalid?: boolean; password?: boolean }) {
  const [show, setShow] = useState(false);
  return (
    <label className={`field${invalid ? " invalid" : ""}`}>
      {icon}
      <input {...props} type={password ? (show ? "text" : "password") : props.type} />
      {password && (
        <button type="button" className="eye" onClick={() => setShow((s) => !s)} aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}>
          {show ? <IoEyeOffOutline size={20} /> : <IoEyeOutline size={20} />}
        </button>
      )}
    </label>
  );
}

export function ErrorBox({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <div className="alert" role="alert">
      <IoAlertCircleOutline size={20} />
      <span>{children}</span>
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="center">
      <div className="spinner" />
      {label && <div style={{ color: "var(--gray600)" }}>{label}</div>}
    </div>
  );
}

export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
export const errMsg = (e: unknown) => (e instanceof Error ? e.message : "Ocurrió un error. Intentá nuevamente.");
