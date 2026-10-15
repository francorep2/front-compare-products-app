import { useState, type ImgHTMLAttributes } from "react";

/** Imagen de producto con fallback: si la tienda no la sirve, se muestra el recuadro vacío. */
export function Img({ className = "thumb", ...props }: ImgHTMLAttributes<HTMLImageElement>) {
  const [broken, setBroken] = useState(false);
  if (broken || !props.src) return <div className={`${className} ph`} />;
  return <img className={className} loading="lazy" alt="" referrerPolicy="no-referrer" {...props} onError={() => setBroken(true)} />;
}
