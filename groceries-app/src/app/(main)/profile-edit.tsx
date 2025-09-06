import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { z } from "zod";

import { useHeaderHeight } from "@react-navigation/elements";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { updateMe } from "../../api/endpoints";
import { useAuth } from "../../providers/auth";
import { colors, spacing, styles } from "../../styles/register";

const schema = z.object({
  first_name: z.string().min(2, "Mínimo 2 caracteres.").optional().or(z.literal("")),
  last_name:  z.string().min(2, "Mínimo 2 caracteres.").optional().or(z.literal("")),
  email:      z.string().email("Email inválido.").optional().or(z.literal("")),
  password:   z.string().min(6, "Mínimo 6 caracteres.").optional().or(z.literal("")),
  confirm:    z.string().optional().or(z.literal("")),
}).refine(d => !d.password || d.password === d.confirm, {
  message: "Las contraseñas no coinciden.",
  path: ["confirm"],
});

type FormValues = z.infer<typeof schema>;

export default function ProfileEditScreen() {
  const router = useRouter();
  const { user, logout } = useAuth(); // 👈 usamos logout
  const insets = useSafeAreaInsets();
  const headerH = useHeaderHeight();

  const currentFirst = (user as any)?.first_name ?? (user as any)?.firstName ?? "";
  const currentLast  = (user as any)?.last_name  ?? (user as any)?.lastName  ?? "";
  const currentEmail = user?.email ?? "";

  const [showPwd, setShowPwd] = useState(false);
  const [showPwd2, setShowPwd2] = useState(false);

  const { control, handleSubmit, getValues, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      first_name: currentFirst,
      last_name: currentLast,
      email: currentEmail,
      password: "",
      confirm: "",
    },
    mode: "onChange",
  });

  const onSubmit = async (data: FormValues) => {
    // armar payload solo con cambios reales
    const payload: Record<string, string> = {};
    const fn = data.first_name?.trim();
    const ln = data.last_name?.trim();
    const em = data.email?.trim().toLowerCase();
    const pw = data.password?.trim();

    if (fn && fn !== currentFirst) payload.first_name = fn;
    if (ln && ln !== currentLast)  payload.last_name  = ln;
    if (em && em !== currentEmail) payload.email      = em;
    if (pw)                        payload.password   = pw;

    if (Object.keys(payload).length === 0) {
      Alert.alert("Sin cambios", "No modificaste ningún dato.");
      return;
    }

    const mustLogout = "email" in payload || "password" in payload;

    try {
      await updateMe(payload);

      if (mustLogout) {
        Alert.alert(
          "Perfil actualizado",
          "Actualizaste tu correo o contraseña. Por seguridad, vamos a cerrar tu sesión.",
          [
            {
              text: "OK",
              onPress: async () => {
                try { await logout(); } finally { router.replace("/login"); }
              },
            },
          ]
        );
      } else {
        Alert.alert("Perfil actualizado", "Tus datos fueron guardados.", [
          { text: "OK", onPress: () => router.back() },
        ]);
      }
    } catch (e: any) {
      const msg = e?.data?.detail || e?.data?.message || e?.message || "No se pudo actualizar el perfil.";
      Alert.alert("Error", String(msg));
    }
  };

  const attemptSubmit = async () => {
    const v = getValues();
    if (v.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)) {
      Alert.alert("Email inválido", "Revisá el formato del correo.");
      return;
    }
    if (v.password && v.password.length < 6) {
      Alert.alert("Contraseña muy corta", "Debe tener 6 caracteres o más.");
      return;
    }
    if (v.password && v.password !== v.confirm) {
      Alert.alert("Contraseñas no coinciden", "Ambas contraseñas deben ser iguales.");
      return;
    }
    await handleSubmit(onSubmit)();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "white" }} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.select({ ios: "padding", android: "height" })}
        keyboardVerticalOffset={Platform.OS === "ios" ? headerH : 0}
      >
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: spacing.md, paddingBottom: insets.bottom + 120 }}>
          <Text style={styles.title}>Editar Perfil</Text>

          {/* Nombre */}
          <Text style={styles.label}>Nombre</Text>
          <Controller
            control={control}
            name="first_name"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput value={value} onChangeText={onChange} onBlur={onBlur} placeholder="Nombre" style={styles.input} />
            )}
          />
          {!!errors.first_name && <Text style={styles.errorText}>{errors.first_name.message as string}</Text>}

          {/* Apellido */}
          <Text style={styles.label}>Apellido</Text>
          <Controller
            control={control}
            name="last_name"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput value={value} onChangeText={onChange} onBlur={onBlur} placeholder="Apellido" style={styles.input} />
            )}
          />
          {!!errors.last_name && <Text style={styles.errorText}>{errors.last_name.message as string}</Text>}

          {/* Email */}
          <Text style={styles.label}>Correo Electrónico</Text>
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                value={value}
                onChangeText={(t) => onChange(t.toLowerCase())}
                onBlur={onBlur}
                placeholder="nombre@correo.com"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                style={styles.input}
              />
            )}
          />
          {!!errors.email && <Text style={styles.errorText}>{errors.email.message as string}</Text>}

          {/* Password */}
          <Text style={styles.label}>Nueva contraseña (opcional)</Text>
          <View style={{ position: "relative" }}>
            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="********"
                  secureTextEntry={!showPwd}
                  autoCapitalize="none"
                  style={[styles.input, { paddingRight: 40 }]}
                />
              )}
            />
            <Pressable style={styles.eye} onPress={() => setShowPwd((s) => !s)}>
              <Ionicons name={showPwd ? "eye-off-outline" : "eye-outline"} size={20} color={colors.gray600} />
            </Pressable>
          </View>
          {!!errors.password && <Text style={styles.errorText}>{errors.password.message as string}</Text>}

          {/* Confirm */}
          <Text style={styles.label}>Confirmar contraseña</Text>
          <View style={{ position: "relative" }}>
            <Controller
              control={control}
              name="confirm"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="********"
                  secureTextEntry={!showPwd2}
                  autoCapitalize="none"
                  style={[styles.input, { paddingRight: 40 }]}
                />
              )}
            />
            <Pressable style={styles.eye} onPress={() => setShowPwd2((s) => !s)}>
              <Ionicons name={showPwd2 ? "eye-off-outline" : "eye-outline"} size={20} color={colors.gray600} />
            </Pressable>
          </View>
          {!!errors.confirm && <Text style={styles.errorText}>{errors.confirm.message as string}</Text>}

          {/* Botón Guardar */}
          <Pressable onPress={attemptSubmit} disabled={isSubmitting} style={[styles.btnPrimary, isSubmitting && { opacity: 0.6 }]}>
            <Text style={styles.btnPrimaryText}>{isSubmitting ? "Guardando..." : "Guardar cambios"}</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
