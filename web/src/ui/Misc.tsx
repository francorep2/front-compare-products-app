import type { ReactNode } from "react";
import { IoAlertCircleOutline } from "react-icons/io5";
import { STORE_META } from "./store";
import type { Store } from "../api/types";

export function ErrorBox({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return (
    <div className="alert" role="alert">
      <IoAlertCircleOutline size={20} />
      <span>{children}</span>
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="center">
      <div className="spinner" />
      {label && <div className="muted">{label}</div>}
    </div>
  );
}

export const Skeleton = ({ h = 16, w = "100%", r = 8 }: { h?: number; w?: number | string; r?: number }) => (
  <span className="skeleton" style={{ height: h, width: w, borderRadius: r }} />
);

export function SkeletonCards({ n = 3 }: { n?: number }) {
  return (
    <>
      {Array.from({ length: n }).map((_, i) => (
        <div className="card" key={i}>
          <Skeleton h={18} w="55%" />
          <div style={{ height: 10 }} />
          <Skeleton h={12} w="80%" />
        </div>
      ))}
    </>
  );
}

export function EmptyState({ icon, title, children, action }: { icon: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty">
      <div className="empty-icon">{icon}</div>
      <b>{title}</b>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}

export function Tabs<T extends string>({ value, onChange, tabs }: { value: T; onChange: (v: T) => void; tabs: { id: T; label: ReactNode }[] }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((t) => (
        <button key={t.id} role="tab" aria-selected={value === t.id} className={`tab${value === t.id ? " on" : ""}`} onClick={() => onChange(t.id)}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

export const Progress = ({ value, total }: { value: number; total: number }) => (
  <div className="progress" role="progressbar" aria-valuenow={value} aria-valuemax={total}>
    <span style={{ width: `${total ? Math.round((value / total) * 100) : 0}%` }} />
  </div>
);

export function StoreBadge({ store, size = 22 }: { store: string; size?: number }) {
  const m = STORE_META[store as Store];
  return (
    <span className="store-badge">
      {m && <img src={m.logo} alt="" width={size} height={size} />}
      <span>{m?.name ?? store}</span>
    </span>
  );
}

export function StoreChip({ store, on, onClick }: { store: Store; on: boolean; onClick?: () => void }) {
  const m = STORE_META[store];
  return (
    <button type="button" className={`chip${on ? " on" : ""}`} onClick={onClick} aria-pressed={on}>
      <img src={m.logo} alt="" />
      {m.name}
    </button>
  );
}

export const Stat = ({ icon, value, label }: { icon: ReactNode; value: ReactNode; label: string }) => (
  <div className="stat">
    <div className="stat-icon">{icon}</div>
    <div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  </div>
);
