import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { useHeaderHeight } from "@react-navigation/elements";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useRef, useState } from "react";
import { Controller, FieldErrors, useForm } from "react-hook-form";
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  NativeSyntheticEvent,
  NativeTouchEvent,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { z } from "zod";
import { passwordResetConfirm } from "../../api/endpoints";
import { colors, spacing, styles } from "../../styles/register";

const schema = z.object({
  new_password: z.string().min(6, "La contraseña debe tener 6 caracteres o más."),
  confirm: z.string(),
}).refine(d => d.new_password === d.confirm, {
  message: "Las contraseñas no coinciden.",
  path: ["confirm"],
});

type FormValues = z.infer<typeof schema>;

export default function ResetConfirmScreen() {
  const router = useRouter();
  const { reset_token = "", email = "" } = useLocalSearchParams<{ reset_token?: string; email?: string }>();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();

  const [showPwd, setShowPwd] = useState(false);
  const [showPwd2, setShowPwd2] = useState(false);

  // refs + handlers para scroll suave cuando se arrastra sobre el input
  const pwdRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);
  const touchStartY = useRef<number | null>(null);

  const gestureHandlers = {
    onTouchStart: (e: NativeSyntheticEvent<NativeTouchEvent>) => {
      touchStartY.current = e.nativeEvent.pageY;
    },
    onTouchMove: (e: NativeSyntheticEvent<NativeTouchEvent>) => {
      if (touchStartY.current == null) return;
      const dy = Math.abs(e.nativeEvent.pageY - touchStartY.current);
      if (dy > 6) {
        Keyboard.dismiss(); // libera el gesto para el ScrollView, sin mover el placeholder
        touchStartY.current = null;
      }
    },
    onTouchEnd: () => {
      touchStartY.current = null;
    },
  };

  const { control, handleSubmit, trigger, getValues, formState: { errors, isSubmitting } } =
    useForm<FormValues>({
      resolver: zodResolver(schema),
      defaultValues: { new_password: "", confirm: "" },
      mode: "onChange",
    });

  const showValidationAlert = (errs: FieldErrors<FormValues>) => {
    const firstMsg = errs.new_password?.message || errs.confirm?.message || "Revisá los datos ingresados.";
    Alert.alert("Campos inválidos", String(firstMsg));
  };

  const attemptSubmit = async () => {
    const v = getValues();
    if (!v.new_password.trim() || !v.confirm.trim()) {
      return Alert.alert("Datos incompletos", "Completá ambos campos para continuar.");
    }
    const ok = await trigger();
    if (!ok) return showValidationAlert(errors);
    await handleSubmit(onSubmit)();
  };

  const onSubmit = async (data: FormValues) => {
    try {
      await passwordResetConfirm({ reset_token: String(reset_token), new_password: data.new_password });
      Alert.alert("Contraseña actualizada", `Ya podés ingresar${email ? ` con ${email}` : ""}.`, [
        { text: "Ir a Iniciar sesión", onPress: () => router.replace("/login") },
      ]);
    } catch (e: any) {
      const msg = e?.data?.detail || e?.data?.message || e?.message || "No se pudo actualizar la contraseña.";
      Alert.alert("Error", String(msg));
    }
  };

  const onTogglePwd = () => {
    // si está vacío, solo enfocamos para evitar “salto” de placeholder
    if (!getValues("new_password")) {
      pwdRef.current?.focus();
      return;
    }
    setShowPwd(s => !s);
  };

  const onTogglePwd2 = () => {
    if (!getValues("confirm")) {
      confirmRef.current?.focus();
      return;
    }
    setShowPwd2(s => !s);
  };

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? headerHeight : 0}
      >
        <ScrollView
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="on-drag"
          contentInsetAdjustmentBehavior="always"
          contentContainerStyle={{ paddingBottom: insets.bottom + spacing.md }}
        >
          {/* SIN flex:1 para que el ScrollView SIEMPRE scrollee */}
          <View style={[styles.container, { flex: 0 }]}>
            <Text style={styles.title}>Restablecer contraseña</Text>
            {!!email && (
              <Text style={{ textAlign: "center", color: colors.gray600, marginBottom: spacing.md }}>
                {String(email)}
              </Text>
            )}

            <Text style={styles.label}>Nueva contraseña</Text>
            <View style={{ position: "relative" }}>
              <Controller
                control={control}
                name="new_password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    ref={pwdRef}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="********"
                    secureTextEntry={!showPwd}
                    autoCapitalize="none"
                    style={[
                      styles.input,
                      { paddingRight: 40 },
                      Platform.OS === "android" && { textAlignVertical: "center", includeFontPadding: false },
                    ]}
                    {...gestureHandlers}
                  />
                )}
              />
              <Pressable
                onPress={onTogglePwd}
                style={[styles.eye, { right: 12 }]}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name={showPwd ? "eye-off-outline" : "eye-outline"} size={20} color={colors.gray600} />
              </Pressable>
            </View>
            {!!errors.new_password && <Text style={styles.errorText}>{errors.new_password.message}</Text>}

            <Text style={styles.label}>Confirmar contraseña</Text>
            <View style={{ position: "relative" }}>
              <Controller
                control={control}
                name="confirm"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    ref={confirmRef}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="********"
                    secureTextEntry={!showPwd2}
                    autoCapitalize="none"
                    style={[
                      styles.input,
                      { paddingRight: 40 },
                      Platform.OS === "android" && { textAlignVertical: "center", includeFontPadding: false },
                    ]}
                    {...gestureHandlers}
                  />
                )}
              />
              <Pressable
                onPress={onTogglePwd2}
                style={[styles.eye, { right: 12 }]}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name={showPwd2 ? "eye-off-outline" : "eye-outline"} size={20} color={colors.gray600} />
              </Pressable>
            </View>
            {!!errors.confirm && <Text style={styles.errorText}>{errors.confirm.message}</Text>}

            <Pressable onPress={attemptSubmit} disabled={isSubmitting} style={[styles.btnPrimary, isSubmitting && { opacity: 0.6 }]}>
              <Text style={styles.btnPrimaryText}>{isSubmitting ? "Guardando..." : "Confirmar"}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
