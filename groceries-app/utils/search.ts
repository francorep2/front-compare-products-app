// utils/search.ts
import { useEffect, useState } from "react";
import { SearchHit, SearchRawResponse, StoreRawItem } from "../src/api/types";

// Convierte cualquier valor a array
export const asList = <T = any>(v: any): T[] => (
  Array.isArray(v) ? v : (v ? [v] : [])
);

export function useDebouncedValue<T>(value: T, delay = 420) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

        
export function parsePriceToNumber(raw?: string | number | null): number {
  if (raw == null) return 0;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : 0;

  let s = String(raw).trim();
  if (!s) return 0;

  // quitar cualquier símbolo que no sea dígito, punto o coma (pero dejar . y , para analizar formato)
  // también quitamos moneda/espacios
  s = s.replace(/[^\d.,-]/g, "");

  if (s.includes(",")) {
    s = s.replace(/\./g, "");  // remove thousand dots
    s = s.replace(",", ".");   // decimal comma -> dot
  } else {
    const parts = s.split(".");
    if (parts.length > 2) {
      const last = parts.pop()!;
      s = parts.join("") + "." + last;
    }
  }

  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

export function mapSearchResponse(data?: SearchRawResponse | null): SearchHit[] {
  const out: SearchHit[] = [];
  const results = (data as any)?.results ?? {};

  Object.entries(results).forEach(([store, items]) => {
    asList<StoreRawItem>(items).forEach((it) => {
      if (!it) return;
      out.push({
        store,
        name: it.title,
        price: parsePriceToNumber((it as any)?.price),
        url: it.url,
        image_url: (it as any)?.image_url,
        barcode: (it as any)?.barcode,
      });
    });
  });

  // opcional: ordenar por precio asc
  out.sort((a, b) => a.price - b.price);
  return out;
}
