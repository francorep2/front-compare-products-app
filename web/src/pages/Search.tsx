import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { IoAdd, IoBarcodeOutline, IoClose, IoSearchOutline, IoTimeOutline } from "react-icons/io5";
import * as api from "../api/endpoints";
import { qk, useSources } from "../api/queries";
import { STORES, type Store } from "../api/types";
import { AddToListModal } from "../features/AddToListModal";
import { ProductCard } from "../features/ProductCard";
import { Scanner } from "../features/Scanner";
import { PageHeader } from "../layout/Shell";
import { money, priceNumber } from "../lib/format";
import { groupByProduct, type ProductGroup } from "../lib/group";
import { clearRecentSearches, getRecentSearches, pushRecentSearch } from "../lib/storage";
import { Field } from "../ui/Field";
import { Img } from "../ui/Img";
import { EmptyState, ErrorBox, SkeletonCards, StoreBadge, StoreChip, Tabs } from "../ui/Misc";
import { errMsg } from "../ui/Toast";

type Sort = "savings" | "price" | "stores";

export function Search() {
  const [params, setParams] = useSearchParams();
  const qc = useQueryClient();
  const { data: sources } = useSources();
  const [input, setInput] = useState(params.get("q") ?? "");
  const [mode, setMode] = useState<"text" | "barcode">(params.get("ean") ? "barcode" : "text");
  const [view, setView] = useState<"product" | "store">("product");
  const [sort, setSort] = useState<Sort>("savings");
  const [onlyPromo, setOnlyPromo] = useState(false);
  const [scanner, setScanner] = useState(false);
  const [adding, setAdding] = useState<ProductGroup | null>(null);
  const [recent, setRecent] = useState(getRecentSearches);

  const term = (params.get("ean") ?? params.get("q") ?? "").trim();
  const isEan = !!params.get("ean");
  const enabled = api.enabledOf(sources ?? api.ALL_SOURCES);

  // si llegan a /search?q=... desde otra pantalla, reflejarlo en el input
  useEffect(() => { setInput(params.get("ean") ?? params.get("q") ?? ""); }, [params]);

  const { data, isFetching, error } = useQuery({
    queryKey: ["search", isEan ? "ean" : "q", term, enabled.join(",")],
    queryFn: () => (isEan ? api.searchBarcode(term, enabled, 3) : api.searchAll(term, enabled, 5)),
    enabled: term.length > 1,
    staleTime: 5 * 60_000,
  });

  const run = (e?: FormEvent) => {
    e?.preventDefault();
    const t = input.trim();
    if (!t) return;
    if (mode === "barcode") setParams({ ean: t.replace(/\D/g, "") });
    else { setParams({ q: t }); pushRecentSearch(t); setRecent(getRecentSearches()); }
  };

  const onScan = useCallback((code: string) => { setScanner(false); setMode("barcode"); setParams({ ean: code }); }, [setParams]);

  const toggleStore = async (s: Store) => {
    const cur = sources ?? api.ALL_SOURCES;
    const next = { ...cur, [s]: !cur[s] };
    if (!api.enabledOf(next).length) return;
    qc.setQueryData(qk.sources, next);
    api.setSources(next).catch(() => qc.invalidateQueries({ queryKey: qk.sources }));
  };

  const groups = useMemo(() => {
    if (!data) return [];
    let g = groupByProduct(data);
    if (onlyPromo) g = g.filter((x) => STORES.some((s) => x.offers[s]?.promotion));
    const spread = (x: ProductGroup) => (x.count > 1 ? x.max - x.min : 0);
    return [...g].sort(
      sort === "price" ? (a, b) => a.min - b.min : sort === "stores" ? (a, b) => b.count - a.count || a.min - b.min : (a, b) => spread(b) - spread(a) || b.count - a.count,
    );
  }, [data, sort, onlyPromo]);

  const total = data ? STORES.reduce((n, s) => n + (data[s]?.length ?? 0), 0) : 0;

  return (
    <>
      <PageHeader title="Busca cualquier producto" subtitle="Encuentra el mejor precio." />
      <div className="content">
        <div className="card">
          <form onSubmit={run}>
            <div className="search-row">
              <Field
                icon={mode === "text" ? <IoSearchOutline size={20} /> : <IoBarcodeOutline size={20} />}
                placeholder={mode === "text" ? "Leche, pan, galletitas..." : "Código de barras (EAN)"}
                inputMode={mode === "barcode" ? "numeric" : undefined}
                autoFocus
                value={input}
                onChange={(e) => setInput(mode === "barcode" ? e.target.value.replace(/\D/g, "") : e.target.value)}
                right={input ? <button type="button" className="eye" aria-label="Borrar" onClick={() => setInput("")}><IoClose size={18} /></button> : undefined}
              />
              <button className="btn" disabled={isFetching || !input.trim()}>Buscar</button>
            </div>
          </form>
          <div className="search-tools">
            <Tabs value={mode} onChange={(m) => { setMode(m); setInput(""); }} tabs={[{ id: "text", label: "Por nombre" }, { id: "barcode", label: "Por código" }]} />
            <button className="btn small ghost" onClick={() => setScanner(true)}><IoBarcodeOutline size={18} /> Escanear</button>
          </div>
          <div className="chips">
            {STORES.map((s) => <StoreChip key={s} store={s} on={sources ? sources[s] : true} onClick={() => toggleStore(s)} />)}
          </div>
        </div>

        {!term && recent.length > 0 && (
          <div className="card">
            <div className="section-head tight"><h2><IoTimeOutline size={18} /> Búsquedas recientes</h2><button className="link blue" onClick={() => { clearRecentSearches(); setRecent([]); }}>Borrar</button></div>
            <div className="chips">
              {recent.map((r) => <button key={r} className="chip" onClick={() => setParams({ q: r })}>{r}</button>)}
            </div>
          </div>
        )}
        {!term && recent.length === 0 && (
          <div className="card"><EmptyState icon={<IoSearchOutline size={40} />} title="Encontrá el mejor precio">Buscá un producto y lo vemos en Coto, Carrefour, Jumbo y Día a la vez.</EmptyState></div>
        )}

        <ErrorBox>{error ? errMsg(error) : ""}</ErrorBox>
        {isFetching && <SkeletonCards n={4} />}

        {data && !isFetching && (
          <>
            {total > 0 && (
              <div className="results-bar">
                <Tabs value={view} onChange={setView} tabs={[{ id: "product", label: `Por producto (${groups.length})` }, { id: "store", label: "Por tienda" }]} />
                <div className="results-filters">
                  <select className="select small" value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Ordenar">
                    <option value="savings">Mayor ahorro</option>
                    <option value="price">Menor precio</option>
                    <option value="stores">Más tiendas</option>
                  </select>
                  <label className="check-inline"><input type="checkbox" checked={onlyPromo} onChange={(e) => setOnlyPromo(e.target.checked)} /> Solo promos</label>
                </div>
              </div>
            )}
            {total === 0 && <div className="card"><EmptyState icon={<IoSearchOutline size={40} />} title="No se encontraron productos">Probá con otra palabra o activá más tiendas.</EmptyState></div>}

            {view === "product" ? (
              groups.map((g) => (
                <ProductCard key={g.key} group={g} actions={<button className="btn small" onClick={() => setAdding(g)} aria-label="Agregar a una lista"><IoAdd size={18} /> Agregar</button>} />
              ))
            ) : (
              STORES.filter((s) => data[s]?.length).map((s) => (
                <div className="card flush" key={s}>
                  <div className="store-head"><StoreBadge store={s} size={26} /></div>
                  {data[s]!.map((it) => (
                    <div className="result" key={it.url}>
                      <Img src={it.image_url ?? undefined} />
                      <div className="grow">
                        <a className="name" href={it.url} target="_blank" rel="noreferrer">{it.title}</a>
                        <div><span className="price">{money(priceNumber(it.price))}</span>{it.promotion && <span className="badge">{it.promotion}</span>}</div>
                      </div>
                      <button className="btn small" onClick={() => setAdding({ key: it.url, title: it.title, image: it.image_url, barcode: it.barcode, offers: { [s]: it }, min: priceNumber(it.price), max: priceNumber(it.price), cheapest: s, count: 1 })} aria-label="Agregar a una lista"><IoAdd size={18} /></button>
                    </div>
                  ))}
                </div>
              ))
            )}
          </>
        )}
      </div>
      {scanner && <Scanner onCode={onScan} onClose={() => setScanner(false)} />}
      {adding && <AddToListModal product={{ title: adding.title, barcode: adding.barcode }} onClose={() => setAdding(null)} />}
    </>
  );
}
