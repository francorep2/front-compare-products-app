// app/(auth)/forgot.tsx
import { Ionicons } from "@expo/vector-icons";
import { useHeaderHeight } from "@react-navigation/elements";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { passwordResetStart } from "../../api/endpoints";
import { CheckBadge } from "../../components/ui/Helpers";
import { colors, spacing, styles } from "../../styles/register";

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

type Existence = "unknown" | "checking" | "exists" | "absent";

export default function ForgotScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();

  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [existence, setExistence] = useState<Existence>("unknown");
  const [checked, setChecked] = useState(false); // mostramos icono solo después de chequear

  const emailOk = useMemo(() => isValidEmail(email), [email]);

  const onSubmit = async () => {
    if (!email.trim()) {
      return Alert.alert("Datos incompletos", "Ingresá tu correo electrónico.");
    }
    if (!emailOk) {
      return Alert.alert("Email inválido", "Revisá el formato del correo.");
    }

    setSending(true);
    setExistence("checking");
    setChecked(true);
    try {
      const out: any = await passwordResetStart({ email: email.trim().toLowerCase() });

      if (out?.challenge_id) {
        // Existe → tilde y navegar a OTP
        setExistence("exists");
        router.replace({
          pathname: "/verify",
          params: { mode: "reset", challenge_id: out.challenge_id, email: email.trim().toLowerCase() },
        });
        return;
      }

      // Si por algún motivo no viene challenge_id, lo tratamos como “no existe”
      setExistence("absent");
    } catch (e: any) {
      const status = e?.status ?? e?.response?.status;
      if (status === 404) {
        // Mail no existe → cruz y mensaje, SIN alert ruidoso
        setExistence("absent");
        setSending(false);
        return;
      }
      setExistence("unknown");
      setChecked(false);
      const msg = e?.data?.detail || e?.data?.message || e?.message || "No se pudo enviar el código.";
      Alert.alert("Error", String(msg));
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? headerHeight : 0}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: spacing.md, paddingBottom: insets.bottom + spacing.lg }}
        >
          <View style={[styles.container, { flex: 0 }]}>
            <Text style={[styles.title, { color: colors.secondary, textAlign: "center" }]}>
              ¿Olvidaste tu contraseña?
            </Text>
            <Text style={{ textAlign: "center", color: colors.gray600, marginBottom: spacing.lg }}>
              Ingresá el correo electrónico asociado a tu cuenta.
            </Text>

            <Text style={styles.label}>Correo Electrónico</Text>
            <View style={{ position: "relative" }}>
              <TextInput
                value={email}
                onChangeText={(t) => {
                  setEmail(t.toLowerCase());
                  setExistence("unknown");
                  setChecked(false); // al editar, ocultamos icono hasta el próximo check
                }}
                placeholder="nombre@correo.com"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                style={[styles.input, { paddingRight: 40 }]}
                returnKeyType="send"
                onSubmitEditing={onSubmit}
              />

              {/* Ícono a la derecha según resultado del backend */}
              <View style={{ position: "absolute", right: 12, top: 12 }}>
                {emailOk && checked ? (
                  existence === "checking" ? (
                    <ActivityIndicator size="small" />
                  ) : existence === "exists" ? (
                    <CheckBadge />
                  ) : existence === "absent" ? (
                    <Ionicons name="close-circle" size={20} color={colors.error} />
                  ) : null
                ) : null}
              </View>
            </View>

            {/* Mensaje si el mail no existe */}
            {checked && existence === "absent" ? (
              <Text style={{ color: colors.error, marginTop: 6 }}>
                No encontramos una cuenta con este correo.
              </Text>
            ) : null}

            <Pressable onPress={onSubmit} style={[styles.btnPrimary, { marginTop: spacing.md }]}>
              <Text style={styles.btnPrimaryText}>{sending ? "Enviando..." : "Enviar Código"}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
