import { useState, type FormEvent } from "react";
import { IoCheckmarkCircleOutline, IoSearchOutline } from "react-icons/io5";
import { useQuery } from "@tanstack/react-query";
import * as api from "../api/endpoints";
import { useSources } from "../api/queries";
import { groupByProduct, type ProductGroup } from "../lib/group";
import { Field } from "../ui/Field";
import { Modal } from "../ui/Modal";
import { ErrorBox, SkeletonCards } from "../ui/Misc";
import { errMsg } from "../ui/Toast";
import { ProductCard } from "./ProductCard";

/**
 * "Elegir producto exacto": busca el ítem en todas las tiendas y deja elegir cuál es.
 * Al elegir se usa el código de barras (EAN) para comparar EXACTAMENTE ese producto en cada tienda.
 */
export function ProductPicker({
  initialQuery, onPick, onClose,
}: { initialQuery: string; onPick: (g: ProductGroup) => void; onClose: () => void }) {
  const { data: sources } = useSources();
  const [input, setInput] = useState(initialQuery);
  const [q, setQ] = useState(initialQuery);
  const enabled = api.enabledOf(sources ?? api.ALL_SOURCES);

  const { data, isFetching, error } = useQuery({
    queryKey: ["picker", q, enabled.join(",")],
    queryFn: () => api.searchAll(q, enabled, 5),
    enabled: q.trim().length > 1,
    staleTime: 5 * 60_000,
  });
  const groups = data ? groupByProduct(data) : [];

  const submit = (e: FormEvent) => { e.preventDefault(); setQ(input.trim()); };

  return (
    <Modal title="Elegir producto exacto" onClose={onClose} wide>
      <form onSubmit={submit} style={{ marginBottom: 12 }}>
        <Field icon={<IoSearchOutline size={20} />} placeholder="Buscar producto..." value={input} onChange={(e) => setInput(e.target.value)} />
      </form>
      <p className="muted" style={{ marginTop: 0 }}>Elegí cuál es: así se compara exactamente el mismo producto en todas las tiendas.</p>
      <ErrorBox>{error ? errMsg(error) : ""}</ErrorBox>
      {isFetching && <SkeletonCards n={3} />}
      {!isFetching && data && groups.length === 0 && <p className="muted">No encontramos productos. Probá con otra búsqueda.</p>}
      {!isFetching && groups.map((g) => (
        <ProductCard
          key={g.key}
          group={g}
          compact
          actions={<button className="btn small" onClick={() => onPick(g)}><IoCheckmarkCircleOutline size={18} /> Elegir</button>}
        />
      ))}
    </Modal>
  );
}
