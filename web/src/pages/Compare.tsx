import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { IoTrophy } from "react-icons/io5";
import * as api from "../api";
import { PageHeader } from "../components/Layout";
import { ErrorBox, Spinner, errMsg } from "../components/ui";

export function Compare() {
  const { taskId = "" } = useParams();
  const [res, setRes] = useState<api.Comparison | null>(null);
  const [err, setErr] = useState("");

  // Polling cada 1,5 s hasta que la tarea termine.
  useEffect(() => {
    let stop = false;
    let timer: number | undefined;
    const tick = async () => {
      try {
        const r = await api.getComparison(taskId);
        if (stop) return;
        setRes(r);
        if (r.status !== "completed") timer = window.setTimeout(tick, 1500);
      } catch (e) {
        if (!stop) setErr(errMsg(e));
      }
    };
    tick();
    return () => { stop = true; window.clearTimeout(timer); };
  }, [taskId]);

  const data = res?.status === "completed" ? res.data : null;
  const rows = data ? Object.entries(data.totals_by_store).sort((a, b) => a[1].missing_count - b[1].missing_count || a[1].total - b[1].total) : [];

  return (
    <>
      <PageHeader title="Resultados" back="/purchases" />
      <div className="content">
        <ErrorBox>{err}</ErrorBox>
        {!data && !err && <div className="card"><Spinner label="Comparando precios... buscando en los supermercados" /></div>}
        {data && !rows.length && <div className="card empty"><b>No pudimos comparar esta lista.</b>Probá de nuevo en un rato.</div>}

        {data?.winner && (
          <div className="card winner">
            <IoTrophy size={32} />
            <div>
              <b>{data.winner}</b> es la opción más barata
              <div style={{ fontSize: 14, color: "var(--gray600)" }}>Total: {api.money(data.totals_by_store[data.winner].total)}</div>
            </div>
          </div>
        )}
        {data && !data.winner && rows.length > 0 && (
          <div className="card" style={{ color: "var(--gray600)" }}>Ningún súper tiene todos los productos de tu lista. Mirá los faltantes abajo.</div>
        )}

        {rows.map(([store, s]) => (
          <div className="card" key={store} style={store === data?.winner ? { border: "2px solid var(--success)" } : undefined}>
            <div className="total-row">
              <b style={{ textTransform: "capitalize", fontSize: 18 }}>{store}</b>
              <span className="amount">{api.money(s.total)}</span>
            </div>
            {s.missing_count > 0 && (
              <div className="missing">No encontrado ({s.missing_count}): {s.missing_items.join(", ")}</div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
