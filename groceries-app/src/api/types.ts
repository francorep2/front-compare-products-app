// src/api/types.ts

// --- AUTH ---
export interface LoginStartIn {
  email: string;
  password: string;
}

export interface TokenOut {
  access_token: string;
  token_type?: string;
}

export interface MeOut {
  id: number;
  email: string;
  is_verified: boolean;
}

// --- SHOPPING LISTS ---
export interface ShoppingListCreate { nombre: string }
export interface ShoppingListRename { nombre: string }
export interface ShoppingListOut { id: number; nombre: string; created_at: string }

export interface ShoppingItemCreate { nombre: string; cantidad: string }
export interface ShoppingItemUpdate { nombre?: string | null; cantidad?: string | null }
export interface ShoppingItemOut {
  id: number;
  list_id: number;
  nombre: string;
  cantidad: string;
  created_at: string;
}

export interface ShoppingListDetail {
  id: number;
  nombre: string;
  created_at: string;
  items: ShoppingItemOut[];
}

// --- SEARCH ---
export interface SearchItem {
  title?: string | null;
  price?: string | null;
  url?: string | null;
  image_url?: string | null;
  barcode?: string | null;
}
export interface SearchResponse {
  source: string;
  items: SearchItem[];
}
