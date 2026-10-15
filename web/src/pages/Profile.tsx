import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { IoLockClosedOutline, IoLogOutOutline, IoMailOutline, IoPersonCircleOutline, IoPersonOutline } from "react-icons/io5";
import * as api from "../api/endpoints";
import { qk, useSources } from "../api/queries";
import { STORES, type Store } from "../api/types";
import { useAuth } from "../auth";
import { PageHeader } from "../layout/Shell";
import { clearRecentSearches, getThemePref, setThemePref, storage, type ThemePref } from "../lib/storage";
import { Field } from "../ui/Field";
import { ErrorBox, StoreChip, Tabs } from "../ui/Misc";
import { errMsg, useToast } from "../ui/Toast";

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

export function Profile() {
  const { user, signOut, refreshUser } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: sources } = useSources();
  const [theme, setTheme] = useState<ThemePref>(getThemePref);
  const [f, setF] = useState({ first_name: user?.first_name ?? "", last_name: user?.last_name ?? "", email: user?.email ?? "", password: "" });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  const save = useMutation({
    mutationFn: async () => {
      const payload: Record<string, string> = {};
      if (f.first_name.trim()) payload.first_name = f.first_name.trim();
      if (f.last_name.trim()) payload.last_name = f.last_name.trim();
      if (f.email.trim() && f.email !== user?.email) payload.email = f.email.trim().toLowerCase();
      if (f.password) payload.password = f.password;
      await api.updateMe(payload);
      await refreshUser();
    },
    onSuccess: () => { setF((x) => ({ ...x, password: "" })); toast("Perfil actualizado"); },
  });

  const toggleStore = async (s: Store) => {
    const cur = sources ?? api.ALL_SOURCES;
    const next = { ...cur, [s]: !cur[s] };
    if (!api.enabledOf(next).length) { toast("Dejá al menos una tienda activa", "info"); return; }
    qc.setQueryData(qk.sources, next);
    try { await api.setSources(next); } catch (e) { qc.invalidateQueries({ queryKey: qk.sources }); toast(errMsg(e), "error"); }
  };

  const name = [user?.first_name, user?.last_name].filter(Boolean).join(" ");
  const submit = (e: FormEvent) => { e.preventDefault(); save.mutate(); };

  return (
    <>
      <PageHeader title="Mi perfil" />
      <div className="content narrow">
        <div className="card profile-head">
          <IoPersonCircleOutline size={84} color="var(--primary)" />
          {name && <div className="profile-name">{name}</div>}
          <div className="muted">{user?.email}</div>
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Supermercados a comparar</h3>
          <p className="muted" style={{ marginTop: 0 }}>Se usan en la búsqueda y en las comparaciones.</p>
          <div className="chips">
            {STORES.map((s) => <StoreChip key={s} store={s} on={sources ? sources[s] : true} onClick={() => toggleStore(s)} />)}
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Apariencia</h3>
          <Tabs value={theme} onChange={(t) => { setTheme(t); setThemePref(t); }} tabs={[{ id: "system", label: "Automático" }, { id: "light", label: "Claro" }, { id: "dark", label: "Oscuro" }]} />
        </div>

        <form className="card" onSubmit={submit}>
          <h3 style={{ marginTop: 0 }}>Mis datos</h3>
          <Field icon={<IoPersonOutline size={20} />} placeholder="Nombre" label="Nombre" value={f.first_name} onChange={set("first_name")} />
          <Field icon={<IoPersonOutline size={20} />} placeholder="Apellido" label="Apellido" value={f.last_name} onChange={set("last_name")} />
          <Field icon={<IoMailOutline size={20} />} type="email" placeholder="Email" label="Email" value={f.email} onChange={set("email")} invalid={!!f.email && !isEmail(f.email)} />
          <Field icon={<IoLockClosedOutline size={20} />} password placeholder="Dejala vacía para no cambiarla" label="Nueva contraseña" autoComplete="new-password" value={f.password} onChange={set("password")} />
          <ErrorBox>{save.error ? errMsg(save.error) : ""}</ErrorBox>
          <button className="btn" disabled={save.isPending || !isEmail(f.email) || (!!f.password && f.password.length < 6)}>{save.isPending ? "Guardando..." : "Guardar cambios"}</button>
        </form>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Datos locales</h3>
          <p className="muted" style={{ marginTop: 0 }}>Búsquedas recientes y productos exactos elegidos se guardan solo en este navegador.</p>
          <button className="btn small ghost" onClick={() => { clearRecentSearches(); storage.set("changuito_item_barcodes", null); toast("Datos locales borrados"); }}>Borrar datos locales</button>
        </div>

        <button className="logout" onClick={signOut}><IoLogOutOutline size={22} /> Cerrar sesión</button>
        <p className="muted" style={{ textAlign: "center", fontSize: 12 }}>Changuito beta · los precios son orientativos y pueden cambiar en cada tienda.</p>
      </div>
    </>
  );
}
