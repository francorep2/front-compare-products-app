import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, Dimensions, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import Svg, { Defs, Path, Stop, LinearGradient as SvgGradient } from "react-native-svg";

import { Button } from "../../components/ui/Button";
import { PasswordInput } from "../../components/ui/PasswordInput";
import { Text } from "../../components/ui/Text";
import { useAuth } from "../../providers/auth";
import { useTheme } from "../../providers/theme";

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

// --- Componente para el fondo de ola ---
const WaveBackground = () => {
  const { colors } = useTheme();
  const { width } = Dimensions.get('window');
  const height = 250; // Altura de la ola

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height }}>
      <Svg height="100%" width="100%" viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          <SvgGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={colors.primary} stopOpacity="1" />
            <Stop offset="100%" stopColor={colors.secondary} stopOpacity="1" />
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
  const { colors, spacing } = useTheme();
  const { login } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const emailOk = useMemo(() => isValidEmail(email), [email]);

  const onSubmit = async () => {
    if (!emailOk || !password) {
      return Alert.alert("Datos incompletos", "Por favor, ingresa un email válido y tu contraseña.");
    }
    setErr(null);
    setSubmitting(true);
    try {
      await login(email.trim().toLowerCase(), password);
    } catch (e: any) {
      setErr(e?.message ?? "Email o contraseña incorrectos.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <WaveBackground />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View entering={FadeInUp.duration(800).delay(200)} style={styles.content}>
            <Image 
              source={require("../../../assets/logo.png")} 
              style={styles.logo} 
            />
            <Text style={[styles.title, { color: colors.text }]}>¡Bienvenido!</Text>
            <Text style={[styles.subtitle, { color: colors.gray500 }]}>Ingresa tus credenciales para continuar</Text>
            
            <View style={styles.form}>
              <View style={[styles.inputContainer, { borderColor: colors.border }]}>
                  <Ionicons name="mail-outline" size={20} color={colors.secondary} style={styles.inputIcon} />
                  <TextInput
                      placeholder="nombre@correo.com"
                      style={[styles.input, { color: colors.text }]}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      value={email}
                      onChangeText={(t) => setEmail(t.toLowerCase())}
                      placeholderTextColor={colors.gray400}
                  />
              </View>

              <View style={[styles.inputContainer, { borderColor: colors.border }]}>
                  <Ionicons name="lock-closed-outline" size={20} color={colors.secondary} style={styles.inputIcon} />
                  <PasswordInput 
                      placeholder="Contraseña"
                      value={password}
                      onChangeText={setPassword}
                      style={[styles.input, { flex: 1, color: colors.text }]}
                      placeholderTextColor={colors.gray400}
                  />
              </View>

              <Pressable onPress={() => router.push("/forgot")}>
                <Text style={[styles.forgotPasswordText, { color: colors.tertiary }]}>¿Olvidaste tu contraseña?</Text>
              </Pressable>

              {err && (
                <View style={[styles.errorContainer, { backgroundColor: colors.error }]}>
                  <Text style={[styles.errorText, { color: colors.white }]}>{err}</Text>
                </View>
              )}

              <Button
                title="Iniciar Sesión"
                onPress={onSubmit}
                loading={submitting}
                style={[styles.submitButton, { backgroundColor: colors.primary }]}
                textStyle={styles.submitButtonText}
              />
            </View>

            <View style={styles.footer}>
              <Text style={[styles.footerText, { color: colors.gray500 }]}>
                ¿No tienes una cuenta?{" "}
                <Text onPress={() => router.push("/register")} style={[styles.linkText, { color: colors.primary }]}>
                  Regístrate
                </Text>
              </Text>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  content: {
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  logo: {
    width: 80,
    height: 80,
    resizeMode: 'contain',
    marginBottom: 16,
  },
  title: {
    fontSize: 34,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#F9F9F9',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    height: 50,
    fontSize: 16,
    flex: 1, // Permite que el input crezca
  },
  forgotPasswordText: {
    textAlign: 'right',
    fontWeight: '600',
    fontSize: 14,
    marginBottom: 24,
  },
  errorContainer: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    fontWeight: '600',
    textAlign: 'center',
  },
  submitButton: {
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  footer: {
    marginTop: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
  },
  linkText: {
    fontWeight: 'bold',
  },
});