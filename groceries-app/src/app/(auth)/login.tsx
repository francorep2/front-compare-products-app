import { Ionicons } from "@expo/vector-icons";
import { Link, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  Alert,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import Svg, { Defs, Path, Stop, LinearGradient as SvgGradient } from "react-native-svg";

import { Button } from "../../components/ui/Button";
import { PasswordInput } from "../../components/ui/PasswordInput";
import { useAuth } from "../../providers/auth";
import { useTheme } from "../../providers/theme";

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

const WaveBackground = () => {
  const { colors } = useTheme();
  const { width } = Dimensions.get("window");
  const height = 250;

  return (
    <View
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height,
        zIndex: -1,           // 👈 ATRÁS de todo
        elevation: 0,
      }}
      pointerEvents="none"
    >
      <Svg height="100%" width="100%" viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          <SvgGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={colors?.primary || "#FD1648"} stopOpacity="1" />
            <Stop offset="100%" stopColor={colors?.secondary || "#FF1058"} stopOpacity="1" />
          </SvgGradient>
        </Defs>
        <Path
          fill="url(#grad)"
          d={`M0,0 L0,${height * 0.7} Q${width / 2},${height} ${width},${height * 0.7} L${width},0 Z`}
        />
      </Svg>
    </View>
  );
};

export default function Login() {
  const { colors } = useTheme();
  const { login } = useAuth();
  const router = useRouter();

  // Fallbacks
  const BG = colors?.background || "#F5F5F5";
  const CARD = colors?.card || "#FFFFFF";
  const SURFACE = colors?.surface || "#FFFFFF";
  const BORDER = colors?.border || "#E5E5E5";
  const TEXT = colors?.text || "#111111";
  const GRAY400 = colors?.gray400 || "#9CA3AF";
  const GRAY500 = colors?.gray500 || "#6B7280";
  const GRAY600 = colors?.gray600 || "#4B5563";
  const PRIMARY = colors?.primary || "#FD1648";
  const TERTIARY = colors?.tertiary || "#4A5899";
  const ERROR = colors?.error || "#FF1010";
  const WHITE = "#FFFFFF";

  const [email, setEmail] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const emailOk = useMemo(() => isValidEmail(email), [email]);
  const canSubmit = emailOk && password && !submitting;

  const onSubmit = async () => {
    if (!emailOk || !password) {
      return Alert.alert("Datos incompletos", "Por favor, ingresa un email válido y tu contraseña.");
    }
    setErr(null);
    setSubmitting(true);
    try {
      await login(email.trim().toLowerCase(), password);
      // router.replace("/(main)");
    } catch (e: any) {
      const status =
        e?.status || e?.response?.status || e?.cause?.status || e?.data?.statusCode;

      if (status === 401) {
        setErr("Mail o Contraseña incorrectos");
      } else if (status === 0 || e?.name === "TypeError") {
        setErr("No se pudo conectar con el servidor. Verifica tu conexión.");
      } else {
        const msg = e?.response?.data?.detail || e?.message;
        setErr(msg || "Ocurrió un error. Intenta nuevamente.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const emailBorderColor = emailTouched && !emailOk ? ERROR : BORDER;

  return (
    <View style={[styles.root, { backgroundColor: BG }]}>
      <WaveBackground />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Animated.View
            entering={FadeInUp.duration(800).delay(200)}
            style={[
              styles.content,
              {
                backgroundColor: CARD, // card blanca
                position: "relative",   // 👈 necesario para zIndex
                zIndex: 2,              // 👈 por encima del wave
              },
            ]}
          >
            <Image source={require("../../../assets/logo.png")} style={styles.logo} />
            <Text style={[styles.title, { color: TEXT }]}>¡Bienvenido!</Text>
            <Text style={[styles.subtitle, { color: GRAY600 }]}>
              Ingresa tus credenciales para continuar
            </Text>

            <View style={styles.form}>
              {/* Email */}
              <View
                style={[
                  styles.inputContainer,
                  { borderColor: emailBorderColor, backgroundColor: SURFACE, position: "relative" },
                ]}
              >
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color={emailTouched && !emailOk ? ERROR : PRIMARY}
                  style={styles.inputIcon}
                />
                <TextInput
                  placeholder="nombre@correo.com"
                  style={[styles.input, { color: TEXT, backgroundColor: "transparent" }]}
                  keyboardType="email-address"
                  inputMode="email"
                  textContentType="emailAddress"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoFocus
                  caretHidden={false}                 
                  collapsable={false}                  
                  cursorColor={PRIMARY}
                  selectionColor={PRIMARY}
                  underlineColorAndroid="transparent"  
                  placeholderTextColor={GRAY400}
                  value={email}
                  onChangeText={(t) => setEmail(t.toLowerCase())}
                  onBlur={() => setEmailTouched(true)}
                  returnKeyType="next"
                />
              </View>

              {/* Password */}
              <View
                style={[
                  styles.inputContainer,
                  { borderColor: BORDER, backgroundColor: SURFACE, position: "relative" },
                ]}
              >
                <Ionicons name="lock-closed-outline" size={20} color={PRIMARY} style={styles.inputIcon} />
                <PasswordInput
                  placeholder="Contraseña"
                  value={password}
                  onChangeText={setPassword}
                  style={[styles.input, { flex: 1, color: TEXT }]}
                  placeholderTextColor={GRAY400}
                  cursorColor={PRIMARY}
                  selectionColor={PRIMARY}
                  underlineColorAndroid="transparent"
                  returnKeyType="done"
                  onSubmitEditing={onSubmit}
                />
              </View>

              <Pressable onPress={() => router.push("/forgot")}>
                <Text style={[styles.forgotPasswordText, { color: TERTIARY }]}>
                  ¿Olvidaste tu contraseña?
                </Text>
              </Pressable>

              {err && (
                <Animated.View entering={FadeInUp} style={[styles.errorContainer, { backgroundColor: ERROR }]}>
                  <Ionicons name="alert-circle-outline" size={20} color={WHITE} />
                  <Text style={[styles.errorText, { color: WHITE }]}>{err}</Text>
                </Animated.View>
              )}

              <Button
                title={submitting ? "Ingresando..." : "Iniciar Sesión"}
                onPress={onSubmit}
                loading={submitting}
                disabled={!canSubmit}
                style={[
                  styles.submitButton,
                  {
                    backgroundColor: PRIMARY,
                    opacity: canSubmit ? 1 : 0.6,
                  },
                ]}
                textStyle={styles.submitButtonText}
              />
            </View>

            <View style={styles.footer}>
              <Text style={[styles.footerText, { color: GRAY500 }]}>
                ¿No tienes una cuenta?{" "}
                <Link href="/register" asChild>
                  <Text style={[styles.linkText, { color: PRIMARY }]}>Regístrate</Text>
                </Link>
              </Text>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: { flexGrow: 1, justifyContent: "center", padding: 24 },
  content: {
    alignItems: "center",
    padding: 24,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  logo: { width: 80, height: 80, resizeMode: "contain", marginBottom: 16 },
  title: { fontSize: 28, fontWeight: "bold", textAlign: "center" },
  subtitle: { fontSize: 16, textAlign: "center", marginBottom: 24 },
  form: { width: "100%" },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  inputIcon: { marginRight: 12 },
  input: { height: 50, fontSize: 16, flex: 1 },
  forgotPasswordText: { textAlign: "right", fontWeight: "600", fontSize: 14, marginBottom: 16 },
  errorContainer: { flexDirection: "row", alignItems: "center", padding: 12, borderRadius: 8, marginBottom: 16, gap: 8 },
  errorText: { fontWeight: "600", flex: 1 },
  submitButton: {
    height: 50,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  submitButtonText: { fontSize: 16, fontWeight: "bold", color: "white" },
  footer: { marginTop: 24, alignItems: "center" },
  footerText: { fontSize: 14 },
  linkText: { fontWeight: "bold" },
});
