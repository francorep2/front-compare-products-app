import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { IoLockClosedOutline, IoLogOutOutline, IoMailOutline, IoPersonCircleOutline, IoPersonOutline } from "react-icons/io5";
import * as api from "../api";
import { useAuth } from "../auth";
import { PageHeader } from "../components/Layout";
import { ErrorBox, Field, errMsg, isEmail } from "../components/ui";

export function Profile() {
  const { user, signOut } = useAuth();
  const nav = useNavigate();
  const name = [user?.first_name, user?.last_name].filter(Boolean).join(" ");
  return (
    <>
      <PageHeader title="Mi perfil" />
      <div className="content">
        <div className="card" style={{ textAlign: "center" }}>
          <IoPersonCircleOutline size={84} color="var(--primary)" />
          {name && <div style={{ fontSize: 20, fontWeight: 700 }}>{name}</div>}
          <div style={{ color: "var(--gray600)", marginBottom: 18 }}>{user?.email}</div>
          <button className="btn" onClick={() => nav("/profile/edit")}>Editar Perfil</button>
        </div>
        <button className="logout" onClick={signOut}><IoLogOutOutline size={22} /> Cerrar sesión</button>
      </div>
    </>
  );
}

export function ProfileEdit() {
  const { user, refreshUser } = useAuth();
  const nav = useNavigate();
  const [f, setF] = useState({ first_name: user?.first_name ?? "", last_name: user?.last_name ?? "", email: user?.email ?? "", password: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState(false);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => { setF({ ...f, [k]: e.target.value }); setOk(false); };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setErr(""); setBusy(true);
    const payload: Record<string, string> = {};
    if (f.first_name.trim()) payload.first_name = f.first_name.trim();
    if (f.last_name.trim()) payload.last_name = f.last_name.trim();
    if (f.email.trim() && f.email !== user?.email) payload.email = f.email.trim().toLowerCase();
    if (f.password) payload.password = f.password;
    try { await api.updateMe(payload); await refreshUser(); setOk(true); setF({ ...f, password: "" }); } catch (e2) { setErr(errMsg(e2)); } finally { setBusy(false); }
  };

  return (
    <>
      <PageHeader title="Editar perfil" back="/profile" />
      <div className="content">
        <form className="card" onSubmit={save}>
          <Field icon={<IoPersonOutline size={20} />} placeholder="Nombre" value={f.first_name} onChange={set("first_name")} />
          <Field icon={<IoPersonOutline size={20} />} placeholder="Apellido" value={f.last_name} onChange={set("last_name")} />
          <Field icon={<IoMailOutline size={20} />} type="email" placeholder="Email" value={f.email} onChange={set("email")} invalid={!!f.email && !isEmail(f.email)} />
          <Field icon={<IoLockClosedOutline size={20} />} password placeholder="Nueva contraseña (opcional)" autoComplete="new-password" value={f.password} onChange={set("password")} />
          <ErrorBox>{err}</ErrorBox>
          {ok && <div className="alert ok">Perfil actualizado.</div>}
          <button className="btn" disabled={busy || !isEmail(f.email) || (!!f.password && f.password.length < 6)}>{busy ? "Guardando..." : "Guardar cambios"}</button>
        </form>
        <button className="btn ghost" onClick={() => nav("/profile")}>Volver</button>
      </div>
    </>
  );
}
