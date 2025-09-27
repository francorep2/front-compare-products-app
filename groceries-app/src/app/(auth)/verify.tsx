import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
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

import {
  passwordResetResend,
  passwordResetVerify,
  registerResend,
  registerVerify,
} from "../../api/endpoints";
import { Button } from "../../components/ui/Button";
import { useAuth } from "../../providers/auth";
import { useTheme } from "../../providers/theme";

const OTP_LEN = 6;
const RESEND_SECONDS = 60;

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

export default function VerifyScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { loginWithToken } = useAuth(); // Usamos la nueva función del AuthProvider
  const { mode = "register", challenge_id = "", email = "" } =
    useLocalSearchParams<{ mode?: "register" | "reset"; challenge_id?: string; email?: string }>();

  const [digits, setDigits] = useState<string[]>(Array(OTP_LEN).fill(""));
  const [timer, setTimer] = useState(RESEND_SECONDS);
  const [loading, setLoading] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const inputs = useRef<TextInput[]>([]);

  useEffect(() => {
    const t = setInterval(() => setTimer((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, []);

  const setDigit = (idx: number, val: string) => {
    const v = val.replace(/\D/g, "").slice(-1);
    const newDigits = [...digits];
    newDigits[idx] = v;
    setDigits(newDigits);
    
    if (v && idx < OTP_LEN - 1) {
      inputs.current[idx + 1]?.focus();
    }
    
    const finalCode = newDigits.join("");
    if (finalCode.length === OTP_LEN) {
        onVerify(finalCode);
    }
  };

  const onKeyPress = (idx: number, key: string) => {
    if (key === "Backspace" && !digits[idx] && idx > 0) {
      inputs.current[idx - 1]?.focus();
    }
  };

  const code = digits.join("");

  const onVerify = async (fullCode: string) => {
    if (!challenge_id || fullCode.length < OTP_LEN) return;
    setLoading(true);
    try {
      if (mode === "register") {
        const tokenResponse = await registerVerify({ challenge_id: String(challenge_id), code: fullCode });
        await loginWithToken(tokenResponse.access_token);
      } else {
        const out = await passwordResetVerify({ challenge_id: String(challenge_id), code: fullCode });
        router.replace({
          pathname: "/reset-confirm",
          params: { reset_token: out.reset_token, email: String(email) },
        });
      }
    } catch (e: any) {
      Alert.alert("Error de Verificación", e?.message ?? "El código es incorrecto o ha expirado.");
      setDigits(Array(OTP_LEN).fill("")); // Limpia los inputs en caso de error
      inputs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const onResend = async () => {
    if (timer > 0 || !challenge_id) return;
    try {
      if (mode === "register") {
        await registerResend(String(challenge_id));
      } else {
        await passwordResetResend(String(challenge_id));
      }
      Alert.alert("Código Reenviado", `Te hemos enviado un nuevo código a ${email}`);
      setTimer(RESEND_SECONDS);
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "No se pudo reenviar el código.");
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <WaveBackground />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Animated.View entering={FadeInUp.duration(800).delay(200)} style={styles.content}>
            <Ionicons name="shield-checkmark-outline" size={60} color={colors.primary} />
            <Text style={[styles.title, { color: colors.text }]}>Verifica tu cuenta</Text>
            <Text style={[styles.subtitle, { color: colors.secondary }]}>
              Ingresa el código de {OTP_LEN} dígitos que enviamos a:
            </Text>
            {!!email && <Text style={[styles.email, { color: colors.primary }]}>{String(email)}</Text>}
            <Text>Revisa tu bandeja de SPAM</Text>

            <View style={styles.otpRow}>
              {digits.map((d, i) => (
                <TextInput
                  key={i}
                  ref={(r) => { if (r) inputs.current[i] = r; }}
                  style={[
                    styles.otpBox, 
                    { 
                      borderColor: focusedIndex === i ? colors.primary : colors.border, 
                      color: colors.text 
                    }
                  ]}
                  value={d}
                  onChangeText={(v) => setDigit(i, v)}
                  onKeyPress={({ nativeEvent }) => onKeyPress(i, nativeEvent.key)}
                  onFocus={() => setFocusedIndex(i)}
                  keyboardType="number-pad"
                  maxLength={1}
                  textContentType="oneTimeCode"
                  autoFocus={i === 0}
                />
              ))}
            </View>

            <Button
              title="Verificar Código"
              onPress={() => onVerify(code)}
              loading={loading}
              disabled={code.length < OTP_LEN}
              style={[styles.submitButton, { backgroundColor: colors.primary }]}
              textStyle={styles.submitButtonText}
            />

            <Pressable disabled={timer > 0} onPress={onResend}>
              <Text style={[styles.resendText, { color: timer > 0 ? colors.gray400 : colors.primary }]}>
                {timer > 0 ? `Reenviar en 0:${String(timer).padStart(2, '0')}` : "Reenviar código"}
              </Text>
            </Pressable>
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
    paddingHorizontal: 16,
    lineHeight: 22,
  },
  email: {
      fontSize: 16,
      fontWeight: 'bold',
      textAlign: 'center',
      marginTop: 4,
      marginBottom: 24,
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 32,
  },
  otpBox: {
    width: 48,
    height: 52,
    borderWidth: 2,
    borderRadius: 12,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: 'bold',
  },
  submitButton: {
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  resendText: {
      marginTop: 24,
      fontWeight: '600',
      fontSize: 14,
  },
});