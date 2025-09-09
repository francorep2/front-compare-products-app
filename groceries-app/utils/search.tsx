// utils/search.ts
import { SearchHit, SearchRawResponse, StoreRawItem } from "../src/api/types";

export function useDebouncedValue<T>(value: T, delay = 420) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

// ⚠️ recordá importar React hooks si este archivo no es .tsx
import { useEffect, useState } from "react";

export function parsePriceToNumber(raw?: string): number {
  if (!raw) return 0;
  const cleaned = raw.replace(/[^\d,.-]/g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

export function mapSearchResponse(data: SearchRawResponse): SearchHit[] {
  const out: SearchHit[] = [];
  for (const [store, items] of Object.entries(data || {})) {
    (items ?? []).forEach((it: StoreRawItem) => {
      out.push({
        store,
        name: it.title,
        price: parsePriceToNumber(it.price),
        url: it.url,
        image_url: it.image_url,
        barcode: it.barcode,
      });
    });
  }
  // opcional: ordenar por precio asc
  out.sort((a, b) => a.price - b.price);
  return out;
}
