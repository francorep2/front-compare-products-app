import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { IoAddCircleOutline, IoChatbubbleEllipsesOutline, IoChevronForward, IoListOutline, IoLogOutOutline, IoPersonCircleOutline, IoSearchOutline, IoCartOutline } from "react-icons/io5";
import * as api from "../api";
import { useAuth } from "../auth";
import { PageHeader } from "../components/Layout";
import { ErrorBox, errMsg } from "../components/ui";

export function SupportModal({ onClose }: { onClose: () => void }) {
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [sent, setSent] = useState(false);

  const send = async () => {
    setErr(""); setBusy(true);
    try { await api.sendSupport(msg.trim()); setSent(true); } catch (e) { setErr(errMsg(e)); } finally { setBusy(false); }
  };

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Reportar un error</h2>
        {sent ? (
          <>
            <div className="alert ok">¡Gracias! Recibimos tu mensaje.</div>
            <button className="btn" onClick={onClose}>Cerrar</button>
          </>
        ) : (
          <>
            <textarea placeholder="Contanos qué pasó..." value={msg} onChange={(e) => setMsg(e.target.value)} maxLength={4000} />
            <ErrorBox>{err}</ErrorBox>
            <div className="actions">
              <button className="btn ghost" onClick={onClose}>Cancelar</button>
              <button className="btn" disabled={msg.trim().length < 3 || busy} onClick={send}>{busy ? "Enviando..." : "Enviar"}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function Home() {
  const { user, signOut } = useAuth();
  const nav = useNavigate();
  const [lists, setLists] = useState<api.ShoppingList[] | null>(null);
  const [support, setSupport] = useState(false);

  useEffect(() => { api.getLists().then(setLists).catch(() => setLists([])); }, []);

  const last = lists && lists.length ? lists[lists.length - 1] : null;
  const primary = last
    ? { icon: <IoListOutline size={28} color="var(--primary)" />, title: "Continuar con tu última lista", desc: last.nombre, to: `/list/${last.id}` }
    : { icon: <IoAddCircleOutline size={28} color="var(--primary)" />, title: "Crear tu primera lista", desc: "Armá tu lista y compará precios", to: "/new-list" };

  const more = [
    { icon: <IoSearchOutline size={24} />, title: "Buscar un producto", to: "/search" },
    { icon: <IoCartOutline size={24} />, title: "Mis listas", to: "/purchases" },
    { icon: <IoAddCircleOutline size={24} />, title: "Nueva lista", to: "/new-list" },
  ];

  return (
    <>
      <PageHeader
        title={`Hola, ${user?.first_name || "de nuevo"}!`}
        right={<button className="icon-btn" onClick={() => nav("/profile")} aria-label="Perfil"><IoPersonCircleOutline size={44} /></button>}
      />
      <div className="content">
        <button className="card primary-action" onClick={() => nav(primary.to)}>
          {primary.icon}
          <div style={{ flex: 1 }}>
            <div className="t">{primary.title}</div>
            <div className="d">{primary.desc}</div>
          </div>
          <IoChevronForward size={24} color="var(--primary)" />
        </button>

        <button className="card support-btn" onClick={() => setSupport(true)}>
          <IoChatbubbleEllipsesOutline size={22} /> ¿Viste un error? ¡Repórtalo!
        </button>

        <div className="section-title">Más opciones</div>
        <div className="card flush">
          {more.map((m) => (
            <button key={m.to} className="row" onClick={() => nav(m.to)}>
              <span className="lead" style={{ color: "var(--tertiary)", display: "flex" }}>{m.icon}</span>
              <span className="grow"><span className="title" style={{ fontWeight: 500, color: "var(--gray600)" }}>{m.title}</span></span>
              <IoChevronForward className="chev" size={22} />
            </button>
          ))}
        </div>

        <button className="logout" onClick={signOut}><IoLogOutOutline size={22} /> Cerrar sesión</button>
      </div>
      {support && <SupportModal onClose={() => setSupport(false)} />}
    </>
  );
}
