import type { ReactNode } from "react";
import { NavLink, Navigate, Outlet, useNavigate } from "react-router-dom";
import {
  IoAddCircle, IoAddCircleOutline, IoCart, IoCartOutline, IoChevronBack, IoPerson, IoPersonOutline,
  IoSearch, IoSearchOutline, IoStorefront, IoStorefrontOutline,
} from "react-icons/io5";
import { useAuth } from "../auth";
import { Spinner } from "./ui";

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

const TABS = [
  { to: "/new-list", on: IoAddCircle, off: IoAddCircleOutline, label: "Nueva lista" },
  { to: "/search", on: IoSearch, off: IoSearchOutline, label: "Buscar" },
  { to: "/home", on: IoStorefront, off: IoStorefrontOutline, label: "Inicio" },
  { to: "/purchases", on: IoCart, off: IoCartOutline, label: "Mis listas" },
  { to: "/profile", on: IoPerson, off: IoPersonOutline, label: "Perfil" },
];

export function BottomBar() {
  return (
    <div className="bottom-bar">
      <nav>
        {TABS.map(({ to, on: On, off: Off, label }) => (
          <NavLink key={to} to={to} aria-label={label} title={label} className={({ isActive }) => (isActive ? "active" : "")}>
            {({ isActive }) => (isActive ? <On size={28} /> : <Off size={28} />)}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

/** Layout de las pantallas con sesión: ola + contenido + barra inferior. */
export function MainLayout() {
  const { token, user, loading } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  if (loading || !user) return <div className="screen"><Spinner label="Cargando..." /></div>;
  return (
    <div className="screen with-bar">
      <Wave />
      <div className="above">
        <Outlet />
      </div>
      <BottomBar />
    </div>
  );
}

export function PageHeader({ title, subtitle, back, right }: { title: string; subtitle?: string; back?: string; right?: ReactNode }) {
  const nav = useNavigate();
  return (
    <div className="header">
      <div>
        {back && (
          <button className="icon-btn" onClick={() => nav(back)} aria-label="Volver" style={{ marginLeft: -4, marginBottom: 6 }}>
            <IoChevronBack size={26} />
          </button>
        )}
        <h1>{title}</h1>
        {subtitle && <p className="sub">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

/** Contenedor de pantallas de autenticación (fondo gris + ola + tarjeta blanca). */
export function AuthScreen({ children }: { children: ReactNode }) {
  return (
    <div className="screen auth">
      <Wave />
      {children}
    </div>
  );
}
