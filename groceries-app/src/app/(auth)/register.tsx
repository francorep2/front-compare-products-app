import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useRouter } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import {
  Alert,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View
} from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import Svg, { Defs, Path, Stop, LinearGradient as SvgGradient } from "react-native-svg";
import { z } from "zod";

import { registerStart } from "../../api/endpoints";
import { Button } from "../../components/ui/Button";
import { PasswordInput } from "../../components/ui/PasswordInput";
import { Text } from "../../components/ui/Text";
import { useTheme } from "../../providers/theme";

// --- Esquema de validación con Zod ---
const schema = z
  .object({
    firstName: z.string().min(2, "El nombre debe tener al menos 2 caracteres."),
    lastName: z.string().min(2, "El apellido debe tener al menos 2 caracteres."),
    email: z.string().email("Email inválido."),
    password: z.string().min(6, "La contraseña debe tener 6+ caracteres."),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

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

// --- Componente de Input controlado ---
const ControlledInput = ({ control, name, placeholder, icon, ...props }) => {
    const { colors } = useTheme();
    return (
        <Controller
            control={control}
            name={name}
            render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
                <View>
                    <View style={[styles.inputContainer, { borderColor: error ? colors.error : colors.border }]}>
                        <Ionicons name={icon} size={20} color={colors.secondary} style={styles.inputIcon} />
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
}

// --- Pantalla Principal ---
export default function RegisterScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const { control, handleSubmit } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { firstName: "", lastName: "", email: "", password: "", confirmPassword: "" },
  });

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
      const msg = e?.message || "No se pudo iniciar el registro.";
      Alert.alert("Error de registro", String(msg));
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <WaveBackground />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Animated.View entering={FadeInUp.duration(800).delay(200)} style={styles.content}>
            <Image source={require("../../../assets/logo.png")} style={styles.logo} />
            <Text style={[styles.title, { color: colors.text }]}>Crea tu cuenta</Text>
            <Text style={[styles.subtitle, { color: colors.secondary }]}>Completa tus datos para empezar</Text>
            
            <View style={styles.form}>
              <ControlledInput control={control} name="firstName" placeholder="Nombre" icon="person-outline" />
              <ControlledInput control={control} name="lastName" placeholder="Apellido" icon="person-outline" />
              <ControlledInput control={control} name="email" placeholder="Email" icon="mail-outline" keyboardType="email-address" autoCapitalize="none" />
              
              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
                    <View>
                        <View style={[styles.inputContainer, { borderColor: error ? colors.error : colors.border }]}>
                            <Ionicons name="lock-closed-outline" size={20} color={colors.secondary} style={styles.inputIcon} />
                            <PasswordInput
                                value={value}
                                onChangeText={onChange}
                                onBlur={onBlur}
                                placeholder="Contraseña"
                                style={[styles.input, { flex: 1, color: colors.text }]}
                                placeholderTextColor={colors.gray400}
                            />
                        </View>
                        {error && <Text style={styles.errorText}>{error.message}</Text>}
                    </View>
                )}
              />
              <Controller
                control={control}
                name="confirmPassword"
                render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
                    <View>
                        <View style={[styles.inputContainer, { borderColor: error ? colors.error : colors.border }]}>
                            <Ionicons name="lock-closed-outline" size={20} color={colors.secondary} style={styles.inputIcon} />
                            <PasswordInput
                                value={value}
                                onChangeText={onChange}
                                onBlur={onBlur}
                                placeholder="Confirmar contraseña"
                                style={[styles.input, { flex: 1, color: colors.text }]}
                                placeholderTextColor={colors.gray400}
                            />
                        </View>
                        {error && <Text style={styles.errorText}>{error.message}</Text>}
                    </View>
                )}
              />

              <Button
                title="Crear Cuenta"
                onPress={handleSubmit(onSubmit)}
                style={[styles.submitButton, { backgroundColor: colors.primary }]}
                textStyle={styles.submitButtonText}
              />
            </View>

            <View style={styles.footer}>
              <Text style={[styles.footerText, { color: colors.secondary }]}>
                ¿Ya tienes una cuenta?{" "}
                <Link href="/login" asChild>
                    <Text style={[styles.linkText, { color: colors.primary }]}>
                        Inicia sesión
                    </Text>
                </Link>
              </Text>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// --- ESTILOS VISUALES ---
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
  logo: {
    width: 60,
    height: 60,
    resizeMode: 'contain',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
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
    backgroundColor: '#F9F9F9',
    marginBottom: 4, // Espacio reducido para que el error quede cerca
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    height: 50,
    fontSize: 16,
    flex: 1,
  },
  errorText: {
    color: 'red',
    fontSize: 12,
    marginBottom: 12, // Espacio después del error
    paddingLeft: 4,
  },
  submitButton: {
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
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