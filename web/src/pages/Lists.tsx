import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import {
  IoAdd, IoCartOutline, IoCheckbox, IoCopyOutline, IoGitCompareOutline, IoSquareOutline, IoStatsChartOutline, IoTrashOutline,
} from "react-icons/io5";
import * as api from "../api/endpoints";
import { useHistory, useInvalidate, useListsWithItems, useSources } from "../api/queries";
import type { ListDetail } from "../api/types";
import { PageHeader } from "../layout/Shell";
import { dateTime, money, plural, timeAgo } from "../lib/format";
import { qtyNumber } from "../lib/parse";
import { getItemBarcodes } from "../lib/storage";
import { Confirm, Modal } from "../ui/Modal";
import { EmptyState, ErrorBox, Progress, SkeletonCards, StoreBadge, Tabs } from "../ui/Misc";
import { errMsg, useToast } from "../ui/Toast";

type Tab = "lists" | "comparisons";

/** Mis listas + historial de comparaciones (con la herramienta "comparar carritos"). */
export function Lists() {
  const [params, setParams] = useSearchParams();
  const tab: Tab = params.get("tab") === "comparisons" ? "comparisons" : "lists";
  return (
    <>
      <PageHeader title="Mis listas" subtitle="Tus listas de compras y tus comparaciones guardadas." />
      <div className="content">
        <Tabs value={tab} onChange={(t) => setParams(t === "lists" ? {} : { tab: t })} tabs={[{ id: "lists", label: "Listas" }, { id: "comparisons", label: "Comparaciones" }]} />
        {tab === "lists" ? <ListsTab /> : <ComparisonsTab />}
      </div>
    </>
  );
}

function ListsTab() {
  const nav = useNavigate();
  const { data: lists, isLoading, error } = useListsWithItems();
  const inv = useInvalidate();
  const { toast } = useToast();
  const [toDelete, setToDelete] = useState<ListDetail | null>(null);

  const remove = useMutation({
    mutationFn: (id: number) => api.deleteList(id),
    onSuccess: () => { inv.lists(); toast("Lista eliminada"); },
    onError: (e) => toast(errMsg(e), "error"),
  });
  const duplicate = useMutation({
    mutationFn: async (l: ListDetail) => {
      const copy = await api.createList(`${l.nombre} (copia)`);
      for (const it of l.items) await api.addItem(copy.id, it.nombre, it.cantidad);
      return copy;
    },
    onSuccess: (copy) => { inv.lists(); toast("Lista duplicada"); nav(`/list/${copy.id}`); },
    onError: (e) => toast(errMsg(e), "error"),
  });

  if (isLoading) return <SkeletonCards n={3} />;
  if (error) return <ErrorBox>{errMsg(error)}</ErrorBox>;

  return (
    <>
      <div className="toolbar">
        <button className="btn small" onClick={() => nav("/new-list")}><IoAdd size={18} /> Nueva lista</button>
      </div>
      {!lists || lists.length === 0 ? (
        <div className="card">
          <EmptyState icon={<IoCartOutline size={40} />} title="Aún no tienes listas" action={<button className="btn small" onClick={() => nav("/new-list")}>Crear tu primera lista</button>}>
            Armá una lista y compará precios entre supermercados.
          </EmptyState>
        </div>
      ) : (
        <div className="grid">
          {[...lists].sort((a, b) => b.id - a.id).map((l) => {
            const done = l.items.filter((i) => i.done).length;
            return (
              <div className="card list-card" key={l.id} onClick={() => nav(`/list/${l.id}`)} role="link" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && nav(`/list/${l.id}`)}>
                <div className="list-card-top">
                  <IoCartOutline size={26} className="lead" />
                  <div className="grow">
                    <div className="title">{l.nombre}</div>
                    <div className="desc">{plural(l.items.length, "producto", "productos")} · creada el {l.created_at}</div>
                  </div>
                </div>
                {l.items.length > 0 && (
                  <>
                    <Progress value={done} total={l.items.length} />
                    <div className="desc">{done}/{l.items.length} comprados</div>
                  </>
                )}
                <div className="list-card-actions" onClick={(e) => e.stopPropagation()}>
                  <button className="icon-plain" title="Duplicar" aria-label="Duplicar" onClick={() => duplicate.mutate(l)}><IoCopyOutline size={19} /></button>
                  <button className="icon-plain" title="Eliminar" aria-label="Eliminar" onClick={() => setToDelete(l)}><IoTrashOutline size={19} /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {toDelete && (
        <Confirm title="Eliminar lista" text={`Vas a eliminar "${toDelete.nombre}" y sus ${toDelete.items.length} productos.`} onConfirm={() => remove.mutate(toDelete.id)} onClose={() => setToDelete(null)} />
      )}
    </>
  );
}

function ComparisonsTab() {
  const nav = useNavigate();
  const { data, isLoading, error } = useHistory();
  const inv = useInvalidate();
  const { toast } = useToast();
  const [sel, setSel] = useState<string[]>([]);
  const [lists, setLists] = useState(false);

  const remove = useMutation({
    mutationFn: (id: string) => api.deleteComparison(id),
    onSuccess: (_d, id) => { setSel((s) => s.filter((x) => x !== id)); inv.history(); toast("Comparación eliminada"); },
    onError: (e) => toast(errMsg(e), "error"),
  });
  const toggle = (id: string) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length >= 2 ? [s[1], id] : [...s, id]));

  if (isLoading) return <SkeletonCards n={3} />;
  if (error) return <ErrorBox>{errMsg(error)}</ErrorBox>;
  const rows = (data ?? []).filter((h) => h.status === "completed");

  return (
    <>
      <div className="toolbar">
        <button className="btn small ghost" onClick={() => setLists(true)}><IoGitCompareOutline size={18} /> Comparar dos listas</button>
        <button className="btn small" disabled={sel.length !== 2} onClick={() => nav(`/compare/diff?a=${sel[0]}&b=${sel[1]}`)}>
          <IoGitCompareOutline size={18} /> Comparar seleccionadas ({sel.length}/2)
        </button>
      </div>
      {rows.length === 0 ? (
        <div className="card">
          <EmptyState icon={<IoStatsChartOutline size={40} />} title="Todavía no hay comparaciones">
            Abrí una lista y tocá <b>Comparar</b>. Acá van a quedar guardadas para ver cómo cambian los precios.
          </EmptyState>
        </div>
      ) : (
        <>
          <p className="muted" style={{ marginTop: 0 }}>Tildá dos comparaciones para ver cómo cambió el precio entre una y otra.</p>
          <div className="card flush">
            {rows.map((h) => (
              <div className="row static" key={h.id}>
                <button className="icon-plain check-btn" aria-label="Seleccionar" onClick={() => toggle(h.id)}>
                  {sel.includes(h.id) ? <IoCheckbox size={24} color="var(--primary)" /> : <IoSquareOutline size={24} />}
                </button>
                <button className="grow row-main" onClick={() => nav(`/compare/${h.id}`)}>
                  <div className="title">{h.title || "Comparación"}</div>
                  <div className="desc">{dateTime(h.created_at)} · {timeAgo(h.created_at)} · {plural(h.items_count ?? 0, "producto", "productos")}</div>
                </button>
                {h.winner && (
                  <div className="right-col">
                    <StoreBadge store={h.winner} size={18} />
                    <span className="amount-sm">{money(h.totals[h.winner])}</span>
                  </div>
                )}
                <button className="icon-plain" aria-label="Eliminar" onClick={() => remove.mutate(h.id)}><IoTrashOutline size={19} /></button>
              </div>
            ))}
          </div>
        </>
      )}
      {lists && <CompareListsModal onClose={() => setLists(false)} />}
    </>
  );
}

/** Compara dos listas (carritos) distintas: lanza una comparación de cada una y abre la vista lado a lado. */
function CompareListsModal({ onClose }: { onClose: () => void }) {
  const nav = useNavigate();
  const { data: lists } = useListsWithItems();
  const { data: sources } = useSources();
  const inv = useInvalidate();
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const usable = (lists ?? []).filter((l) => l.items.length > 0);

  const start = useMutation({
    mutationFn: async () => {
      const barcodes = getItemBarcodes();
      const enabled = api.enabledOf(sources ?? api.ALL_SOURCES);
      const run = (l: ListDetail) =>
        api.startComparison(
          l.items.map((i) => ({ nombre: i.nombre, cantidad: qtyNumber(i.cantidad), barcode: barcodes[String(i.id)] ?? null })),
          enabled, { list_id: l.id, title: l.nombre },
        );
      const la = usable.find((l) => String(l.id) === a)!;
      const lb = usable.find((l) => String(l.id) === b)!;
      const [ra, rb] = await Promise.all([run(la), run(lb)]);
      return [ra.task_id, rb.task_id];
    },
    onSuccess: ([ta, tb]) => { inv.history(); nav(`/compare/diff?a=${ta}&b=${tb}`); },
  });

  return (
    <Modal
      title="Comparar dos listas"
      onClose={onClose}
      footer={
        <>
          <button className="btn ghost" onClick={onClose}>Cancelar</button>
          <button className="btn" disabled={!a || !b || a === b || start.isPending} onClick={() => start.mutate()}>{start.isPending ? "Iniciando..." : "Comparar"}</button>
        </>
      }
    >
      {usable.length < 2 ? (
        <p className="muted" style={{ margin: 0 }}>Necesitás al menos dos listas con productos.</p>
      ) : (
        <>
          <p className="muted" style={{ marginTop: 0 }}>Elegí dos carritos y vemos cuánto sale cada uno en cada supermercado.</p>
          {[["Carrito A", a, setA], ["Carrito B", b, setB]].map(([label, val, set]) => (
            <label className="field-wrap" key={label as string}>
              <span className="field-label">{label as string}</span>
              <select className="select" value={val as string} onChange={(e) => (set as (v: string) => void)(e.target.value)}>
                <option value="">Elegir lista…</option>
                {usable.map((l) => <option key={l.id} value={l.id}>{l.nombre} ({l.items.length})</option>)}
              </select>
            </label>
          ))}
          {a && a === b && <ErrorBox>Elegí dos listas distintas.</ErrorBox>}
          <ErrorBox>{start.error ? errMsg(start.error) : ""}</ErrorBox>
        </>
      )}
    </Modal>
  );
}
