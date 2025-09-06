import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { useHeaderHeight } from "@react-navigation/elements";
import { Link, useRouter } from "expo-router";
import { useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  Alert,
  Image,
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
import { registerStart } from "../../api/endpoints";
import { colors, spacing, styles } from "../../styles/register";

const schema = z
  .object({
    firstName: z.string().min(2, "El nombre debe tener al menos 2 caracteres."),
    lastName: z.string().min(2, "El apellido debe tener al menos 2 caracteres."),
    email: z.string().email("Email inválido."),
    password: z.string().min(6, "La contraseña debe tener 6 caracteres o más."),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

export default function RegisterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();

  const [showPwd, setShowPwd] = useState(false);
  const [showPwd2, setShowPwd2] = useState(false);

  // refs para foco y detección de gesto en inputs
  const firstRef = useRef<TextInput>(null);
  const lastRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const pwdRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  // tracking del gesto vertical iniciado dentro del input
  const touchStartY = useRef<number | null>(null);

  const gestureHandlers = {
    onTouchStart: (e: NativeSyntheticEvent<NativeTouchEvent>) => {
      touchStartY.current = e.nativeEvent.pageY;
    },
    onTouchMove: (e: NativeSyntheticEvent<NativeTouchEvent>) => {
      if (touchStartY.current == null) return;
      const dy = Math.abs(e.nativeEvent.pageY - touchStartY.current);
      if (dy > 6) {
        // 👇 si el usuario está desplazando verticalmente, soltamos el focus
        // para que el ScrollView tome el gesto y NO se mueva el placeholder
        Keyboard.dismiss();
        touchStartY.current = null;
      }
    },
    onTouchEnd: () => {
      touchStartY.current = null;
    },
  };

  const {
    control,
    handleSubmit,
    getValues,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
    mode: "onChange",
    reValidateMode: "onChange",
  });

  const pwdVal = watch("password");
  const confirmVal = watch("confirmPassword");

  const onTogglePwd = () => {
    if (!pwdVal) {
      pwdRef.current?.focus();
      return;
    }
    setShowPwd((s) => !s);
  };
  const onTogglePwd2 = () => {
    if (!confirmVal) {
      confirmRef.current?.focus();
      return;
    }
    setShowPwd2((s) => !s);
  };

  const attemptSubmit = async () => {
    if (isSubmitting) return;
    const v = getValues();

    if (!v.firstName.trim() || !v.lastName.trim() || !v.email.trim() || !v.password.trim() || !v.confirmPassword.trim()) {
      Alert.alert("Datos incompletos", "Completá todos los campos para continuar.");
      return;
    }
    if (v.password.length < 6) {
      Alert.alert("Contraseña muy corta", "La contraseña debe tener 6 caracteres o más.");
      return;
    }
    if (v.password !== v.confirmPassword) {
      Alert.alert("Contraseñas no coinciden", "Ambas contraseñas deben ser iguales.");
      return;
    }
    await handleSubmit(onSubmit)();
  };

  const onSubmit = async (data: FormValues) => {
    try {
      const out = await registerStart({
        first_name: data.firstName.trim(),
        last_name: data.lastName.trim(),
        email: data.email.trim().toLowerCase(),
        password: data.password,
      });
      router.replace({
        pathname: "/verify",
        params: { mode: "register", challenge_id: out.challenge_id, email: out.email },
      });
    } catch (e: any) {
      const status = e?.status ?? e?.response?.status;
      const serverMsg = e?.data?.detail || e?.data?.message || e?.message || "No se pudo iniciar el registro.";
      if (status === 400) Alert.alert("Email ya registrado", String(serverMsg));
      else Alert.alert("Error de registro", String(serverMsg));
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
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="on-drag"
          contentInsetAdjustmentBehavior="always"
          contentContainerStyle={{ paddingBottom: insets.bottom + spacing.md }}
        >
          {/* NO usar flex:1 aquí, así el ScrollView SIEMPRE scrollea */}
          <View style={[styles.container, { flex: 0 }]}>
            {/* LOGO */}
            <View style={{ height: 120, alignItems: "center", justifyContent: "center", marginBottom: spacing.md }}>
              <Image 
                source={require("../../../assets/logo.png")} 
                style={{ 
                  width: 150, 
                  height: 100, 
                  resizeMode: "contain" 
                }} 
              />
            </View>

            <Text style={styles.title}>¡Cree su cuenta!</Text>

            {/* Nombre */}
            <Text style={styles.label}>Nombre</Text>
            <Controller
              control={control}
              name="firstName"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  ref={firstRef}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="Juan"
                  style={styles.input}
                  returnKeyType="next"
                  scrollEnabled={false}
                  {...gestureHandlers}
                />
              )}
            />
            {!!errors.firstName && <Text style={styles.errorText}>{errors.firstName.message}</Text>}

            {/* Apellido */}
            <Text style={styles.label}>Apellido</Text>
            <Controller
              control={control}
              name="lastName"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  ref={lastRef}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="Pérez"
                  style={styles.input}
                  returnKeyType="next"
                  scrollEnabled={false}
                  {...gestureHandlers}
                />
              )}
            />
            {!!errors.lastName && <Text style={styles.errorText}>{errors.lastName.message}</Text>}

            {/* Email */}
            <Text style={styles.label}>Ingrese su Correo Electrónico</Text>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  ref={emailRef}
                  value={value}
                  onChangeText={(t) => onChange(t.toLowerCase())}
                  onBlur={onBlur}
                  placeholder="tu@email.com"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  style={styles.input}
                  returnKeyType="next"
                  scrollEnabled={false}
                  {...gestureHandlers}
                />
              )}
            />
            {!!errors.email && <Text style={styles.errorText}>{errors.email.message}</Text>}

            {/* Contraseña */}
            <Text style={styles.label}>Ingrese su Contraseña</Text>
            <View style={{ position: "relative" }}>
              <Controller
                control={control}
                name="password"
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
                    returnKeyType="next"
                    scrollEnabled={false}
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
            {!!errors.password && <Text style={styles.errorText}>{errors.password.message}</Text>}

            {/* Confirmación */}
            <Text style={styles.label}>Repita su Contraseña</Text>
            <View style={{ position: "relative" }}>
              <Controller
                control={control}
                name="confirmPassword"
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
                    returnKeyType="done"
                    scrollEnabled={false}
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
            {!!errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword.message}</Text>}

            {/* CTA */}
            <Pressable onPress={attemptSubmit} style={styles.btnPrimary}>
              <Text style={styles.btnPrimaryText}>{isSubmitting ? "Cargando..." : "Registrate"}</Text>
            </Pressable>

            <View style={{ alignItems: "center", marginTop: spacing.sm }}>
              <Text style={{ color: colors.gray600 }}>
                ¿Ya tenés una cuenta?{" "}
                <Link href="/login" style={{ color: colors.secondary, fontWeight: "700" }}>
                  Inicia sesión
                </Link>
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
