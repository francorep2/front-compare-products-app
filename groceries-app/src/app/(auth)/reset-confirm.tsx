import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import {
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import Svg, { Defs, Path, Stop, LinearGradient as SvgGradient } from "react-native-svg";
import { z } from "zod";

import { passwordResetConfirm } from "../../api/endpoints";
import { Button } from "../../components/ui/Button";
import { PasswordInput } from "../../components/ui/PasswordInput";
import { useTheme } from "../../providers/theme";


const schema = z.object({
  new_password: z.string().min(6, "La contraseña debe tener 6+ caracteres."),
  confirm: z.string(),
}).refine(d => d.new_password === d.confirm, {
  message: "Las contraseñas no coinciden.",
  path: ["confirm"],
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
        <Path fill="url(#grad)" d={`M0,0 L0,${height * 0.7} Q${width / 2},${height} ${width},${height * 0.7} L${width},0 Z`} />
      </Svg>
    </View>
  );
};

export default function ResetConfirmScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { reset_token = "", email = "" } = useLocalSearchParams<{ reset_token?: string; email?: string }>();

  const { control, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<FormValues>({
      resolver: zodResolver(schema),
      defaultValues: { new_password: "", confirm: "" },
      mode: "onChange",
    });

  const onSubmit = async (data: FormValues) => {
    try {
      await passwordResetConfirm({ reset_token: String(reset_token), new_password: data.new_password });
      Alert.alert("Contraseña actualizada", `Ya puedes iniciar sesión con tu nueva contraseña.`, [
        { text: "Ir a Login", onPress: () => router.replace("/login") },
      ]);
    } catch (e: any) {
      Alert.alert("Error", e?.message || "No se pudo actualizar la contraseña.");
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <WaveBackground />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Animated.View entering={FadeInUp.duration(800).delay(200)} style={styles.content}>
            <Ionicons name="key-outline" size={60} color={colors.primary} />
            <Text style={[styles.title, { color: colors.text }]}>Restablecer Contraseña</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Ingresa tu nueva contraseña para la cuenta:
            </Text>
            {!!email && <Text style={styles.email}>{String(email)}</Text>}
            
            <View style={styles.form}>
                <Controller
                  control={control} name="new_password"
                  render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
                    <View style={styles.fieldContainer}>
                        <View style={[styles.inputContainer, { borderColor: error ? colors.error : colors.border }]}>
                            <Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
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
                      <View style={[styles.inputContainer, { borderColor: error ? colors.error : colors.border }]}>
                        <Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                        <PasswordInput
                          value={value} onChangeText={onChange} onBlur={onBlur}
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
                  title="Confirmar y Guardar"
                  onPress={handleSubmit(onSubmit)}
                  loading={isSubmitting}
                  style={[styles.submitButton, { backgroundColor: colors.primary }]}
                  textStyle={styles.submitButtonText}
                />
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
  },
  email: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#6200EE', // Color primario para destacar el email
    marginBottom: 24,
  },
  form: {
    width: '100%',
  },
  fieldContainer: {
      marginBottom: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    backgroundColor: '#F9F9F9',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    height: 50,
    fontSize: 16,
  },
  errorText: {
    color: 'red',
    fontSize: 12,
    marginTop: 4,
    marginBottom: 8,
    paddingLeft: 4,
  },
  submitButton: {
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
});