import { useSearchParams } from "react-router-dom";
import { IoArrowDown, IoArrowUp, IoRemove } from "react-icons/io5";
import { useComparison } from "../api/queries";
import type { CompareData, ComparisonTask } from "../api/types";
import { PageHeader } from "../layout/Shell";
import { dateTime, money, pct, plural, signedMoney } from "../lib/format";
import { EmptyState, ErrorBox, Spinner, StoreBadge } from "../ui/Misc";
import { storeName } from "../ui/store";
import { errMsg } from "../ui/Toast";

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();

function Delta({ a, b }: { a: number; b: number }) {
  const d = b - a;
  if (Math.abs(d) < 0.5) return <span className="delta same"><IoRemove size={14} /> igual</span>;
  const p = a ? (d / a) * 100 : 0;
  // más barato = verde
  return <span className={`delta ${d < 0 ? "down" : "up"}`}>{d < 0 ? <IoArrowDown size={14} /> : <IoArrowUp size={14} />} {signedMoney(d)} ({pct(Math.abs(p))})</span>;
}

/** Comparar carritos: dos comparaciones lado a lado (dos listas, o la misma lista en dos momentos). */
export function Diff() {
  const [params] = useSearchParams();
  const a = useComparison(params.get("a") ?? undefined);
  const b = useComparison(params.get("b") ?? undefined);
  const error = a.error ?? b.error;

  if (error) return (<><PageHeader title="Comparar carritos" back="/lists?tab=comparisons" /><div className="content"><ErrorBox>{errMsg(error)}</ErrorBox></div></>);
  const ta = a.data, tb = b.data;
  if (!ta || !tb || ta.status !== "completed" || tb.status !== "completed" || !ta.data || !tb.data) {
    return (<><PageHeader title="Comparar carritos" back="/lists?tab=comparisons" /><div className="content"><div className="card"><Spinner label="Comparando los dos carritos…" /></div></div></>);
  }
  return <DiffView ta={ta} tb={tb} da={ta.data} db={tb.data} />;
}

function DiffView({ ta, tb, da, db }: { ta: ComparisonTask; tb: ComparisonTask; da: CompareData; db: CompareData }) {
  const stores = Array.from(new Set([...(da.stores ?? Object.keys(da.totals_by_store)), ...(db.stores ?? Object.keys(db.totals_by_store))]));
  const sameList = ta.list_id != null && ta.list_id === tb.list_id;

  // productos en común (por nombre) con el mejor precio unitario de cada lado
  const linesA = new Map((da.lines ?? []).map((l) => [norm(l.name), l]));
  const common = (db.lines ?? []).flatMap((lb) => {
    const la = linesA.get(norm(lb.name));
    if (!la) return [];
    const best = (l: typeof la) => Math.min(...Object.values(l.offers).filter(Boolean).map((o) => o!.price));
    const pa = best(la), pb = best(lb);
    return Number.isFinite(pa) && Number.isFinite(pb) ? [{ name: lb.name, pa, pb }] : [];
  });
  const onlyA = (da.lines ?? []).filter((l) => !(db.lines ?? []).some((x) => norm(x.name) === norm(l.name))).length;
  const onlyB = (db.lines ?? []).filter((l) => !linesA.has(norm(l.name))).length;

  const head = (t: ComparisonTask, d: CompareData, tag: string) => (
    <div className="diff-head">
      <span className="pill">{tag}</span>
      <div className="title">{t.title || "Comparación"}</div>
      <div className="desc">{dateTime(t.created_at)} · {plural(d.items_count ?? 0, "producto", "productos")}</div>
      {d.winner && <div className="diff-winner"><StoreBadge store={d.winner} size={18} /> <b>{money(d.totals_by_store[d.winner].total)}</b></div>}
    </div>
  );

  return (
    <>
      <PageHeader title="Comparar carritos" subtitle={sameList ? "La misma lista en dos momentos distintos" : "Dos carritos lado a lado"} back="/lists?tab=comparisons" />
      <div className="content">
        <div className="card diff-heads">{head(ta, da, "A")}{head(tb, db, "B")}</div>

        <div className="card flush">
          <table className="cmp-table diff-table">
            <thead><tr><th>Tienda</th><th>A</th><th>B</th><th>Cambio</th></tr></thead>
            <tbody>
              {stores.map((s) => {
                const x = da.totals_by_store[s], y = db.totals_by_store[s];
                return (
                  <tr key={s}>
                    <td><StoreBadge store={s} size={18} /></td>
                    <td className={s === da.winner ? "best" : ""}>{x ? money(x.total) : "—"}{x?.missing_count ? <small>faltan {x.missing_count}</small> : null}</td>
                    <td className={s === db.winner ? "best" : ""}>{y ? money(y.total) : "—"}{y?.missing_count ? <small>faltan {y.missing_count}</small> : null}</td>
                    <td>{x && y ? <Delta a={x.total} b={y.total} /> : "—"}</td>
                  </tr>
                );
              })}
              {da.optimal && db.optimal && (
                <tr className="extra">
                  <td>Mejor combinación</td><td>{money(da.optimal.total)}</td><td>{money(db.optimal.total)}</td><td><Delta a={da.optimal.total} b={db.optimal.total} /></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Resumen</h3>
          <ul className="summary">
            {da.winner && db.winner && (
              <li>{da.winner === db.winner ? <>En los dos carritos la tienda más barata es <b>{storeName(da.winner)}</b>.</> : <>La tienda más barata cambia: <b>{storeName(da.winner)}</b> en A y <b>{storeName(db.winner)}</b> en B.</>}</li>
            )}
            {da.winner && db.winner && <li>Mejor total: A {money(da.totals_by_store[da.winner].total)} · B {money(db.totals_by_store[db.winner].total)} (<Delta a={da.totals_by_store[da.winner].total} b={db.totals_by_store[db.winner].total} />).</li>}
            <li>{plural(common.length, "producto en común", "productos en común")}{onlyA ? ` · ${plural(onlyA, "solo en A", "solo en A")}` : ""}{onlyB ? ` · ${plural(onlyB, "solo en B", "solo en B")}` : ""}.</li>
          </ul>
        </div>

        {common.length > 0 ? (
          <div className="card flush">
            <div className="store-head">Productos en común (mejor precio de cada comparación)</div>
            <table className="cmp-table diff-table">
              <thead><tr><th>Producto</th><th>A</th><th>B</th><th>Cambio</th></tr></thead>
              <tbody>
                {common.map((c) => (
                  <tr key={c.name}><td><div className="cell-name">{c.name}</div></td><td>{money(c.pa)}</td><td>{money(c.pb)}</td><td><Delta a={c.pa} b={c.pb} /></td></tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="card"><EmptyState icon={<IoRemove size={36} />} title="No hay productos en común">Los dos carritos no comparten productos con el mismo nombre.</EmptyState></div>
        )}
      </div>
    </>
  );
}
