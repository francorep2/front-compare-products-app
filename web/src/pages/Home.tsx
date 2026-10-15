import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  IoAddCircleOutline, IoCartOutline, IoChatbubbleEllipsesOutline, IoChevronForward, IoPersonCircleOutline, IoPricetagOutline,
  IoSearchOutline, IoStatsChartOutline, IoTrophyOutline,
} from "react-icons/io5";
import { useHistory, useListsWithItems } from "../api/queries";
import { useAuth } from "../auth";
import { SupportModal } from "../features/SupportModal";
import { PageHeader } from "../layout/Shell";
import { money, plural, timeAgo } from "../lib/format";
import { Field } from "../ui/Field";
import { Progress, Skeleton, Stat, StoreBadge } from "../ui/Misc";

export function Home() {
  const { user } = useAuth();
  const nav = useNavigate();
  const { data: lists, isLoading: loadingLists } = useListsWithItems();
  const { data: history } = useHistory();
  const [q, setQ] = useState("");
  const [support, setSupport] = useState(false);

  const done = (history ?? []).filter((h) => h.status === "completed" && h.winner);
  const totalItems = (lists ?? []).reduce((n, l) => n + l.items.length, 0);
  const saved = done.reduce((n, h) => n + (h.savings ?? 0), 0);
  const last = lists && lists.length ? [...lists].sort((a, b) => b.id - a.id)[0] : null;

  const search = (e: FormEvent) => { e.preventDefault(); if (q.trim()) nav(`/search?q=${encodeURIComponent(q.trim())}`); };

  return (
    <>
      <PageHeader
        title={`Hola, ${user?.first_name || "de nuevo"}!`}
        subtitle="¿Qué vas a comprar hoy?"
        right={<button className="icon-btn" onClick={() => nav("/profile")} aria-label="Perfil"><IoPersonCircleOutline size={44} /></button>}
      />
      <div className="content">
        <form className="card search-hero" onSubmit={search}>
          <Field icon={<IoSearchOutline size={20} />} placeholder="Buscá un producto: leche, pan, yerba…" value={q} onChange={(e) => setQ(e.target.value)} />
          <button className="btn small">Buscar</button>
        </form>

        {loadingLists ? (
          <div className="card"><Skeleton h={20} w="50%" /><div style={{ height: 10 }} /><Skeleton h={10} /></div>
        ) : last ? (
          <button className="card action-card" onClick={() => nav(`/list/${last.id}`)}>
            <IoCartOutline size={28} color="var(--primary)" />
            <div className="grow">
              <div className="t">Continuar con tu última lista</div>
              <div className="d">{last.nombre} · {plural(last.items.length, "producto", "productos")}</div>
              {last.items.length > 0 && <Progress value={last.items.filter((i) => i.done).length} total={last.items.length} />}
            </div>
            <IoChevronForward size={22} color="var(--primary)" />
          </button>
        ) : (
          <button className="card action-card" onClick={() => nav("/new-list")}>
            <IoAddCircleOutline size={28} color="var(--primary)" />
            <div className="grow"><div className="t">Creá tu primera lista</div><div className="d">Armala y compará precios en 4 supermercados</div></div>
            <IoChevronForward size={22} color="var(--primary)" />
          </button>
        )}

        <div className="stats">
          <Stat icon={<IoCartOutline size={22} />} value={lists?.length ?? "–"} label="Listas" />
          <Stat icon={<IoPricetagOutline size={22} />} value={lists ? totalItems : "–"} label="Productos" />
          <Stat icon={<IoStatsChartOutline size={22} />} value={history ? done.length : "–"} label="Comparaciones" />
          <Stat icon={<IoTrophyOutline size={22} />} value={saved > 0 ? money(saved) : "–"} label="Ahorro detectado" />
        </div>

        <div className="section-head"><h2>Comparaciones recientes</h2><button className="link blue" onClick={() => nav("/lists?tab=comparisons")}>Ver todas</button></div>
        {done.length === 0 ? (
          <div className="card muted">Todavía no comparaste ninguna lista. Abrí una y tocá <b>Comparar</b>.</div>
        ) : (
          <div className="card flush">
            {done.slice(0, 3).map((h) => (
              <button key={h.id} className="row" onClick={() => nav(`/compare/${h.id}`)}>
                <div className="grow">
                  <div className="title">{h.title || "Comparación"}</div>
                  <div className="desc">{timeAgo(h.created_at)} · {plural(h.items_count ?? 0, "producto", "productos")}</div>
                </div>
                {h.winner && (
                  <div className="right-col">
                    <StoreBadge store={h.winner} size={18} />
                    <span className="amount-sm">{money(h.totals[h.winner])}</span>
                  </div>
                )}
                <IoChevronForward className="chev" size={20} />
              </button>
            ))}
          </div>
        )}

        <div className="section-head"><h2>Mis listas</h2><button className="link blue" onClick={() => nav("/lists")}>Ver todas</button></div>
        {lists && lists.length > 0 ? (
          <div className="card flush">
            {[...lists].sort((a, b) => b.id - a.id).slice(0, 3).map((l) => (
              <button key={l.id} className="row" onClick={() => nav(`/list/${l.id}`)}>
                <div className="grow">
                  <div className="title">{l.nombre}</div>
                  <div className="desc">{l.items.filter((i) => i.done).length}/{l.items.length} comprados</div>
                </div>
                <IoChevronForward className="chev" size={20} />
              </button>
            ))}
          </div>
        ) : null}

        <button className="card support-btn" onClick={() => setSupport(true)}>
          <IoChatbubbleEllipsesOutline size={22} /> ¿Viste un error? ¡Repórtalo!
        </button>
      </div>
      {support && <SupportModal onClose={() => setSupport(false)} />}
    </>
  );
}
