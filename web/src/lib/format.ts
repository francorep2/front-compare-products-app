export const money = (n: number | null | undefined) =>
  n == null || Number.isNaN(n)
    ? "—"
    : new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

/** "ARS 1234.00" -> 1234 */
export const priceNumber = (p: string | number) => (typeof p === "number" ? p : Number(String(p).replace("ARS", "").trim()));

export const pct = (n: number) => `${n.toLocaleString("es-AR", { maximumFractionDigits: 1 })}%`;

/** Variación con signo: +$120 / −$80 */
export const signedMoney = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${money(Math.abs(n))}`;

export function timeAgo(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const s = Math.max(0, Math.round((now - t) / 1000));
  if (s < 60) return "hace un momento";
  const m = Math.round(s / 60);
  if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  if (d < 30) return d === 1 ? "ayer" : `hace ${d} días`;
  return new Date(t).toLocaleDateString("es-AR", { day: "numeric", month: "short" });
}

export const dateTime = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString("es-AR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "";

export const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
