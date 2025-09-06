// app/(auth)/login.tsx
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from "react-native";
import { Button } from "../../components/ui/Button";
import { Divider } from "../../components/ui/Divider";
import { FormField } from "../../components/ui/FormField";
import { GoogleButton } from "../../components/ui/GoogleButton";
import { CheckBadge } from "../../components/ui/Helpers";
import { Input } from "../../components/ui/Input";
import { PasswordInput } from "../../components/ui/PasswordInput";
import { Text } from "../../components/ui/Text";
import { useAuth } from "../../providers/auth";
import { useTheme } from "../../providers/theme";

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export default function Login() {
  const { colors, spacing, radii } = useTheme();
  const { login } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const emailOk = useMemo(() => isValidEmail(email), [email]);
  const canSubmit = emailOk && password.length > 0 && !submitting;

  const onSubmit = async () => {
    if (!canSubmit) return;
    setErr(null);
    setSubmitting(true);
    try {
      await login(email, password);
      router.replace("/home");
    } catch (e: any) {
      setErr(e?.message ?? "No se pudo iniciar sesión");
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.select({ ios: "padding", android: undefined })} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View style={{ flex: 1, padding: 16, gap: spacing.md, backgroundColor: colors.white }}>
          {/* LOGO */}
          <View style={{ height: 120, alignItems: "center", justifyContent: "center" }}>
            {/* Reemplazá por tu asset si ya lo tenés: */}
            <Image source={require("../../../assets/logo.jpg")} style={{ width: 160, height: 48, resizeMode: "contain" }} />
            <View
              style={{
                width: 160,
                height: 54,
                borderRadius: radii.md,
                backgroundColor: colors.primary,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: "white", fontWeight: "800" }}>LOGO</Text>
            </View>
          </View>

          {/* Título */}
          <Text style={{ fontSize: 24, fontWeight: "800", textAlign: "center", marginBottom: spacing.sm }}>
            ¡Bienvenido!
          </Text>

          {/* Email */}
          <FormField label="Correo Electrónico" rightAdornment={emailOk ? <CheckBadge /> : undefined}>
            <Input
              placeholder="nombre@correo.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={email}
              onChangeText={setEmail}
            />
          </FormField>

          {/* Password */}
          <FormField label="Contraseña">
            <PasswordInput placeholder="********" value={password} onChangeText={setPassword} />
          </FormField>

          {/* Olvidaste tu contraseña */}
          <Pressable onPress={() => {/* router.push("/(auth)/forgot"); cuando la creemos */}}>
            <Text style={{ color: colors.secondary, textAlign: "right", fontWeight: "600" }}>
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
              <Pressable onPress={() => router.push("/(auth)/register")}>
                <Text style={{ color: colors.secondary, fontWeight: "700" }}>Registrate</Text>
              </Pressable>
            </Text>
          </View>

          {/* Divider + Google (deshabilitado por ahora) */}
          <View style={{ marginTop: spacing.lg, gap: spacing.md }}>
            <Divider />
            <GoogleButton disabled />
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
