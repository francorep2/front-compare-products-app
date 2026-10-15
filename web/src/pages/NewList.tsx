import { useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { IoAdd, IoTrashOutline } from "react-icons/io5";
import * as api from "../api/endpoints";
import { useInvalidate } from "../api/queries";
import { PageHeader } from "../layout/Shell";
import { parseBulk, type Draft } from "../lib/parse";
import { Field, TextArea } from "../ui/Field";
import { Tabs, ErrorBox } from "../ui/Misc";
import { errMsg, useToast } from "../ui/Toast";

/** Nueva lista: se arma en memoria (uno por uno o pegando varios) y se guarda de una vez. */
export function NewList() {
  const nav = useNavigate();
  const inv = useInvalidate();
  const { toast } = useToast();
  const [nombre, setNombre] = useState("");
  const [mode, setMode] = useState<"one" | "paste">("one");
  const [items, setItems] = useState<Draft[]>([]);
  const [prod, setProd] = useState("");
  const [qty, setQty] = useState("1");
  const [bulk, setBulk] = useState("");
  const parsed = useMemo(() => parseBulk(bulk), [bulk]);

  const add = (e: FormEvent) => {
    e.preventDefault();
    if (!prod.trim()) return;
    setItems([...items, { nombre: prod.trim(), cantidad: qty.trim() || "1" }]);
    setProd(""); setQty("1");
  };

  const addBulk = () => {
    setItems([...items, ...parsed]);
    setBulk("");
    setMode("one");
    toast(`${parsed.length} producto${parsed.length === 1 ? "" : "s"} agregado${parsed.length === 1 ? "" : "s"}`);
  };

  const save = useMutation({
    mutationFn: async () => {
      const list = await api.createList(nombre.trim());
      for (const it of items) await api.addItem(list.id, it.nombre, it.cantidad);
      return list;
    },
    onSuccess: (list) => {
      inv.lists();
      toast(`Lista "${list.nombre}" creada`);
      nav(`/list/${list.id}`, { replace: true });
    },
  });

  return (
    <>
      <PageHeader title="Nueva lista" subtitle="Agregá tus productos y compará precios" />
      <div className="content narrow">
        <div className="card">
          <Field label="Nombre de la lista" placeholder="Ej: Compras del mes" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          <Tabs value={mode} onChange={setMode} tabs={[{ id: "one", label: "Uno por uno" }, { id: "paste", label: "Pegar lista" }]} />
          {mode === "one" ? (
            <form className="add-row" onSubmit={add}>
              <Field placeholder="Agregar un producto..." value={prod} onChange={(e) => setProd(e.target.value)} />
              <Field className="qty-field" aria-label="Cantidad" inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value.replace(/\D/g, ""))} />
              <button className="btn icon" aria-label="Agregar"><IoAdd size={24} /></button>
            </form>
          ) : (
            <>
              <TextArea
                rows={6}
                placeholder={"Pegá tu lista, un producto por línea:\n2 leche la serenisima 1l\narroz gallo oro 1kg\nyerba x2"}
                value={bulk}
                onChange={(e) => setBulk(e.target.value)}
                hint="Entiende cantidades como “2 leche”, “leche x2” o “leche (2)”."
              />
              <button className="btn secondary" disabled={!parsed.length} onClick={addBulk}>
                Agregar {parsed.length ? `${parsed.length} producto${parsed.length === 1 ? "" : "s"}` : ""}
              </button>
            </>
          )}
        </div>

        <div className="card flush">
          {items.length === 0 ? (
            <div className="empty small"><b>Tu lista está vacía</b><p>Agregá productos con el formulario de arriba.</p></div>
          ) : items.map((it, i) => (
            <div className="item" key={i}>
              <span className="name">{it.nombre}</span>
              <span className="muted">x{it.cantidad}</span>
              <button className="icon-plain" aria-label="Quitar" onClick={() => setItems(items.filter((_, j) => j !== i))}><IoTrashOutline size={20} /></button>
            </div>
          ))}
        </div>

        <ErrorBox>{save.error ? errMsg(save.error) : ""}</ErrorBox>
        <button className="btn" disabled={!nombre.trim() || save.isPending} onClick={() => save.mutate()}>
          {save.isPending ? "Guardando..." : `Guardar lista${items.length ? ` (${items.length})` : ""}`}
        </button>
      </div>
    </>
  );
}
