import { useEffect, useState, type FormEvent } from "react";
import { IoAdd, IoBarcodeOutline, IoSearchOutline } from "react-icons/io5";
import * as api from "../api";
import { PageHeader } from "../components/Layout";
import { ErrorBox, Field, Spinner, errMsg } from "../components/ui";

const LOGO: Record<string, string> = {
  coto: "/company/coto.png",
  carrefour: "/company/carrefour.png",
  jumbo: "/company/jumbo.png",
  dia: "/company/dia.png",
};

export function Search() {
  const [q, setQ] = useState("");
  const [mode, setMode] = useState<"text" | "barcode">("text");
  const [sources, setSources] = useState<api.Sources>({ coto: true, carrefour: true, jumbo: true, dia: true });
  const [results, setResults] = useState<api.SearchResults | null>(null);
  const [lists, setLists] = useState<api.ShoppingList[]>([]);
  const [listId, setListId] = useState<number | "">("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [added, setAdded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    api.getSources().then(setSources).catch(() => {});
    api.getLists().then((l) => { setLists(l); if (l.length) setListId(l[l.length - 1].id); }).catch(() => {});
  }, []);

  const toggle = async (s: api.Store) => {
    const next = { ...sources, [s]: !sources[s] };
    if (!api.enabledOf(next).length) return; // siempre al menos una tienda
    setSources(next);
    api.setSources(next).catch(() => {});
  };

  const run = async (e: FormEvent) => {
    e.preventDefault();
    const term = q.trim();
    if (!term) return;
    setErr(""); setBusy(true); setResults(null); setAdded({});
    try {
      const enabled = api.enabledOf(sources);
      setResults(mode === "barcode" ? await api.searchBarcode(term.replace(/\D/g, ""), enabled) : await api.searchAll(term, enabled));
    } catch (e2) { setErr(errMsg(e2)); } finally { setBusy(false); }
  };

  const addToList = async (it: api.StoreItem) => {
    if (listId === "") return;
    try { await api.addItem(listId, it.title, "1"); setAdded((a) => ({ ...a, [it.url]: true })); } catch (e) { setErr(errMsg(e)); }
  };

  const total = results ? Object.values(results).reduce((n, v) => n + v.length, 0) : 0;

  return (
    <>
      <PageHeader title="Busca cualquier producto" subtitle="Encuentra el mejor precio." />
      <div className="content">
        <div className="card">
          <form onSubmit={run}>
            <Field
              icon={mode === "text" ? <IoSearchOutline size={20} /> : <IoBarcodeOutline size={20} />}
              placeholder={mode === "text" ? "Leche, pan, galletitas..." : "Código de barras (EAN)"}
              inputMode={mode === "barcode" ? "numeric" : undefined}
              autoFocus value={q} onChange={(e) => setQ(e.target.value)}
            />
            <div className="chips">
              {api.STORES.map((s) => (
                <button type="button" key={s} className={`chip${sources[s] ? " on" : ""}`} onClick={() => toggle(s)}>
                  <img src={LOGO[s]} alt="" />{s}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn" disabled={busy || !q.trim()}>{busy ? "Buscando..." : "Buscar"}</button>
              <button type="button" className="btn ghost" style={{ width: 150 }} onClick={() => { setMode(mode === "text" ? "barcode" : "text"); setQ(""); }}>
                {mode === "text" ? "Por código" : "Por nombre"}
              </button>
            </div>
          </form>
        </div>

        <ErrorBox>{err}</ErrorBox>
        {busy && <Spinner label="Buscando en los supermercados..." />}

        {results && !busy && lists.length > 0 && total > 0 && (
          <div className="note">
            Agregar a la lista:{" "}
            <select value={listId} onChange={(e) => setListId(Number(e.target.value))} style={{ padding: 6, borderRadius: 8, border: "1px solid var(--border)" }}>
              {lists.map((l) => <option key={l.id} value={l.id}>{l.nombre}</option>)}
            </select>
          </div>
        )}

        {results && !busy && total === 0 && <div className="card empty"><b>No se encontraron productos.</b>Probá con otra palabra o menos tiendas.</div>}

        {results && api.STORES.filter((s) => results[s]?.length).map((s) => (
          <div className="card flush" key={s}>
            <div className="store-head"><img src={LOGO[s]} alt="" />{s}</div>
            {results[s].map((it) => (
              <div className="result" key={it.url}>
                {it.image_url ? <img className="thumb" src={it.image_url} alt="" loading="lazy" /> : <div className="thumb" />}
                <div className="info">
                  <a className="name" href={it.url} target="_blank" rel="noreferrer">{it.title}</a>
                  <div><span className="price">{api.money(api.priceNumber(it.price))}</span>{it.promotion && <span className="badge">{it.promotion}</span>}</div>
                </div>
                {listId !== "" && (
                  <button className="btn small" disabled={added[it.url]} onClick={() => addToList(it)} aria-label="Agregar a la lista">
                    {added[it.url] ? "Listo" : <IoAdd size={20} />}
                  </button>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}
