import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { IoKeyOutline, IoLockClosedOutline, IoMailOutline, IoPersonOutline } from "react-icons/io5";
import * as api from "../api/endpoints";
import { ApiError } from "../api/client";
import { useAuth } from "../auth";
import { AuthScreen } from "../layout/Shell";
import { Field } from "../ui/Field";
import { ErrorBox } from "../ui/Misc";
import { errMsg } from "../ui/Toast";

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

function Brand({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <>
      <img className="logo" src="/logo.png" alt="Changuito" />
      <h1>{title}</h1>
      <p className="subtitle">{subtitle}</p>
    </>
  );
}

export function Login() {
  const { token, signIn } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  if (token) return <Navigate to="/home" replace />;

  const ok = isEmail(email) && password.length > 0 && !busy;
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!ok) return;
    setErr("");
    setBusy(true);
    try {
      const r = await api.login(email.trim().toLowerCase(), password);
      await signIn(r.access_token);
      nav("/home", { replace: true });
    } catch (e2) {
      setErr(e2 instanceof ApiError && e2.status === 401 ? "Mail o contraseña incorrectos" : errMsg(e2));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthScreen>
      <div className="auth-card">
        <Brand title="¡Bienvenido!" subtitle="Ingresa tus credenciales para continuar" />
        <form onSubmit={submit}>
          <Field icon={<IoMailOutline size={20} />} invalid={touched && !isEmail(email)} placeholder="nombre@correo.com" type="email" autoComplete="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value.toLowerCase())} onBlur={() => setTouched(true)} />
          <Field icon={<IoLockClosedOutline size={20} />} password placeholder="Contraseña" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <Link to="/forgot" className="link blue right">¿Olvidaste tu contraseña?</Link>
          <ErrorBox>{err}</ErrorBox>
          <button className="btn" disabled={!ok}>{busy ? "Ingresando..." : "Iniciar Sesión"}</button>
        </form>
        <p className="footer-text">¿No tienes una cuenta? <Link to="/register" className="link">Regístrate</Link></p>
      </div>
    </AuthScreen>
  );
}

export function Register() {
  const { signIn } = useAuth();
  const nav = useNavigate();
  const [f, setF] = useState({ first_name: "", last_name: "", email: "", password: "" });
  const [challenge, setChallenge] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  const valid = f.first_name.trim().length >= 2 && f.last_name.trim().length >= 2 && isEmail(f.email) && f.password.length >= 6;

  const start = async (e: FormEvent) => {
    e.preventDefault();
    if (!valid || busy) return;
    setErr(""); setBusy(true);
    try {
      const r = await api.registerStart({ ...f, first_name: f.first_name.trim(), last_name: f.last_name.trim(), email: f.email.trim().toLowerCase() });
      setChallenge(r.challenge_id);
      setInfo(r.message);
    } catch (e2) { setErr(errMsg(e2)); } finally { setBusy(false); }
  };

  const verify = async (e: FormEvent) => {
    e.preventDefault();
    if (!challenge || code.length < 4 || busy) return;
    setErr(""); setBusy(true);
    try {
      const r = await api.registerVerify(challenge, code.trim());
      await signIn(r.access_token);
      nav("/home", { replace: true });
    } catch (e2) { setErr(errMsg(e2)); } finally { setBusy(false); }
  };

  const resend = async () => {
    if (!challenge) return;
    setErr("");
    try { setInfo((await api.registerResend(challenge)).message); } catch (e2) { setErr(errMsg(e2)); }
  };

  if (challenge) {
    return (
      <AuthScreen>
        <div className="auth-card">
          <Brand title="Verificá tu email" subtitle={info || "Te enviamos un código a tu correo"} />
          <form onSubmit={verify}>
            <Field icon={<IoKeyOutline size={20} />} className="otp" inputMode="numeric" maxLength={6} placeholder="000000" autoFocus value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />
            <ErrorBox>{err}</ErrorBox>
            <button className="btn" disabled={code.length < 4 || busy}>{busy ? "Verificando..." : "Verificar"}</button>
          </form>
          <p className="footer-text">¿No te llegó? <button className="link" onClick={resend}>Reenviar código</button></p>
        </div>
      </AuthScreen>
    );
  }

  return (
    <AuthScreen>
      <div className="auth-card">
        <Brand title="Crear cuenta" subtitle="Compará precios de supermercados en segundos" />
        <form onSubmit={start}>
          <Field icon={<IoPersonOutline size={20} />} placeholder="Nombre" autoComplete="given-name" value={f.first_name} onChange={set("first_name")} />
          <Field icon={<IoPersonOutline size={20} />} placeholder="Apellido" autoComplete="family-name" value={f.last_name} onChange={set("last_name")} />
          <Field icon={<IoMailOutline size={20} />} placeholder="nombre@correo.com" type="email" autoComplete="email" value={f.email} onChange={set("email")} />
          <Field icon={<IoLockClosedOutline size={20} />} password placeholder="Contraseña (mín. 6)" autoComplete="new-password" value={f.password} onChange={set("password")} />
          <ErrorBox>{err}</ErrorBox>
          <button className="btn" disabled={!valid || busy}>{busy ? "Enviando código..." : "Registrarme"}</button>
        </form>
        <p className="footer-text">¿Ya tienes cuenta? <Link to="/login" className="link">Inicia sesión</Link></p>
      </div>
    </AuthScreen>
  );
}

export function Forgot() {
  const nav = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState("");
  const [challenge, setChallenge] = useState("");
  const [code, setCode] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);

  const run = (fn: () => Promise<void>) => async (e: FormEvent) => {
    e.preventDefault();
    setErr(""); setBusy(true);
    try { await fn(); } catch (e2) { setErr(errMsg(e2)); } finally { setBusy(false); }
  };

  return (
    <AuthScreen>
      <div className="auth-card">
        <Brand title="Recuperar contraseña" subtitle={step === 1 ? "Te enviamos un código a tu correo" : step === 2 ? "Ingresá el código que recibiste" : "Elegí tu nueva contraseña"} />
        {done ? (
          <>
            <div className="alert ok">Contraseña actualizada. Ya podés iniciar sesión.</div>
            <button className="btn" onClick={() => nav("/login")}>Ir a iniciar sesión</button>
          </>
        ) : (
          <form onSubmit={run(async () => {
            if (step === 1) { setChallenge((await api.resetStart(email.trim().toLowerCase())).challenge_id ?? ""); setStep(2); }
            else if (step === 2) { setResetToken((await api.resetVerify(challenge, code.trim())).reset_token); setStep(3); }
            else { await api.resetConfirm(resetToken, pw); setDone(true); }
          })}>
            {step === 1 && <Field icon={<IoMailOutline size={20} />} placeholder="nombre@correo.com" type="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} />}
            {step === 2 && <Field icon={<IoKeyOutline size={20} />} className="otp" inputMode="numeric" maxLength={6} placeholder="000000" autoFocus value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />}
            {step === 3 && <Field icon={<IoLockClosedOutline size={20} />} password placeholder="Nueva contraseña (mín. 6)" autoFocus value={pw} onChange={(e) => setPw(e.target.value)} />}
            <ErrorBox>{err}</ErrorBox>
            <button className="btn" disabled={busy || (step === 1 && !isEmail(email)) || (step === 2 && code.length < 4) || (step === 3 && pw.length < 6)}>
              {busy ? "Procesando..." : step === 1 ? "Enviar código" : step === 2 ? "Verificar código" : "Cambiar contraseña"}
            </button>
          </form>
        )}
        <p className="footer-text"><Link to="/login" className="link">Volver a iniciar sesión</Link></p>
      </div>
    </AuthScreen>
  );
}
