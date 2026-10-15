import { priceNumber } from "./format";
import { STORES, type SearchResults, type Store, type StoreItem } from "../api/types";

export type ProductGroup = {
  key: string;
  title: string;
  image?: string | null;
  barcode?: string | null;
  offers: Partial<Record<Store, StoreItem>>;
  min: number;
  max: number;
  cheapest: Store;
  /** cuántas tiendas lo tienen */
  count: number;
};

const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();

/**
 * Agrupa los resultados de las tiendas por producto: mismo código de barras = mismo producto.
 * Los que no traen EAN se agrupan solo si el título normalizado coincide exacto.
 */
export function groupByProduct(results: SearchResults): ProductGroup[] {
  const groups = new Map<string, ProductGroup>();
  for (const store of STORES) {
    for (const it of results[store] ?? []) {
      const price = priceNumber(it.price);
      if (!Number.isFinite(price) || price <= 0) continue;
      const key = it.barcode ? `ean:${it.barcode}` : `t:${norm(it.title)}`;
      let g = groups.get(key);
      if (!g) {
        g = { key, title: it.title, image: it.image_url, barcode: it.barcode, offers: {}, min: Infinity, max: 0, cheapest: store, count: 0 };
        groups.set(key, g);
      }
      if (g.offers[store]) continue; // una oferta (la mejor ubicada) por tienda
      g.offers[store] = it;
      g.count += 1;
      if (!g.image && it.image_url) g.image = it.image_url;
      if (price < g.min) { g.min = price; g.cheapest = store; }
      if (price > g.max) g.max = price;
    }
  }
  // primero los disponibles en más tiendas (se pueden comparar), después por precio
  return [...groups.values()].sort((a, b) => b.count - a.count || a.min - b.min);
}

export const flattenResults = (r: SearchResults) =>
  STORES.flatMap((s) => (r[s] ?? []).map((it) => ({ store: s, item: it, price: priceNumber(it.price) })));
