import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import * as api from "../api/endpoints";
import { useInvalidate, useLists } from "../api/queries";
import { setItemBarcode } from "../lib/storage";
import { Field } from "../ui/Field";
import { Modal } from "../ui/Modal";
import { ErrorBox } from "../ui/Misc";
import { errMsg, useToast } from "../ui/Toast";

/** Agrega un producto (de la búsqueda) a una lista existente o a una nueva. */
export function AddToListModal({
  product, onClose, onAdded,
}: { product: { title: string; barcode?: string | null }; onClose: () => void; onAdded?: (listName: string) => void }) {
  const { data: lists } = useLists();
  const inv = useInvalidate();
  const { toast } = useToast();
  const [target, setTarget] = useState<string>("");
  const [newName, setNewName] = useState("");
  const [qty, setQty] = useState("1");
  const listId = target || (lists && lists.length ? String(lists[lists.length - 1].id) : "new");
  const creating = listId === "new";

  const add = useMutation({
    mutationFn: async () => {
      let id = Number(listId);
      let name = lists?.find((l) => l.id === id)?.nombre ?? "";
      if (creating) {
        const l = await api.createList(newName.trim());
        id = l.id;
        name = l.nombre;
      }
      const it = await api.addItem(id, product.title, qty.trim() || "1");
      if (product.barcode) setItemBarcode(it.id, product.barcode);
      return name;
    },
    onSuccess: (name) => {
      inv.lists();
      toast(`Agregado a "${name}"`);
      onAdded?.(name);
      onClose();
    },
  });

  return (
    <Modal
      title="Agregar a una lista"
      onClose={onClose}
      footer={
        <>
          <button className="btn ghost" onClick={onClose}>Cancelar</button>
          <button className="btn" disabled={add.isPending || (creating && !newName.trim())} onClick={() => add.mutate()}>
            {add.isPending ? "Agregando..." : "Agregar"}
          </button>
        </>
      }
    >
      <p style={{ marginTop: 0, fontWeight: 600 }}>{product.title}</p>
      <label className="field-wrap">
        <span className="field-label">Lista</span>
        <select className="select" value={listId} onChange={(e) => setTarget(e.target.value)}>
          {lists?.map((l) => <option key={l.id} value={l.id}>{l.nombre}</option>)}
          <option value="new">＋ Nueva lista…</option>
        </select>
      </label>
      {creating && <Field label="Nombre de la lista nueva" placeholder="Ej: Compras del mes" value={newName} onChange={(e) => setNewName(e.target.value)} autoFocus />}
      <Field label="Cantidad" inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value.replace(/\D/g, ""))} style={{ maxWidth: 120 }} />
      <ErrorBox>{add.error ? errMsg(add.error) : ""}</ErrorBox>
    </Modal>
  );
}
