import { useMemo, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  IoAdd, IoCheckmarkCircle, IoChevronDown, IoChevronForward, IoCopyOutline, IoEllipseOutline, IoLogoWhatsapp, IoPencil,
  IoRemove, IoSearchCircleOutline, IoStatsChartOutline, IoTrashOutline,
} from "react-icons/io5";
import * as api from "../api/endpoints";
import { qk, useHistory, useInvalidate, useList, useSources } from "../api/queries";
import { STORES, type ListDetail as TList, type ShoppingItem, type Store } from "../api/types";
import { ProductPicker } from "../features/ProductPicker";
import { PageHeader } from "../layout/Shell";
import { money, plural, timeAgo } from "../lib/format";
import { qtyNumber } from "../lib/parse";
import { copyText, listText, whatsappUrl } from "../lib/share";
import { getItemBarcodes, setItemBarcode } from "../lib/storage";
import { Field } from "../ui/Field";
import { Confirm } from "../ui/Modal";
import { EmptyState, ErrorBox, Progress, Skeleton, StoreBadge, StoreChip } from "../ui/Misc";
import { errMsg, useToast } from "../ui/Toast";

export function ListDetail() {
  const { id } = useParams();
  const listId = Number(id);
  const nav = useNavigate();
  const qc = useQueryClient();
  const inv = useInvalidate();
  const { toast } = useToast();
  const { data: list, isLoading, error } = useList(listId);
  const { data: sources, refetch: refetchSources } = useSources();
  const { data: history } = useHistory();
  const [barcodes, setBarcodes] = useState(getItemBarcodes);
  const [prod, setProd] = useState("");
  const [qty, setQty] = useState("1");
  const [renaming, setRenaming] = useState(false);
  const [title, setTitle] = useState("");
  const [picker, setPicker] = useState<ShoppingItem | null>(null);
  const [showDone, setShowDone] = useState(true);
  const [confirmClear, setConfirmClear] = useState(false);

  const setList = (fn: (l: TList) => TList) => qc.setQueryData<TList>(qk.list(listId), (l) => (l ? fn(l) : l));
  const patchItem = (itemId: number, p: Partial<ShoppingItem>) => setList((l) => ({ ...l, items: l.items.map((i) => (i.id === itemId ? { ...i, ...p } : i)) }));

  const update = useMutation({
    mutationFn: ({ id: iid, ...p }: { id: number } & Partial<{ nombre: string; cantidad: string; done: boolean }>) => api.updateItem(iid, p),
    onError: (e) => { toast(errMsg(e), "error"); inv.list(listId); },
  });
  const addItem = useMutation({
    mutationFn: () => api.addItem(listId, prod.trim(), qty.trim() || "1"),
    onSuccess: (it) => { setList((l) => ({ ...l, items: [...l.items, it] })); setProd(""); setQty("1"); inv.lists(); },
    onError: (e) => toast(errMsg(e), "error"),
  });
  const removeItem = useMutation({
    mutationFn: (it: ShoppingItem) => api.deleteItem(it.id),
    onSuccess: (_d, it) => { setList((l) => ({ ...l, items: l.items.filter((i) => i.id !== it.id) })); setItemBarcode(it.id, null); setBarcodes(getItemBarcodes()); inv.lists(); },
    onError: (e) => toast(errMsg(e), "error"),
  });
  const rename = useMutation({
    mutationFn: (nombre: string) => api.renameList(listId, nombre),
    onSuccess: (l) => { setList((x) => ({ ...x, nombre: l.nombre })); inv.lists(); setRenaming(false); toast("Nombre actualizado"); },
    onError: (e) => toast(errMsg(e), "error"),
  });

  // el backend no garantiza el orden: lo fijamos por id (orden de carga)
  const items = useMemo(() => [...(list?.items ?? [])].sort((x, y) => x.id - y.id), [list?.items]);
  const pending = items.filter((i) => !i.done);
  const done = items.filter((i) => i.done);
  const enabled = api.enabledOf(sources ?? api.ALL_SOURCES);

  const last = useMemo(() => (history ?? []).find((h) => h.list_id === listId && h.status === "completed"), [history, listId]);

  const toggle = (it: ShoppingItem) => { patchItem(it.id, { done: !it.done }); update.mutate({ id: it.id, done: !it.done }); };
  const setQuantity = (it: ShoppingItem, n: number) => {
    const v = String(Math.max(1, Math.min(99, n)));
    if (v === it.cantidad) return;
    patchItem(it.id, { cantidad: v });
    update.mutate({ id: it.id, cantidad: v });
  };
  const markAll = (value: boolean) => items.filter((i) => i.done !== value).forEach((i) => { patchItem(i.id, { done: value }); update.mutate({ id: i.id, done: value }); });
  const clearDone = async () => {
    const targets = [...done];
    await Promise.allSettled(targets.map((i) => api.deleteItem(i.id)));
    targets.forEach((i) => setItemBarcode(i.id, null));
    setBarcodes(getItemBarcodes());
    inv.list(listId); inv.lists();
    toast(`${plural(targets.length, "producto eliminado", "productos eliminados")}`);
  };
  const pick = (it: ShoppingItem, g: { title: string; barcode?: string | null }) => {
    patchItem(it.id, { nombre: g.title });
    update.mutate({ id: it.id, nombre: g.title });
    if (g.barcode) { setItemBarcode(it.id, g.barcode); setBarcodes(getItemBarcodes()); }
    setPicker(null);
    toast("Producto elegido: se compara exactamente ese");
  };

  const toggleStore = async (s: Store) => {
    const cur = sources ?? api.ALL_SOURCES;
    const next = { ...cur, [s]: !cur[s] };
    if (!api.enabledOf(next).length) return;
    qc.setQueryData(qk.sources, next);
    try { await api.setSources(next); } catch { refetchSources(); }
  };

  const compare = useMutation({
    mutationFn: () =>
      api.startComparison(
        items.map((i) => ({ nombre: i.nombre, cantidad: qtyNumber(i.cantidad), barcode: barcodes[String(i.id)] ?? null })),
        enabled, { list_id: listId, title: list?.nombre },
      ),
    onSuccess: (r) => { inv.history(); nav(`/compare/${r.task_id}`); },
    onError: (e) => toast(errMsg(e), "error"),
  });

  const share = async () => {
    if (!list) return;
    const text = listText(list.nombre, items);
    if (navigator.share) { try { await navigator.share({ text }); return; } catch { /* cancelado */ } }
    toast((await copyText(text)) ? "Lista copiada al portapapeles" : "No se pudo copiar", "info");
  };

  const submit = (e: FormEvent) => { e.preventDefault(); if (prod.trim()) addItem.mutate(); };

  if (isLoading) return (<><PageHeader title="Lista" back="/lists" /><div className="content"><div className="card"><Skeleton h={22} w="60%" /><div style={{ height: 12 }} /><Skeleton h={14} /></div></div></>);
  if (error || !list) return (<><PageHeader title="Lista" back="/lists" /><div className="content"><ErrorBox>{errMsg(error ?? new Error("No encontramos la lista."))}</ErrorBox></div></>);

  const renderItem = (it: ShoppingItem) => (
    <div className="item" key={it.id}>
      <button className={`check${it.done ? " on" : ""}`} onClick={() => toggle(it)} aria-label={it.done ? "Desmarcar" : "Marcar como comprado"}>
        {it.done ? <IoCheckmarkCircle size={26} /> : <IoEllipseOutline size={26} />}
      </button>
      <div className="grow">
        <div className={`name${it.done ? " done" : ""}`}>{it.nombre}</div>
        {barcodes[String(it.id)] && <span className="pill good">Producto exacto</span>}
      </div>
      <div className="stepper" aria-label="Cantidad">
        <button onClick={() => setQuantity(it, qtyNumber(it.cantidad) - 1)} aria-label="Menos"><IoRemove size={16} /></button>
        <span>{it.cantidad}</span>
        <button onClick={() => setQuantity(it, qtyNumber(it.cantidad) + 1)} aria-label="Más"><IoAdd size={16} /></button>
      </div>
      <button className="icon-plain" title="Elegir producto exacto" aria-label="Elegir producto exacto" onClick={() => setPicker(it)}><IoSearchCircleOutline size={24} /></button>
      <button className="icon-plain danger" title="Eliminar" aria-label="Eliminar" onClick={() => removeItem.mutate(it)}><IoTrashOutline size={20} /></button>
    </div>
  );

  return (
    <>
      <PageHeader
        title={
          renaming ? (
            <form className="rename" onSubmit={(e) => { e.preventDefault(); if (title.trim()) rename.mutate(title.trim()); }}>
              <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} onBlur={() => setRenaming(false)} onKeyDown={(e) => e.key === "Escape" && setRenaming(false)} aria-label="Nombre de la lista" />
            </form>
          ) : (
            <span className="editable" onClick={() => { setTitle(list.nombre); setRenaming(true); }} title="Tocá para renombrar">{list.nombre} <IoPencil size={18} /></span>
          )
        }
        subtitle={`${plural(items.length, "producto", "productos")} · ${done.length} comprados`}
        back="/lists"
        right={
          <div className="ph-actions">
            <button className="icon-btn" onClick={share} aria-label="Compartir" title="Copiar / compartir"><IoCopyOutline size={22} /></button>
            <a className="icon-btn" href={whatsappUrl(listText(list.nombre, items))} target="_blank" rel="noreferrer" aria-label="WhatsApp" title="Enviar por WhatsApp"><IoLogoWhatsapp size={22} /></a>
          </div>
        }
      />
      <div className="content">
        <form className="card add-card" onSubmit={submit}>
          <div className="add-row">
            <Field placeholder="Agregar un producto..." value={prod} onChange={(e) => setProd(e.target.value)} />
            <Field className="qty-field" aria-label="Cantidad" inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value.replace(/\D/g, ""))} />
            <button className="btn icon" aria-label="Agregar" disabled={addItem.isPending}><IoAdd size={24} /></button>
          </div>
        </form>

        {items.length > 0 && (
          <div className="card">
            <Progress value={done.length} total={items.length} />
            <div className="toolbar tight">
              <span className="muted">{done.length} de {items.length} comprados</span>
              <span className="spacer" />
              <button className="link blue" onClick={() => markAll(done.length !== items.length)}>{done.length === items.length ? "Desmarcar todos" : "Marcar todos"}</button>
              {done.length > 0 && <button className="link blue" onClick={() => setConfirmClear(true)}>Quitar comprados</button>}
            </div>
          </div>
        )}

        {items.length === 0 ? (
          <div className="card"><EmptyState icon={<IoSearchCircleOutline size={40} />} title="Agregá productos para empezar">Escribilos arriba o buscá en <b>Buscar</b>.</EmptyState></div>
        ) : (
          <>
            {pending.length > 0 && <div className="card flush">{pending.map(renderItem)}</div>}
            {done.length > 0 && (
              <>
                <button className="section-toggle" onClick={() => setShowDone((v) => !v)}>
                  {showDone ? <IoChevronDown size={18} /> : <IoChevronForward size={18} />} Comprados ({done.length})
                </button>
                {showDone && <div className="card flush">{done.map(renderItem)}</div>}
              </>
            )}
          </>
        )}

        {/* ---- comparar ---- */}
        {items.length > 0 && (
          <div className="card compare-card">
            <h3>Comparar esta lista</h3>
            <p className="muted" style={{ marginTop: 0 }}>Elegí en qué supermercados buscar:</p>
            <div className="chips">
              {STORES.map((s) => <StoreChip key={s} store={s} on={sources ? sources[s] : true} onClick={() => toggleStore(s)} />)}
            </div>
            <button className="btn secondary" disabled={compare.isPending || !enabled.length} onClick={() => compare.mutate()}>
              <IoStatsChartOutline size={20} /> {compare.isPending ? "Iniciando..." : "Comparar lista"}
            </button>
            {last && (
              <button className="last-compare" onClick={() => nav(`/compare/${last.id}`)}>
                <span className="muted">Última comparación · {timeAgo(last.created_at)}</span>
                <span className="lc-main">
                  {last.winner && <><StoreBadge store={last.winner} size={18} /> <b>{money(last.totals[last.winner])}</b></>}
                  <IoChevronForward size={18} />
                </span>
              </button>
            )}
          </div>
        )}
      </div>

      {picker && <ProductPicker initialQuery={picker.nombre} onPick={(g) => pick(picker, g)} onClose={() => setPicker(null)} />}
      {confirmClear && <Confirm title="Quitar comprados" text={`Se van a eliminar ${plural(done.length, "producto comprado", "productos comprados")} de la lista.`} confirmLabel="Quitar" onConfirm={clearDone} onClose={() => setConfirmClear(false)} />}
    </>
  );
}
