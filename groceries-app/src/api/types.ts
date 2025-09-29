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
  done: boolean;
}

export interface ShoppingListDetail {
  id: number;
  nombre: string;
  created_at: string;
  items: ShoppingItemOut[];
}

// --- SEARCH (modelo crudo que puede usar otras partes del front) ---
export interface SearchItem {
  title?: string | null;
  price?: string | null;       // "ARS 1234.00"
  url?: string | null;
  image_url?: string | null;
  barcode?: string | null;
  promotion?: string | null;   // 👈 AGREGADO
}

export interface SearchResponse {
  source: string;
  items: SearchItem[];
}

// --- REGISTER / RESET ---
export type RegisterStartIn = {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
};

export type RegisterStartOut = {
  challenge_id: string;
  email: string;
  message: string;
};

export type RegisterVerifyIn = {
  challenge_id: string;
  code: string;
};

export type RegisterResendOut = {
  challenge_id: string;
  message: string;
};

export type PasswordResetStartIn = {
  email: string;
};
export type PasswordResetVerifyIn = {
  challenge_id: string;
  code: string;
};
export type ResetTokenOut = {
  reset_token: string;
};
export type PasswordResetConfirmIn = {
  reset_token: string;
  new_password: string;
};
export type PasswordResetResendOut = {
  challenge_id: string;
  message: string;
};
export type PasswordResetStartOut = {
  challenge_id?: string;
  message: string;
};

export type UpdateMeIn = Partial<{
  password: string;
  email: string;
  first_name: string;
  last_name: string;
}>;

export type ShoppingListCreateIn = {
  nombre: string
};

export type ShoppingListRenameIn = {
  nombre: string
};

export type ShoppingItemCreateIn = {
  nombre: string;
  cantidad: string
};
export type ShoppingItemUpdateIn = {
  nombre?: string | null;
  cantidad?: string | null;
  done?: boolean | null;
};

// --- SEARCH (respuesta cruda del endpoint /search/all o /search/barcode/all) ---
export type StoreRawItem = {
  title: string;
  price: string;              
  url: string;
  image_url?: string;
  barcode?: string;
  promotion?: string;         
};

export type SearchRawResponse = Record<string, StoreRawItem[]>;

export type SearchHit = {
  store: string;
  name: string;
  price?: number;               
  url: string;
  image_url?: string;
  barcode?: string;
  promotion?: string;      
};

// --- USER / AUTLOGIN ---
export type User = {
  id: number;
  email: string;
  name: string;
};

export type AutoLoginResponse = {
  user: User | null;
  valid: boolean;
};

// --- SCRAPE SOURCES ---
export type ScrapeSources = {
  carrefour: boolean;
  coto: boolean;
  jumbo: boolean;
  dia: boolean;
};

// --- TIPOS PARA LA COMPARACIÓN DE LISTAS ---

// Para enviar la petición a POST /compare/start
export interface ComparisonItemIn {
  nombre: string;
  cantidad: number;
}

export interface ComparisonRequestIn {
  items: ComparisonItemIn[];
  enabled?: string[];
}
export interface StoreSummary {
  total: number;
  missing_count: number;
  missing_items: string[];
}

export interface ComparisonSummaryOut {
  totals_by_store: {
    [key: string]: StoreSummary; 
  };
  winner: string | null;
  updated_at: string;
}

export interface ComparisonTaskOut {
  status: 'processing' | 'completed';
  data: ComparisonSummaryOut | null;
}