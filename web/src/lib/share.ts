import { money, pct } from "./format";
import { STORE_META } from "../ui/store";
import type { CompareData, ShoppingItem } from "../api/types";

const name = (s: string) => STORE_META[s as keyof typeof STORE_META]?.name ?? s;

/** Texto para compartir (WhatsApp / portapapeles) con el resultado de una comparación. */
export function compareText(title: string | null, d: CompareData): string {
  const out: string[] = [`🛒 ${title || "Comparación de precios"} — Changuito`];
  const rows = Object.entries(d.totals_by_store).sort((a, b) => a[1].missing_count - b[1].missing_count || a[1].total - b[1].total);
  if (d.winner) {
    out.push(`✅ Más barato: ${name(d.winner)} — ${money(d.totals_by_store[d.winner].total)}`);
    if (d.savings) out.push(`💸 Ahorrás ${money(d.savings.amount)} (${pct(d.savings.pct)}) vs ${name(d.savings.vs_store)}`);
  }
  out.push("");
  for (const [s, v] of rows) out.push(`• ${name(s)}: ${money(v.total)}${v.missing_count ? ` (faltan ${v.missing_count})` : ""}`);
  if (d.optimal && d.optimal.savings_vs_winner && d.optimal.savings_vs_winner > 0) {
    out.push("", `🧩 Mejor combinación (${d.optimal.stores_used.map(name).join(" + ")}): ${money(d.optimal.total)}`);
  }
  return out.join("\n");
}

export function listText(title: string, items: ShoppingItem[]): string {
  return [`🛒 ${title}`, ...items.map((i) => `${i.done ? "✅" : "⬜"} ${i.nombre}${i.cantidad && i.cantidad !== "1" ? ` x${i.cantidad}` : ""}`)].join("\n");
}

export const whatsappUrl = (text: string) => `https://wa.me/?text=${encodeURIComponent(text)}`;

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
