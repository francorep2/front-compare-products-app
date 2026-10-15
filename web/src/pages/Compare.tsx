import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import {
  IoCheckmarkCircle, IoCopyOutline, IoLogoWhatsapp, IoOpenOutline, IoRefresh, IoSearchOutline, IoSparkles, IoTrashOutline, IoTrophy,
} from "react-icons/io5";
import * as api from "../api/endpoints";
import { useComparison, useInvalidate } from "../api/queries";
import type { CompareData, ComparisonTask } from "../api/types";
import { PageHeader } from "../layout/Shell";
import { dateTime, money, pct, plural } from "../lib/format";
import { compareText, copyText, whatsappUrl } from "../lib/share";
import { Confirm } from "../ui/Modal";
import { Img } from "../ui/Img";
import { EmptyState, ErrorBox, Spinner, StoreBadge, Tabs } from "../ui/Misc";
import { STORE_META, storeName } from "../ui/store";
import { errMsg, useToast } from "../ui/Toast";

type Tab = "stores" | "combo" | "table";

export function Compare() {
  const { taskId } = useParams();
  const nav = useNavigate();
  const { toast } = useToast();
  const inv = useInvalidate();
  const { data: task, error } = useComparison(taskId);
  const [tab, setTab] = useState<Tab>("stores");
  const [confirm, setConfirm] = useState(false);

  const data = task?.status === "completed" ? task.data : null;
  const title = task?.title || "Comparación";

  const rerun = useMutation({
    mutationFn: () => {
      const items = data!.lines!.map((l) => ({ nombre: l.name, cantidad: l.quantity, barcode: l.barcode ?? null }));
      return api.startComparison(items, data!.stores ?? [...Object.keys(data!.totals_by_store)], { list_id: task!.list_id ?? undefined, title: task!.title ?? undefined });
    },
    onSuccess: (r) => { inv.history(); nav(`/compare/${r.task_id}`, { replace: true }); setTab("stores"); },
    onError: (e) => toast(errMsg(e), "error"),
  });
  const remove = useMutation({
    mutationFn: () => api.deleteComparison(taskId!),
    onSuccess: () => { inv.history(); toast("Comparación eliminada"); nav("/lists?tab=comparisons", { replace: true }); },
    onError: (e) => toast(errMsg(e), "error"),
  });

  const share = async () => {
    if (!data) return;
    const text = compareText(task?.title ?? null, data);
    if (navigator.share) { try { await navigator.share({ text }); return; } catch { /* cancelado */ } }
    toast((await copyText(text)) ? "Resultado copiado al portapapeles" : "No se pudo copiar", "info");
  };

  if (error) return (<><PageHeader title="Resultados" back="/lists?tab=comparisons" /><div className="content"><ErrorBox>{errMsg(error)}</ErrorBox></div></>);
  if (!task || !data) return <Processing task={task} />;
  if (data.error || !Object.keys(data.totals_by_store).length) {
    return (
      <>
        <PageHeader title="Resultados" back="/lists?tab=comparisons" />
        <div className="content"><div className="card"><EmptyState icon={<IoSearchOutline size={40} />} title="No pudimos comparar esta lista">Probá de nuevo en un rato.</EmptyState></div></div>
      </>
    );
  }

  const hasLines = !!data.lines?.length;
  const canCombo = !!data.optimal?.items.length;
  const tabs = [{ id: "stores" as Tab, label: "Por tienda" }, ...(canCombo ? [{ id: "combo" as Tab, label: "Mejor combinación" }] : []), ...(hasLines ? [{ id: "table" as Tab, label: "Producto por producto" }] : [])];

  return (
    <>
      <PageHeader
        title={title}
        subtitle={`${dateTime(task.created_at)} · ${plural(data.items_count ?? data.lines?.length ?? 0, "producto", "productos")}`}
        back={task.list_id ? `/list/${task.list_id}` : "/lists?tab=comparisons"}
        right={
          <div className="ph-actions">
            <button className="icon-btn" onClick={share} aria-label="Copiar resultado" title="Copiar / compartir"><IoCopyOutline size={22} /></button>
            <a className="icon-btn" href={whatsappUrl(compareText(task.title, data))} target="_blank" rel="noreferrer" aria-label="WhatsApp" title="Enviar por WhatsApp"><IoLogoWhatsapp size={22} /></a>
          </div>
        }
      />
      <div className="content">
        <Hero data={data} onCombo={canCombo ? () => setTab("combo") : undefined} />

        <Tabs value={tab} onChange={setTab} tabs={tabs} />
        {tab === "stores" && <ByStore data={data} />}
        {tab === "combo" && canCombo && <Combo data={data} />}
        {tab === "table" && hasLines && <Table data={data} />}

        <div className="toolbar" style={{ marginTop: 18 }}>
          {hasLines && <button className="btn small ghost" disabled={rerun.isPending} onClick={() => rerun.mutate()}><IoRefresh size={18} /> {rerun.isPending ? "Iniciando..." : "Volver a comparar"}</button>}
          <Link className="btn small ghost" to="/lists?tab=comparisons">Ver historial</Link>
          <span className="spacer" />
          <button className="btn small ghost danger-text" onClick={() => setConfirm(true)}><IoTrashOutline size={18} /> Eliminar</button>
        </div>
      </div>
      {confirm && <Confirm title="Eliminar comparación" text="Se borra de tu historial." onConfirm={() => remove.mutate()} onClose={() => setConfirm(false)} />}
    </>
  );
}

function Processing({ task }: { task?: ComparisonTask }) {
  const steps = ["Buscando en Coto…", "Buscando en Carrefour…", "Buscando en Jumbo…", "Buscando en Día…", "Armando la comparación…"];
  const [i] = useState(() => Math.floor(Math.random() * 2));
  return (
    <>
      <PageHeader title="Comparando precios" subtitle={task?.title ?? undefined} back="/lists" />
      <div className="content">
        <div className="card"><Spinner label={steps[(i + 1) % steps.length]} /><p className="muted" style={{ textAlign: "center", marginTop: -8 }}>Suele tardar unos segundos.</p></div>
      </div>
    </>
  );
}

function Hero({ data, onCombo }: { data: CompareData; onCombo?: () => void }) {
  const w = data.winner;
  // solo vale la pena avisar si la combinación ahorra algo significativo (no $1 de redondeo)
  const winnerTotal = w ? data.totals_by_store[w].total : 0;
  const rawGain = data.optimal?.savings_vs_winner ?? 0;
  const gain = rawGain >= Math.max(50, winnerTotal * 0.01) ? rawGain : 0;
  return (
    <>
      {w ? (
        <div className="card hero winner">
          <div className="hero-icon"><IoTrophy size={30} /></div>
          <div className="grow">
            <div className="hero-kicker">La opción más barata</div>
            <div className="hero-main"><StoreBadge store={w} size={30} /></div>
            <div className="hero-total">{money(data.totals_by_store[w].total)}</div>
            {data.savings && <div className="hero-save">Ahorrás {money(data.savings.amount)} ({pct(data.savings.pct)}) vs {storeName(data.savings.vs_store)}</div>}
          </div>
        </div>
      ) : (
        <div className="card hero warn">
          <div className="grow">
            <div className="hero-kicker">Ningún súper tiene todos los productos</div>
            <div className="muted">Mirá qué falta en cada uno{data.optimal?.items.length ? " o la mejor combinación entre tiendas" : ""}.</div>
          </div>
        </div>
      )}
      {gain > 0 && onCombo && (
        <button className="card combo-banner" onClick={onCombo}>
          <IoSparkles size={26} />
          <div className="grow">
            <b>Comprando cada producto donde sale más barato ahorrás {money(gain)} más</b>
            <div className="muted">{data.optimal!.stores_used.map(storeName).join(" + ")} · total {money(data.optimal!.total)}</div>
          </div>
        </button>
      )}
    </>
  );
}

function ByStore({ data }: { data: CompareData }) {
  const rows = Object.entries(data.totals_by_store).sort((a, b) => a[1].missing_count - b[1].missing_count || a[1].total - b[1].total);
  const max = Math.max(...rows.map(([, v]) => v.total), 1);
  return (
    <>
      {rows.map(([store, s], i) => (
        <div className={`card store-row${store === data.winner ? " is-winner" : ""}`} key={store}>
          <div className="store-row-top">
            <span className="rank">{i + 1}</span>
            <StoreBadge store={store} size={26} />
            {store === data.winner && <span className="pill good"><IoCheckmarkCircle size={14} /> Más barato</span>}
            <span className="spacer" />
            <span className="amount">{money(s.total)}</span>
          </div>
          <div className="bar"><span style={{ width: `${(s.total / max) * 100}%`, background: STORE_META[store as keyof typeof STORE_META]?.color }} /></div>
          {s.missing_count > 0 ? (
            <div className="missing">
              <b>No encontrado ({s.missing_count}):</b>{" "}
              {s.missing_items.map((m, k) => <span key={m + k}><Link to={`/search?q=${encodeURIComponent(m)}`} className="link blue">{m}</Link>{k < s.missing_items.length - 1 ? ", " : ""}</span>)}
              <div className="muted" style={{ fontSize: 12 }}>El total de esta tienda no incluye esos productos.</div>
            </div>
          ) : (
            <div className="muted" style={{ fontSize: 13 }}>Tiene todos los productos</div>
          )}
        </div>
      ))}
    </>
  );
}

function Combo({ data }: { data: CompareData }) {
  const opt = data.optimal!;
  const byStore = useMemo(() => {
    const m = new Map<string, typeof opt.items>();
    for (const it of opt.items) m.set(it.store, [...(m.get(it.store) ?? []), it]);
    return [...m.entries()];
  }, [opt]);
  return (
    <>
      <div className="card combo-total">
        <div><div className="muted">Total de la mejor combinación</div><div className="amount big">{money(opt.total)}</div></div>
        <div className="muted right-text">{plural(byStore.length, "tienda", "tiendas")}{opt.savings_vs_winner && opt.savings_vs_winner > 0 ? <><br /><b style={{ color: "var(--success)" }}>−{money(opt.savings_vs_winner)} vs {storeName(data.winner!)}</b></> : null}</div>
      </div>
      {byStore.map(([store, items]) => (
        <div className="card flush" key={store}>
          <div className="store-head"><StoreBadge store={store} size={26} /><span className="spacer" /><b>{money(items.reduce((n, i) => n + i.subtotal, 0))}</b></div>
          {items.map((i) => (
            <div className="result" key={i.name}>
              <Img src={i.image_url ?? undefined} />
              <div className="grow">
                <a className="name" href={i.url ?? undefined} target="_blank" rel="noreferrer">{i.found_name}</a>
                <div className="muted" style={{ fontSize: 13 }}>{i.quantity} × {money(i.price)}{i.promotion && <span className="badge">{i.promotion}</span>}</div>
              </div>
              <b>{money(i.subtotal)}</b>
            </div>
          ))}
        </div>
      ))}
      {opt.missing_items.length > 0 && <div className="card missing">No encontrado en ninguna tienda: {opt.missing_items.join(", ")}</div>}
    </>
  );
}

function Table({ data }: { data: CompareData }) {
  const stores = data.stores ?? Object.keys(data.totals_by_store);
  return (
    <div className="card flush table-wrap">
      <table className="cmp-table">
        <thead>
          <tr>
            <th>Producto</th>
            {stores.map((s) => <th key={s}><StoreBadge store={s} size={18} /></th>)}
          </tr>
        </thead>
        <tbody>
          {data.lines!.map((l) => (
            <tr key={l.name}>
              <td><div className="cell-name">{l.name}</div>{l.quantity > 1 && <div className="muted" style={{ fontSize: 12 }}>x{l.quantity}</div>}</td>
              {stores.map((s) => {
                const o = l.offers[s];
                if (!o) return <td key={s} className="na" title="No encontrado">—</td>;
                return (
                  <td key={s} className={l.cheapest === s ? "best" : ""}>
                    <a href={o.url ?? undefined} target="_blank" rel="noreferrer" title={o.found_name}>
                      {money(o.price)}
                      {l.quantity > 1 && <small>{money(o.price * l.quantity)}</small>}
                      {o.promotion && <span className="badge">{o.promotion}</span>}
                      <IoOpenOutline size={11} className="open" />
                    </a>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td>Total</td>
            {stores.map((s) => <td key={s} className={s === data.winner ? "best" : ""}>{money(data.totals_by_store[s]?.total)}</td>)}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
