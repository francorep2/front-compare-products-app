import type { Store } from "../api/types";

export const STORE_META: Record<Store, { name: string; logo: string; color: string }> = {
  coto: { name: "Coto", logo: "/company/coto.png", color: "var(--store-coto)" },
  carrefour: { name: "Carrefour", logo: "/company/carrefour.png", color: "var(--store-carrefour)" },
  jumbo: { name: "Jumbo", logo: "/company/jumbo.png", color: "var(--store-jumbo)" },
  dia: { name: "Día", logo: "/company/dia.png", color: "var(--store-dia)" },
};

export const storeName = (s: string) => STORE_META[s as Store]?.name ?? s;
