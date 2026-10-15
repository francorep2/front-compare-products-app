import { useState, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";
import { IoEyeOffOutline, IoEyeOutline } from "react-icons/io5";

/** Campo con ícono (borde redondeado, ícono de marca), igual que los inputs de la app móvil. */
export function Field({
  icon, invalid, password, label, hint, className, right, ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  icon?: ReactNode; invalid?: boolean; password?: boolean; label?: string; hint?: string; right?: ReactNode;
}) {
  const [show, setShow] = useState(false);
  return (
    <label className={`field-wrap${className ? ` ${className}` : ""}`}>
      {label && <span className="field-label">{label}</span>}
      <span className={`field${invalid ? " invalid" : ""}`}>
        {icon}
        <input {...props} type={password ? (show ? "text" : "password") : props.type} />
        {right}
        {password && (
          <button type="button" className="eye" onClick={() => setShow((s) => !s)} aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}>
            {show ? <IoEyeOffOutline size={20} /> : <IoEyeOutline size={20} />}
          </button>
        )}
      </span>
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

export function TextArea({ label, hint, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string; hint?: string }) {
  return (
    <label className="field-wrap">
      {label && <span className="field-label">{label}</span>}
      <textarea className="textarea" {...props} />
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}
