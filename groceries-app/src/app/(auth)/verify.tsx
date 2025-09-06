import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import {
  passwordResetResend,
  passwordResetVerify,
  registerResend,
  registerVerify,
} from "../../api/endpoints";
import Screen from "../../components/ui/Screen"; // ajustá el alias si no usás @
import { styles } from "../../styles/verify";


const OTP_LEN = 6;
const RESEND_SECONDS = 60;

export default function VerifyScreen() {
  const router = useRouter();
  const { mode = "register", challenge_id = "", email = "" } =
    useLocalSearchParams<{ mode?: "register" | "reset"; challenge_id?: string; email?: string }>();

  const [digits, setDigits] = useState<string[]>(Array(OTP_LEN).fill(""));
  const [timer, setTimer] = useState(RESEND_SECONDS);
  const [loading, setLoading] = useState(false);
  const inputs = useRef<TextInput[]>([]);

  useEffect(() => {
    const t = setInterval(() => setTimer((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, []);

  const setDigit = (idx: number, val: string) => {
    const v = val.replace(/\D/g, "").slice(-1);
    setDigits((prev) => {
      const next = [...prev];
      next[idx] = v;
      // focus siguiente
      if (v && idx < OTP_LEN - 1) inputs.current[idx + 1]?.focus();
      return next;
    });
  };

  const onKeyPress = (idx: number, key: string) => {
    if (key === "Backspace" && !digits[idx] && idx > 0) {
      inputs.current[idx - 1]?.focus();
      setDigits((prev) => {
        const next = [...prev];
        next[idx - 1] = "";
        return next;
      });
    }
  };

  const code = digits.join("");

  const onVerify = async () => {
    if (!challenge_id || code.length < OTP_LEN) return;
    setLoading(true);
    try {
      if (mode === "register") {
        const token = await registerVerify({ challenge_id: String(challenge_id), code });
        await AsyncStorage.setItem("auth_token", token.access_token);
        router.replace("/home");
      } else {
        const out = await passwordResetVerify({ challenge_id: String(challenge_id), code });
        router.replace({
          pathname: "/reset-confirm",
          params: { reset_token: out.reset_token, email: String(email) },
        });
      }
    } catch (e: any) {
      alert(e?.message ?? "No se pudo verificar el código");
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
      setTimer(RESEND_SECONDS);
    } catch (e: any) {
      alert(e?.message ?? "No se pudo reenviar el código");
    }
  };

  return (
    <Screen contentStyle={styles.container}>
      <Text style={styles.title}>Ingresa el Codigo</Text>
      <Text style={styles.subtitle}>Un codigo de {OTP_LEN} dígitos se envió al correo:</Text>
      {!!email && <Text style={styles.email}>{String(email)}</Text>}

      <View style={styles.otpRow}>
        {digits.map((d, i) => (
          <TextInput
            key={i}
            ref={(r) => { if (r) inputs.current[i] = r; }}
            style={styles.otpBox}
            value={d}
            onChangeText={(v) => setDigit(i, v)}
            onKeyPress={({ nativeEvent }) => onKeyPress(i, nativeEvent.key)}
            keyboardType="number-pad"
            maxLength={1}
            textContentType="oneTimeCode"
            autoFocus={i === 0}
          />
        ))}
      </View>

      <Pressable onPress={onVerify} disabled={loading || code.length < OTP_LEN} style={[styles.btn, (loading || code.length < OTP_LEN) && { opacity: 0.6 }]}>
        <Text style={styles.btnText}>{loading ? "Verificando..." : "Verify"}</Text>
      </Pressable>

      <Pressable disabled={timer > 0} onPress={onResend}>
        <Text style={[styles.resend, timer > 0 && styles.disabledResend]}>
          Reenviar codigo ({String(Math.floor(timer / 60)).padStart(2, "0")}:{String(timer % 60).padStart(2, "0")})
        </Text>
      </Pressable>
    </Screen>
  );
}
