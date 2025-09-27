export function capitalize(s?: string) {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// --- HELPERS PARA ÍCONOS DE TIENDA ---
const COMPANY_ICONS: Record<string, any> = {
  coto: require("../assets/company/coto.png"),
  dia: require("../assets/company/dia.png"),
  carrefour: require("../assets/company/carrefour.png"),
  jumbo: require("../assets/company/jumbo.png"),
};
const normalizeKey = (s: string) => s.toLowerCase().replace(/\s+|_/g, "");
export const iconForStore = (store: string) => COMPANY_ICONS[normalizeKey(store)] ?? null;