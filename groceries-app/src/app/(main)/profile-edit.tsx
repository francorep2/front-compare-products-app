import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { Controller, useForm } from "react-hook-form";
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
  View,
} from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Defs, Path, Stop, LinearGradient as SvgGradient } from "react-native-svg";
import { z } from "zod";

import { updateMe } from "../../api/endpoints";
import { Button } from "../../components/ui/Button";
import { PasswordInput } from "../../components/ui/PasswordInput";
import { useAuth } from "../../providers/auth";
import { useTheme } from "../../providers/theme";
import { colors } from "../../theme/colors";

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

const WaveBackground = () => {
  const { colors } = useTheme();
  const { width } = Dimensions.get('window');
  const height = 180;

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height }}>
      <Svg height="100%" width="100%" viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          <SvgGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={colors.primary} stopOpacity="1" />
            <Stop offset="100%" stopColor={colors.secondary} stopOpacity="1" />
          </SvgGradient>
        </Defs>
        <Path fill="url(#grad)" d={`M0,0 L0,${height * 0.6} Q${width / 2},${height} ${width},${height * 0.6} L${width},0 Z`} />
      </Svg>
    </View>
  );
};

const ControlledInput = ({ control, name, placeholder, icon, ...props }) => {
    const { colors } = useTheme();
    return (
        <Controller
            control={control}
            name={name}
            render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
                <View style={styles.fieldContainer}>
                    <Text style={[styles.label, { color: colors.primary }]}>{placeholder}</Text>
                    <View style={[styles.inputContainer, { borderColor: error ? colors.error : colors.border }]}>
                        <Ionicons name={icon} size={20} color={colors.primary} style={styles.inputIcon} />
                        <TextInput
                            value={value}
                            onChangeText={onChange}
                            onBlur={onBlur}
                            placeholder={placeholder}
                            style={[styles.input, { color: colors.text }]}
                            placeholderTextColor={colors.gray400}
                            {...props}
                        />
                    </View>
                    {error && <Text style={styles.errorText}>{error.message}</Text>}
                </View>
            )}
        />
    )
};

export default function ProfileEditScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { user, logout } = useAuth();

  const { control, handleSubmit, formState: { isSubmitting, errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      first_name: user?.first_name ?? "",
      last_name:  user?.last_name  ?? "",
      email:      user?.email ?? "",
      password: "",
      confirm: "",
    },
    mode: "onChange",
  });

  const onSubmit = async (data: FormValues) => {
    const payload: Record<string, string> = {};
    if (data.first_name && data.first_name.trim() !== user?.first_name) payload.first_name = data.first_name.trim();
    if (data.last_name && data.last_name.trim() !== user?.last_name) payload.last_name = data.last_name.trim();
    if (data.email && data.email.trim().toLowerCase() !== user?.email) payload.email = data.email.trim().toLowerCase();
    if (data.password) payload.password = data.password;

    if (Object.keys(payload).length === 0) {
      Alert.alert("Sin cambios", "No modificaste ningún dato.");
      return;
    }
    
    const mustLogout = "email" in payload || "password" in payload;

    try {
      await updateMe(payload);
      if (mustLogout) {
        Alert.alert("Perfil actualizado", "Por seguridad, vamos a cerrar tu sesión.", [
          { text: "OK", onPress: async () => { await logout(); router.replace("/login"); } },
        ]);
      } else {
        Alert.alert("Perfil actualizado", "Tus datos fueron guardados.", [
          { text: "OK", onPress: () => router.back() },
        ]);
      }
    } catch (e: any) {
      Alert.alert("Error", e?.message || "No se pudo actualizar el perfil.");
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <WaveBackground />
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color={colors.white} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.white }]}>Editar Perfil</Text>
          <View style={{ width: 40 }} />
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
            <Animated.View entering={FadeInUp.duration(800).delay(200)} style={[styles.contentCard, { backgroundColor: colors.white }]}>
              <View style={styles.form}>
                <ControlledInput control={control} name="first_name" placeholder="Nombre" icon="person-outline" />
                <ControlledInput control={control} name="last_name" placeholder="Apellido" icon="person-outline" />
                <ControlledInput control={control} name="email" placeholder="Email" icon="mail-outline" keyboardType="email-address" autoCapitalize="none" />

                <Text style={[styles.sectionTitle, { color: colors.tertiary }]}>Cambiar contraseña (opcional)</Text>
                
                <Controller
                  control={control} name="password"
                  render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
                    <View style={styles.fieldContainer}>
                      <Text style={[styles.label, { color: colors.tertiary }]}>Nueva contraseña</Text>
                      <View style={[styles.inputContainer, { borderColor: error ? colors.error : colors.border }]}>
                        <Ionicons name="lock-closed-outline" size={20} color={colors.tertiary} style={styles.inputIcon} />
                        <PasswordInput
                          value={value} onChangeText={onChange} onBlur={onBlur}
                          placeholder="Nueva contraseña"
                          style={[styles.input, { flex: 1, color: colors.text }]}
                          placeholderTextColor={colors.gray400}
                        />
                      </View>
                      {error && <Text style={styles.errorText}>{error.message}</Text>}
                    </View>
                  )}
                />
                <Controller
                  control={control} name="confirm"
                  render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
                    <View style={styles.fieldContainer}>
                      <Text style={[styles.label, { color: colors.tertiary }]}>Confirmar contraseña</Text>
                      <View style={[styles.inputContainer, { borderColor: error ? colors.error : colors.border }]}>
                        <Ionicons name="lock-closed-outline" size={20} color={colors.tertiary} style={styles.inputIcon} />
                        <PasswordInput
                          value={value} onChangeText={onChange} onBlur={onBlur}
                          placeholder="Confirmar nueva contraseña"
                          style={[styles.input, { flex: 1, color: colors.text }]}
                          placeholderTextColor={colors.gray400}
                        />
                      </View>
                      {error && <Text style={styles.errorText}>{error.message}</Text>}
                    </View>
                  )}
                />

                <Button
                  title="Guardar Cambios"
                  onPress={handleSubmit(onSubmit)}
                  loading={isSubmitting}
                  style={[styles.submitButton, { backgroundColor: colors.primary }]}
                  textStyle={styles.submitButtonText}
                />
              </View>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12
    },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 35, fontWeight: 'bold' },
  container: {
    flexGrow: 1,
    padding: 16,
  },
  contentCard: {
    padding: 20,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 15,
    elevation: 5,
  },
  form: { width: '100%' },
  fieldContainer: {
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
    paddingLeft: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 12,
    opacity: 0.8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    backgroundColor: '#F9F9F9',
  },
  inputIcon: { marginRight: 12 },
  input: {
    height: 50,
    fontSize: 16,
  },
  errorText: {
    color: 'red',
    fontSize: 12,
    marginTop: 4,
    paddingLeft: 4,
  },
  submitButton: {
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
});