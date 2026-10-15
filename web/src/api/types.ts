export type Me = { id: number; email: string; is_verified: boolean; first_name?: string | null; last_name?: string | null };

export type ShoppingList = { id: number; nombre: string; created_at: string };
export type ShoppingItem = { id: number; list_id: number; nombre: string; cantidad: string; done: boolean; created_at: string };
export type ListDetail = ShoppingList & { items: ShoppingItem[] };

export const STORES = ["coto", "carrefour", "jumbo", "dia"] as const;
export type Store = (typeof STORES)[number];
export type Sources = Record<Store, boolean>;

export type StoreItem = {
  title: string;
  price: string; // "ARS 1234.00"
  url: string;
  image_url?: string | null;
  barcode?: string | null;
  promotion?: string | null;
};
export type SearchResults = Partial<Record<Store, StoreItem[]>>;

// ---------- comparación ----------
export type Offer = {
  found_name: string;
  price: number;
  url?: string | null;
  image_url?: string | null;
  promotion?: string | null;
  barcode?: string | null;
};
export type Line = {
  name: string;
  quantity: number;
  barcode?: string | null;
  offers: Record<string, Offer | null>;
  cheapest: string | null;
};
export type OptimalItem = Offer & { name: string; quantity: number; store: string; subtotal: number };
export type StoreTotal = { total: number; missing_count: number; missing_items: string[] };
export type CompareData = {
  totals_by_store: Record<string, StoreTotal>;
  winner: string | null;
  savings?: { amount: number; pct: number; vs_store: string } | null;
  // las comparaciones viejas (antes de la v2) no traen lo siguiente
  lines?: Line[];
  optimal?: { total: number; items: OptimalItem[]; missing_items: string[]; stores_used: string[]; savings_vs_winner: number | null } | null;
  items_count?: number;
  stores?: string[];
  error?: boolean;
  updated_at: string;
};
export type ComparisonTask = {
  id: string;
  status: "processing" | "completed";
  data: CompareData | null;
  list_id: number | null;
  title: string | null;
  created_at: string | null;
};
export type HistoryEntry = {
  id: string;
  status: "processing" | "completed";
  title: string | null;
  list_id: number | null;
  created_at: string | null;
  winner: string | null;
  totals: Record<string, number>;
  items_count: number | null;
  savings: number | null;
};
export type CompareItemIn = { nombre: string; cantidad: number; barcode?: string | null };
