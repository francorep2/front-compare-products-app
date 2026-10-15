import { describe, expect, it } from "vitest";
import { groupByProduct } from "./group";
import { money, priceNumber, signedMoney, timeAgo } from "./format";
import { parseBulk } from "./parse";
import { compareText } from "./share";
import type { CompareData } from "../api/types";

describe("parseBulk", () => {
  it("entiende cantidades en varios formatos", () => {
    expect(parseBulk("2 leche\n3x yerba\npan x2\nfideos (4)\narroz")).toEqual([
      { nombre: "leche", cantidad: "2" },
      { nombre: "yerba", cantidad: "3" },
      { nombre: "pan", cantidad: "2" },
      { nombre: "fideos", cantidad: "4" },
      { nombre: "arroz", cantidad: "1" },
    ]);
  });
  it("no confunde unidades de medida con cantidad", () => {
    expect(parseBulk("1 kg de harina")).toEqual([{ nombre: "1 kg de harina", cantidad: "1" }]);
    expect(parseBulk("500 g queso")).toEqual([{ nombre: "500 g queso", cantidad: "1" }]);
  });
  it("ignora viñetas, numeración y líneas vacías", () => {
    expect(parseBulk("- pan\n• leche\n1. yerba\n\n  ; sal")).toEqual([
      { nombre: "pan", cantidad: "1" }, { nombre: "leche", cantidad: "1" }, { nombre: "yerba", cantidad: "1" }, { nombre: "sal", cantidad: "1" },
    ]);
  });
});

describe("groupByProduct", () => {
  const item = (title: string, price: number, barcode?: string) => ({ title, price: `ARS ${price}.00`, url: `https://x/${title}${price}`, barcode });
  it("agrupa por código de barras entre tiendas y marca la más barata", () => {
    const g = groupByProduct({
      coto: [item("Leche Coto", 2000, "779")],
      dia: [item("Leche Día", 1800, "779")],
      jumbo: [item("Otra cosa", 500, "111")],
    });
    expect(g).toHaveLength(2);
    expect(g[0].count).toBe(2); // primero lo que se puede comparar
    expect(g[0].cheapest).toBe("dia");
    expect(g[0].min).toBe(1800);
    expect(g[0].max).toBe(2000);
  });
  it("descarta precios inválidos", () => {
    expect(groupByProduct({ coto: [{ title: "x", price: "ARS 0.00", url: "u" }] })).toHaveLength(0);
  });
});

describe("format", () => {
  it("precios y dinero", () => {
    expect(priceNumber("ARS 1234.50")).toBe(1234.5);
    expect(money(2050)).toMatch(/2\.050/);
    expect(money(null)).toBe("—");
    expect(signedMoney(-120)).toMatch(/^−/);
    expect(signedMoney(80)).toMatch(/^\+/);
  });
  it("tiempo relativo", () => {
    const now = Date.parse("2026-10-15T12:00:00Z");
    expect(timeAgo("2026-10-15T11:59:30Z", now)).toBe("hace un momento");
    expect(timeAgo("2026-10-15T10:00:00Z", now)).toBe("hace 2 h");
    expect(timeAgo("2026-10-14T10:00:00Z", now)).toBe("ayer");
  });
});

describe("compareText", () => {
  it("resume ganador, ahorro y combinación", () => {
    const d: CompareData = {
      totals_by_store: { coto: { total: 500, missing_count: 0, missing_items: [] }, dia: { total: 530, missing_count: 1, missing_items: ["x"] } },
      winner: "coto",
      savings: { amount: 30, pct: 5.7, vs_store: "dia" },
      optimal: { total: 480, items: [], missing_items: [], stores_used: ["coto", "dia"], savings_vs_winner: 20 },
      updated_at: "",
    };
    const t = compareText("Semana", d);
    expect(t).toContain("Semana");
    expect(t).toContain("Más barato: Coto");
    expect(t).toContain("Mejor combinación");
    expect(t).toContain("faltan 1");
  });
});
