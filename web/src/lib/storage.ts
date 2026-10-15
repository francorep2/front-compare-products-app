// localStorage seguro (puede fallar en ventanas privadas / storage bloqueado)
const get = (k: string): string | null => {
  try { return localStorage.getItem(k); } catch { return null; }
};
const set = (k: string, v: string | null) => {
  try { v === null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch { /* sin storage */ }
};
const json = <T,>(k: string, fallback: T): T => {
  try { const v = get(k); return v ? (JSON.parse(v) as T) : fallback; } catch { return fallback; }
};

export const storage = { get, set, json };

// ---- tema ----
export type ThemePref = "system" | "light" | "dark";
export const getThemePref = (): ThemePref => (get("changuito_theme") as ThemePref) || "system";
export function applyTheme(pref: ThemePref) {
  const dark = pref === "dark" || (pref === "system" && window.matchMedia?.("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  const meta = document.querySelector('meta[name="theme-color"]');
  meta?.setAttribute("content", dark ? "#181b22" : "#FD1648");
}
export function setThemePref(pref: ThemePref) {
  set("changuito_theme", pref);
  applyTheme(pref);
}

// ---- búsquedas recientes ----
const RECENT = "changuito_recent_searches";
export const getRecentSearches = (): string[] => json<string[]>(RECENT, []);
export function pushRecentSearch(q: string) {
  const t = q.trim();
  if (!t) return;
  set(RECENT, JSON.stringify([t, ...getRecentSearches().filter((x) => x.toLowerCase() !== t.toLowerCase())].slice(0, 8)));
}
export const clearRecentSearches = () => set(RECENT, null);

// ---- producto exacto elegido para un ítem (EAN), por id de ítem ----
const BARCODES = "changuito_item_barcodes";
export const getItemBarcodes = () => json<Record<string, string>>(BARCODES, {});
export function setItemBarcode(itemId: number, barcode: string | null) {
  const all = getItemBarcodes();
  if (barcode) all[String(itemId)] = barcode;
  else delete all[String(itemId)];
  set(BARCODES, JSON.stringify(all));
}
