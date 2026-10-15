import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { IoAdd, IoCheckmarkCircle, IoChevronForward, IoEllipseOutline, IoTrashOutline } from "react-icons/io5";
import * as api from "../api";
import { PageHeader } from "../components/Layout";
import { ErrorBox, Field, Spinner, errMsg } from "../components/ui";
import { IoCartOutline, IoStatsChartOutline } from "react-icons/io5";

type Draft = { nombre: string; cantidad: string };

/** Nueva lista: se arma en memoria y se guarda de una vez (igual que la app). */
export function NewList() {
  const nav = useNavigate();
  const [nombre, setNombre] = useState("");
  const [items, setItems] = useState<Draft[]>([]);
  const [prod, setProd] = useState("");
  const [qty, setQty] = useState("1");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const add = (e: FormEvent) => {
    e.preventDefault();
    if (!prod.trim()) return;
    setItems([...items, { nombre: prod.trim(), cantidad: qty.trim() || "1" }]);
    setProd(""); setQty("1");
  };

  const save = async () => {
    setErr(""); setBusy(true);
    try {
      const list = await api.createList(nombre.trim());
      for (const it of items) await api.addItem(list.id, it.nombre, it.cantidad);
      nav(`/list/${list.id}`, { replace: true });
    } catch (e) { setErr(errMsg(e)); setBusy(false); }
  };

  return (
    <>
      <PageHeader title="Nueva lista" subtitle="Agregá tus productos y compará precios" />
      <div className="content">
        <div className="card">
          <Field placeholder="Nombre de la lista (ej: Compras del mes)" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          <form className="add-row" onSubmit={add}>
            <Field placeholder="Agregar un producto..." value={prod} onChange={(e) => setProd(e.target.value)} />
            <Field className="qty-field" aria-label="Cantidad" inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value)} style={{ textAlign: "center" }} />
            <button className="btn" aria-label="Agregar"><IoAdd size={24} /></button>
          </form>
        </div>

        <div className="card flush">
          {items.length === 0 ? (
            <div className="empty"><b>Tu lista está vacía</b>Agrega productos usando el formulario superior.</div>
          ) : items.map((it, i) => (
            <div className="item" key={i}>
              <span className="name">{it.nombre}</span>
              <span style={{ color: "var(--gray500)" }}>x{it.cantidad}</span>
              <button className="icon-plain" aria-label="Quitar" onClick={() => setItems(items.filter((_, j) => j !== i))}><IoTrashOutline size={20} /></button>
            </div>
          ))}
        </div>

        <ErrorBox>{err}</ErrorBox>
        <button className="btn" disabled={!nombre.trim() || busy} onClick={save}>{busy ? "Guardando..." : "Guardar lista"}</button>
      </div>
    </>
  );
}

/** Mis listas. */
export function Purchases() {
  const nav = useNavigate();
  const [lists, setLists] = useState<api.ShoppingList[] | null>(null);
  const [err, setErr] = useState("");

  const load = () => api.getLists().then((l) => setLists([...l].reverse())).catch((e) => setErr(errMsg(e)));
  useEffect(() => { load(); }, []);

  const remove = async (id: number) => {
    if (!confirm("¿Eliminar esta lista?")) return;
    try { await api.deleteList(id); setLists((ls) => (ls || []).filter((l) => l.id !== id)); } catch (e) { setErr(errMsg(e)); }
  };

  return (
    <>
      <PageHeader title="Mis Listas" subtitle="Aquí encontrarás tus listas de compras guardadas." />
      <div className="content">
        <ErrorBox>{err}</ErrorBox>
        {lists === null && !err ? <Spinner /> : lists && lists.length === 0 ? (
          <div className="card empty"><b>Aún no tienes listas</b>Crea tu primera lista con el botón (+)</div>
        ) : (
          <div className="card flush">
            {lists?.map((l) => (
              <div className="row" key={l.id} onClick={() => nav(`/list/${l.id}`)}>
                <IoCartOutline className="lead" size={24} />
                <div className="grow">
                  <div className="title">{l.nombre}</div>
                  <div className="desc">Creada el {l.created_at}</div>
                </div>
                <button className="icon-plain" aria-label="Eliminar" onClick={(e) => { e.stopPropagation(); remove(l.id); }}><IoTrashOutline size={20} /></button>
                <IoChevronForward className="chev" size={22} />
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

/** Detalle de una lista: marcar, editar cantidades, agregar, comparar. */
export function ListDetail() {
  const { id } = useParams();
  const listId = Number(id);
  const nav = useNavigate();
  const [list, setList] = useState<api.ListDetail | null>(null);
  const [err, setErr] = useState("");
  const [prod, setProd] = useState("");
  const [qty, setQty] = useState("1");
  const [comparing, setComparing] = useState(false);

  useEffect(() => { api.getList(listId).then(setList).catch((e) => setErr(errMsg(e))); }, [listId]);

  const patch = (itemId: number, p: Partial<api.ShoppingItem>) =>
    setList((l) => l && { ...l, items: l.items.map((i) => (i.id === itemId ? { ...i, ...p } : i)) });

  const toggle = async (it: api.ShoppingItem) => {
    patch(it.id, { done: !it.done });
    try { await api.updateItem(it.id, { done: !it.done }); } catch (e) { patch(it.id, { done: it.done }); setErr(errMsg(e)); }
  };
  const saveQty = async (it: api.ShoppingItem, cantidad: string) => {
    if (!cantidad.trim() || cantidad === it.cantidad) return;
    try { await api.updateItem(it.id, { cantidad }); patch(it.id, { cantidad }); } catch (e) { setErr(errMsg(e)); }
  };
  const remove = async (it: api.ShoppingItem) => {
    try { await api.deleteItem(it.id); setList((l) => l && { ...l, items: l.items.filter((i) => i.id !== it.id) }); } catch (e) { setErr(errMsg(e)); }
  };
  const add = async (e: FormEvent) => {
    e.preventDefault();
    if (!prod.trim()) return;
    try {
      const it = await api.addItem(listId, prod.trim(), qty.trim() || "1");
      setList((l) => l && { ...l, items: [...l.items, it] });
      setProd(""); setQty("1");
    } catch (e2) { setErr(errMsg(e2)); }
  };

  const compare = async () => {
    if (!list) return;
    setComparing(true); setErr("");
    try {
      const sources = await api.getSources().catch(() => null);
      const items = list.items.map((i) => ({ nombre: i.nombre, cantidad: Math.max(1, parseInt(i.cantidad, 10) || 1) }));
      const r = await api.startComparison(items, sources ? api.enabledOf(sources) : [...api.STORES]);
      nav(`/compare/${r.task_id}`);
    } catch (e2) { setErr(errMsg(e2)); setComparing(false); }
  };

  if (!list) return <><PageHeader title="Lista" back="/purchases" /><div className="content">{err ? <ErrorBox>{err}</ErrorBox> : <Spinner />}</div></>;

  return (
    <>
      <PageHeader title={list.nombre} subtitle={`${list.items.length} producto${list.items.length === 1 ? "" : "s"}`} back="/purchases" />
      <div className="content">
        <ErrorBox>{err}</ErrorBox>
        <div className="card">
          <form className="add-row" onSubmit={add}>
            <Field placeholder="Agregar un producto..." value={prod} onChange={(e) => setProd(e.target.value)} />
            <Field className="qty-field" aria-label="Cantidad" inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value)} style={{ textAlign: "center" }} />
            <button className="btn" aria-label="Agregar"><IoAdd size={24} /></button>
          </form>
        </div>

        <div className="card flush">
          {list.items.length === 0 ? <div className="empty"><b>Agrega productos para empezar.</b></div> : list.items.map((it) => (
            <div className="item" key={it.id}>
              <button className={`check${it.done ? " on" : ""}`} onClick={() => toggle(it)} aria-label="Marcar">
                {it.done ? <IoCheckmarkCircle size={26} /> : <IoEllipseOutline size={26} />}
              </button>
              <span className={`name${it.done ? " done" : ""}`}>{it.nombre}</span>
              <span className="qty">
                x<input defaultValue={it.cantidad} key={it.cantidad} inputMode="numeric" aria-label="Cantidad" onBlur={(e) => saveQty(it, e.target.value)} />
              </span>
              <button className="icon-plain" aria-label="Eliminar" onClick={() => remove(it)}><IoTrashOutline size={20} /></button>
            </div>
          ))}
        </div>

        <button className="btn secondary" disabled={list.items.length === 0 || comparing} onClick={compare}>
          <IoStatsChartOutline size={20} /> {comparing ? "Iniciando..." : "Comparar Lista"}
        </button>
      </div>
    </>
  );
}
