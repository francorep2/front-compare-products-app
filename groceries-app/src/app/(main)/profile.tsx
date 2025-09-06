// app/(main)/profile.tsx
import { useRouter } from "expo-router";
import { Alert, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { Text } from "../../components/ui/Text";
import { useAuth } from "../../providers/auth";
import { useTheme } from "../../providers/theme";

function capitalize(s?: string) {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function ProfileScreen() {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout } = useAuth(); 


  const first_name = user?.email;
 

  const onEditProfile = () => router.push("/profile-edit");

  const onLogout = () => {
    Alert.alert("Cerrar sesión", "¿Querés salir de tu cuenta?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Cerrar sesión",
        style: "destructive",
        onPress: async () => {
          try {
            await logout();                 // limpia token/estado
          } finally {
            router.replace("/login");       // vuelve al flujo de auth
          }
        },
      },
    ]);
  };

  const buttonStyle = {
    alignSelf: "stretch" as const,
    height: 48,
    borderRadius: 999,
    backgroundColor: colors.primary,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  };

  const buttonText = { color: "#fff", fontWeight: "800" as const };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.white }} edges={["top", "bottom"]}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: spacing.md, paddingBottom: insets.bottom + 120 }}
      >
        <Text style={{ fontSize: 32, fontWeight: "800", marginBottom: spacing.xs }}>
          Bienvenido! <Text style={{ color: colors.secondary }}>{first_name}</Text>
        </Text>

        <Text style={{ color: colors.gray600, marginBottom: spacing.lg }}>
        </Text>

        <View style={{ height: 1, backgroundColor: "#E9EEF5", marginVertical: spacing.lg }} />

        {/* Botón: Editar Perfil */}
        <Pressable onPress={onEditProfile} style={buttonStyle}>
          <Text style={buttonText}>Editar Perfil</Text>
        </Pressable>

        {/* Separador fino */}
        <View style={{ height: 1, backgroundColor: "#E9EEF5", marginVertical: spacing.lg }} />

        {/* Botón: Cerrar sesión (mismo estilo) */}
        <Pressable onPress={onLogout} style={buttonStyle}>
          <Text style={buttonText}>Cerrar sesión</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
