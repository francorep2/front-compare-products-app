import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import Svg, { Defs, Path, Stop, LinearGradient as SvgGradient } from "react-native-svg";

import { passwordResetStart } from "../../api/endpoints";
import { Button } from "../../components/ui/Button";
import { useTheme } from "../../providers/theme";

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

type Existence = "unknown" | "checking" | "exists" | "absent";

// --- Componente para el fondo de ola ---
const WaveBackground = () => {
  const { colors } = useTheme();
  const { width } = Dimensions.get('window');
  const height = 200;

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

export default function ForgotScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [existence, setExistence] = useState<Existence>("unknown");
  const [checked, setChecked] = useState(false);

  const emailOk = useMemo(() => isValidEmail(email), [email]);

  const onSubmit = async () => {
    if (!emailOk) {
      return Alert.alert("Email inválido", "Por favor, revisa el formato del correo.");
    }
    setSending(true);
    setExistence("checking");
    setChecked(true);
    try {
      const out = await passwordResetStart({ email: email.trim().toLowerCase() });
      if (out?.challenge_id) {
        setExistence("exists");
        router.replace({
          pathname: "/verify",
          params: { mode: "reset", challenge_id: out.challenge_id, email: email.trim().toLowerCase() },
        });
      } else {
        setExistence("absent");
      }
    } catch (e: any) {
      if (e?.status === 404) {
        setExistence("absent");
      } else {
        setExistence("unknown");
        setChecked(false);
        Alert.alert("Error", e?.message ?? "No se pudo enviar el código.");
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <WaveBackground />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Animated.View entering={FadeInUp.duration(800).delay(200)} style={styles.content}>
            <Ionicons name="key-outline" size={60} color={colors.primary} />
            <Text style={[styles.title, { color: colors.text }]}>¿Olvidaste tu contraseña?</Text>
            <Text style={[styles.subtitle, { color: colors.secondary }]}>
              Ingresa tu email y te enviaremos un código para recuperarla.
            </Text>
            
            <View style={styles.form}>
              <View style={[styles.inputContainer, { borderColor: colors.border }]}>
                  <Ionicons name="mail-outline" size={20} color={colors.secondary} style={styles.inputIcon} />
                  <TextInput
                      value={email}
                      onChangeText={(t) => {
                        setEmail(t.toLowerCase());
                        setExistence("unknown");
                        setChecked(false);
                      }}
                      placeholder="nombre@correo.com"
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="email-address"
                      style={[styles.input, { color: colors.text }]}
                      placeholderTextColor={colors.gray400}
                      returnKeyType="send"
                      onSubmitEditing={onSubmit}
                  />
                  <View style={styles.adornment}>
                    {checked && (
                        existence === "checking" ? <ActivityIndicator size="small" />
                      : existence === "exists" ? <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                      : existence === "absent" ? <Ionicons name="close-circle" size={20} color={colors.error} />
                      : null
                    )}
                  </View>
              </View>

              {checked && existence === "absent" && (
                <Text style={styles.errorText}>
                  No encontramos una cuenta con este correo.
                </Text>
              )}

              <Button
                title="Enviar Código"
                onPress={onSubmit}
                loading={sending}
                disabled={!emailOk}
                style={[styles.submitButton, { backgroundColor: colors.primary }]}
                textStyle={styles.submitButtonText}
              />
            </View>

            <View style={styles.footer}>
                <Pressable onPress={() => router.back()}>
                    <Text style={[styles.linkText, { color: colors.primary }]}>
                        Volver a Iniciar Sesión
                    </Text>
                </Pressable>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 16,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 8,
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
    backgroundColor: '#F9F9F9',
    paddingLeft: 16, // Padding solo a la izquierda, el derecho lo maneja el adorno
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    height: 50,
    fontSize: 16,
    flex: 1,
  },
  adornment: {
    paddingHorizontal: 16,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: 'red',
    fontSize: 12,
    marginTop: -12, // Para que quede pegado al input
    marginBottom: 12,
    paddingLeft: 4,
  },
  submitButton: {
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8, // Menos margen si no hay error
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
  linkText: {
    fontWeight: 'bold',
    fontSize: 14,
  },
});