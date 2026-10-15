export type Draft = { nombre: string; cantidad: string };

/**
 * Interpreta una lista pegada, un producto por línea. Acepta:
 *   "2 leche", "2x leche", "leche x2", "leche (3)", "- pan", "• yerba 1kg"
 */
export function parseBulk(text: string): Draft[] {
  const out: Draft[] = [];
  for (const raw of text.split(/\r?\n|;/)) {
    let line = raw.trim().replace(/^[-–•*·]\s*/, "").replace(/^\d+[.)]\s+/, "").trim();
    if (!line) continue;
    let qty = "1";
    let m = line.match(/^(\d{1,2})\s*(?:x|×|u\.?|un\.?|unidades?)?\s+(.+)$/i);
    if (m && !/^(kg|g|gr|grs|l|lt|lts|ml|cc)\b/i.test(m[2])) {
      qty = m[1];
      line = m[2];
    } else if ((m = line.match(/^(.+?)\s*(?:x|×)\s*(\d{1,2})$/i))) {
      line = m[1];
      qty = m[2];
    } else if ((m = line.match(/^(.+?)\s*\((\d{1,2})\)$/))) {
      line = m[1];
      qty = m[2];
    }
    line = line.trim();
    if (line) out.push({ nombre: line, cantidad: qty });
  }
  return out;
}

export const qtyNumber = (c: string) => Math.max(1, Math.min(99, parseInt(c, 10) || 1));
