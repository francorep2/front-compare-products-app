import type { ReactNode } from "react";
import { NavLink, Navigate, Outlet, useNavigate } from "react-router-dom";
import {
  IoAddCircle, IoAddCircleOutline, IoCart, IoCartOutline, IoChevronBack, IoLogOutOutline, IoPerson, IoPersonOutline,
  IoSearch, IoSearchOutline, IoStorefront, IoStorefrontOutline,
} from "react-icons/io5";
import { useAuth } from "../auth";
import { Spinner } from "../ui/Misc";

/** Ola roja superior (WaveBackground de la app): gradiente primary -> secondary con borde curvo. */
export function Wave() {
  const w = 400;
  const h = 250;
  return (
    <div className="wave" aria-hidden>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FD1648" />
            <stop offset="100%" stopColor="#FF1058" />
          </linearGradient>
        </defs>
        <path fill="url(#grad)" d={`M0,0 L0,${h * 0.7} Q${w / 2},${h} ${w},${h * 0.7} L${w},0 Z`} />
      </svg>
    </div>
  );
}

// El mismo orden y los mismos íconos que la barra inferior de la app móvil.
const TABS = [
  { to: "/new-list", on: IoAddCircle, off: IoAddCircleOutline, label: "Nueva lista" },
  { to: "/search", on: IoSearch, off: IoSearchOutline, label: "Buscar" },
  { to: "/home", on: IoStorefront, off: IoStorefrontOutline, label: "Inicio" },
  { to: "/lists", on: IoCart, off: IoCartOutline, label: "Mis listas" },
  { to: "/profile", on: IoPerson, off: IoPersonOutline, label: "Perfil" },
];

export function BottomBar() {
  return (
    <div className="bottom-bar">
      <nav aria-label="Navegación principal">
        {TABS.map(({ to, on: On, off: Off, label }) => (
          <NavLink key={to} to={to} aria-label={label} title={label} className={({ isActive }) => (isActive ? "active" : "")}>
            {({ isActive }) => (isActive ? <On size={28} /> : <Off size={28} />)}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

function Sidebar() {
  const { user, signOut } = useAuth();
  const name = [user?.first_name, user?.last_name].filter(Boolean).join(" ") || user?.email;
  const order = [TABS[2], TABS[1], TABS[0], TABS[3], TABS[4]]; // en escritorio: Inicio primero
  return (
    <aside className="sidebar">
      <div className="brand"><img src="/logo.png" alt="" /> <span>Changuito<small>beta</small></span></div>
      <nav aria-label="Navegación principal">
        {order.map(({ to, on: On, off: Off, label }) => (
          <NavLink key={to} to={to} className={({ isActive }) => `side-link${isActive ? " active" : ""}`}>
            {({ isActive }) => (<>{isActive ? <On size={22} /> : <Off size={22} />}<span>{label}</span></>)}
          </NavLink>
        ))}
      </nav>
      <div className="side-user">
        <div className="side-user-name" title={user?.email}>{name}</div>
        <button className="side-logout" onClick={signOut}><IoLogOutOutline size={18} /> Cerrar sesión</button>
      </div>
    </aside>
  );
}

/** Layout de las pantallas con sesión: barra lateral (escritorio) / ola + barra inferior (móvil). */
export function MainLayout() {
  const { token, user, loading } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  if (loading || !user) return <div className="shell"><Spinner label="Cargando..." /></div>;
  return (
    <div className="shell">
      <Sidebar />
      <div className="main">
        <div className="main-inner">
          <Wave />
          <div className="above">
            <Outlet />
          </div>
        </div>
      </div>
      <BottomBar />
    </div>
  );
}

export function PageHeader({
  title, subtitle, back, right,
}: { title: ReactNode; subtitle?: ReactNode; back?: string | number; right?: ReactNode }) {
  const nav = useNavigate();
  return (
    <header className="page-header">
      <div className="ph-main">
        {back !== undefined && (
          <button className="icon-btn" onClick={() => (typeof back === "number" ? nav(back) : nav(back))} aria-label="Volver" style={{ marginLeft: -6, marginBottom: 4 }}>
            <IoChevronBack size={26} />
          </button>
        )}
        <h1>{title}</h1>
        {subtitle && <p className="sub">{subtitle}</p>}
      </div>
      {right && <div className="ph-right">{right}</div>}
    </header>
  );
}

/** Pantallas de autenticación: tarjeta sobre ola; en escritorio, panel de marca a la izquierda. */
export function AuthScreen({ children }: { children: ReactNode }) {
  return (
    <div className="auth-screen">
      <aside className="auth-hero">
        <img src="/logo.png" alt="" />
        <h2>Compará precios de supermercados en segundos</h2>
        <p>Armá tu lista y mirá dónde sale más barata: Coto, Carrefour, Jumbo y Día.</p>
        <ul>
          <li>Comparación producto por producto</li>
          <li>La mejor combinación entre tiendas</li>
          <li>Historial y evolución de tus carritos</li>
        </ul>
      </aside>
      <div className="auth-main">
        <Wave />
        {children}
      </div>
    </div>
  );
}
