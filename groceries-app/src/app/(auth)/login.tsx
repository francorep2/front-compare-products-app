import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, View } from "react-native";
import { passwordResetStart } from "../../api/endpoints";
import { Button } from "../../components/ui/Button";
import { Divider } from "../../components/ui/Divider";
import { FormField } from "../../components/ui/FormField";
import { GoogleButton } from "../../components/ui/GoogleButton";
import { CheckBadge, ErrorBadge } from "../../components/ui/Helpers";
import { Input } from "../../components/ui/Input";
import { PasswordInput } from "../../components/ui/PasswordInput";
import Screen from "../../components/ui/Screen";
import { Text } from "../../components/ui/Text";
import { useAuth } from "../../providers/auth";
import { useTheme } from "../../providers/theme";

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

type Existence = "unknown" | "checking" | "exists" | "absent";

export default function Login() {
  const { colors, spacing, radii } = useTheme();
  const { login } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [existence, setExistence] = useState<Existence>("unknown");
  const [checked, setChecked] = useState(false);

  const emailOk = useMemo(() => isValidEmail(email), [email]);

  const checkEmailExistence = async () => {
    if (!emailOk) return;
    
    setExistence("checking");
    setChecked(true);
    try {
      const out: any = await passwordResetStart({ email: email.trim().toLowerCase() });
      
      if (out?.challenge_id) {
        setExistence("exists");
      } else {
        setExistence("absent");
      }
    } catch (e: any) {
      const status = e?.status ?? e?.response?.status;
      if (status === 404) {
        setExistence("absent");
      } else {
        setExistence("unknown");
        setChecked(false);
      }
    }
  };

  const onSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      return Alert.alert("Datos incompletos", "Ingresá tu email y contraseña.");
    }
    if (!emailOk) {
      return Alert.alert("Email inválido", "Revisá el formato del correo.");
    }

    setErr(null);
    setSubmitting(true);
    try {
      await login(email.trim().toLowerCase(), password);
      // La redirección manual se elimina. El AuthProvider se encarga de esto.
    } catch (e: any) {
      const errorMessage = e?.message ?? "No se pudo iniciar sesión";
      setErr(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen contentStyle={{ flexGrow: 1, padding: 16, gap: spacing.md, backgroundColor: colors.white }}>
      {/* LOGO */}
      <View style={{ height: 200, alignItems: "center", justifyContent: "center", marginBottom: spacing.md }}>
        <Image 
          source={require("../../../assets/logo.png")} 
          style={{ 
            width: 200, 
            height: 180, 
            resizeMode: "contain" 
          }} 
        />
      </View>
   
      {/* Título */}
      <Text style={{ fontSize: 24, fontWeight: "800", textAlign: "center", marginBottom: spacing.sm }}>
        ¡Bienvenido!
      </Text>

      {/* Email */}
      <FormField 
        label="Correo Electrónico" 
        rightAdornment={
          emailOk && checked ? (
            existence === "checking" ? (
              <ActivityIndicator size="small" />
            ) : existence === "exists" ? (
              <CheckBadge />
            ) : existence === "absent" ? (
              <ErrorBadge />
            ) : null
          ) : null
        }
      >
        <Input
          placeholder="nombre@correo.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          value={email}
          onChangeText={(t) => {
            setEmail(t.toLowerCase());
            setExistence("unknown");
            setChecked(false);
          }}
          onBlur={checkEmailExistence}
        />
      </FormField>

      {/* Password */}
      <FormField label="Contraseña">
        <PasswordInput placeholder="********" value={password} onChangeText={setPassword} />
      </FormField>

      {/* Olvidaste tu contraseña */}
      <Pressable onPress={() => router.push("/forgot")}>
        <Text style={{ color: colors.secondary, textAlign: "right", fontWeight: "600", fontSize: 12 }}>
          ¿Olvidaste tu contraseña?
        </Text>
      </Pressable>

      {/* Error */}
      {err ? (
        <View style={{ backgroundColor: "#FFE1E1", padding: spacing.sm, borderRadius: radii.sm }}>
          <Text style={{ color: colors.error }}>{err}</Text>
        </View>
      ) : null}

      {/* CTA principal */}
      <Button
        title="Iniciar Sesión"
        onPress={onSubmit}
        loading={submitting}
        style={{ marginTop: 4, backgroundColor: colors.primary }}
      />

      {/* Registro */}
      <View style={{ alignItems: "center", marginTop: spacing.sm }}>
        <Text style={{ color: colors.gray600 }}>
          ¿No tenés una cuenta?{" "}
          <Pressable onPress={() => router.push("/register")}>
            <Text style={{ color: colors.secondary, fontWeight: "700" }}>Registrate</Text>
          </Pressable>
        </Text>
      </View>

      {/* Divider + Google */}
      <View style={{ marginTop: spacing.lg, gap: spacing.md }}>
        <Divider />
        <GoogleButton disabled />
      </View>
    </Screen>
  );
}