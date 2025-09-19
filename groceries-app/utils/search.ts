// src/utils/search.ts
import type { SearchHit, StoreRawItem } from "../src/api/types";

const STORES = ["carrefour", "coto", "dia", "jumbo"] as const;
type StoreKey = typeof STORES[number];

export function parseArsToNumber(ars?: string | null): number | undefined {
  if (!ars) return undefined;
  const only = ars.replace(/[^\d.,]/g, "");
  const normalized =
    only.includes(",") && only.lastIndexOf(",") > only.lastIndexOf(".")
      ? only.replace(/\./g, "").replace(",", ".")
      : only.replace(/,/g, "");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : undefined;
}

// ✅ siempre mapea DESDE una lista de items
function mapItems(store: StoreKey, items?: StoreRawItem[]): SearchHit[] {
  if (!items?.length) return [];
  return items.map((it) => ({
    store,
    name: it.title ?? "",
    price: parseArsToNumber(it.price),
    url: it.url,
    image_url: it.image_url,
    barcode: it.barcode,
    promotion:
      typeof it.promotion === "string" && it.promotion.trim().length
        ? it.promotion.trim()
        : undefined,
  }));
}

import { useEffect, useState } from "react";

// ... lo que ya tenés (parseArsToNumber, mapSearchResponse, etc.)

export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debounced;
}



export function mapSearchResponse(data: any): SearchHit[] {
  if (!data) return [];

  // B) con wrapper
  const maybeRecord = data?.results ?? data;

  // A) record por tienda
  if (
    maybeRecord &&
    (Array.isArray(maybeRecord.carrefour) ||
      Array.isArray(maybeRecord.coto) ||
      Array.isArray(maybeRecord.dia) ||
      Array.isArray(maybeRecord.jumbo))
  ) {
    const out: SearchHit[] = [];
    for (const s of STORES) out.push(...mapItems(s, maybeRecord[s]));
    return out.filter((h) => !!h.name && !!h.url);
  }

  // C) array de buckets { source, items }
  if (Array.isArray(maybeRecord)) {
    const out: SearchHit[] = [];
    for (const b of maybeRecord) {
      const src = (b?.source ?? "").toLowerCase();
      if (!STORES.includes(src)) continue;
      out.push(...mapItems(src as StoreKey, b?.items));
    }
    return out.filter((h) => !!h.name && !!h.url);
  }

  return [];
}
