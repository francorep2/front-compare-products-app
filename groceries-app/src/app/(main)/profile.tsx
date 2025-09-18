import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, Image, Pressable, ScrollView, Switch, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { getScrapeSources, setScrapeSources } from "../../api/endpoints";
import type { ScrapeSources } from "../../api/types";
import { Text } from "../../components/ui/Text";
import { useAuth } from "../../providers/auth";
import { useTheme } from "../../providers/theme";

function capitalize(s?: string) {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const logos = {
  carrefour: require("../../../assets/company/carrefour.png"),
  coto: require("../../../assets/company/coto.png"),
  jumbo: require("../../../assets/company/jumbo.png"),
  dia: require("../../../assets/company/dia.png"),
} as const;

export default function ProfileScreen() {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout } = useAuth();

  const displayNameRaw = user?.name?.trim() || user?.email.split("@")[0] || "Usuario";
  const displayName = capitalize(displayNameRaw);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sources, setSources] = useState<ScrapeSources>({
    carrefour: true,
    coto: true,
    jumbo: true,
    dia: true,
  });

  useEffect(() => {
    (async () => {
      try {
        const data = await getScrapeSources();
        setSources(data);
      } catch (e: any) {
        Alert.alert("Error", e?.message ?? "No se pudieron cargar preferencias");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const items = useMemo(
    () =>
      (Object.keys(sources) as (keyof ScrapeSources)[]).map((k) => ({
        key: k,
        enabled: sources[k],
        title: capitalize(k),
        icon: logos[k],
      })),
    [sources]
  );

  const toggle = async (key: keyof ScrapeSources) => {
    const next = { ...sources, [key]: !sources[key] };

    const allFalse = Object.values(next).every((v) => v === false);
    if (allFalse) {
      Alert.alert(
        "No permitido",
        "Debés dejar al menos un supermercado habilitado."
      );
      return;
    }

    setSources(next);
    setSaving(true);
    try {
      const saved = await setScrapeSources(next);
      setSources(saved);
    } catch (e: any) {
      setSources((prev) => ({ ...prev, [key]: !prev[key] }));
      if (e?.status === 422) {
        Alert.alert(
          "No permitido",
          e?.data?.detail?.[0]?.msg ??
            "El servidor no permite deshabilitar todas las fuentes."
        );
      } else {
        Alert.alert("Error", e?.message ?? "No se pudieron guardar cambios");
      }
    } finally {
      setSaving(false);
    }
  };

  const onEditProfile = () => router.push("/profile-edit");

  const onLogout = () => {
    Alert.alert("Cerrar sesión", "¿Querés salir de tu cuenta?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Cerrar sesión",
        style: "destructive",
        onPress: async () => {
          try {
            await logout();
          } finally {
            router.replace("/login");
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
          Bienvenido! <Text style={{ fontSize: 32, color: colors.secondary }}>{displayName}</Text>
        </Text>

        <Text style={{ color: colors.gray600, marginBottom: spacing.lg }} />

        {/* Preferencias de scraping */}
        <Text style={{ fontSize: 18, fontWeight: "700", marginBottom: spacing.sm }}>
          Supermercados habilitados
        </Text>
        {items.map((it) => (
          <Pressable
            key={it.key}
            onPress={() => !loading && !saving && toggle(it.key)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingVertical: spacing.sm,
              paddingHorizontal: spacing.md,
              marginBottom: spacing.sm,
              borderRadius: 12,
              backgroundColor: colors.gray100,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <Image
                source={it.icon}
                resizeMode="contain"
                style={{ width: 32, height: 32, borderRadius: 6, backgroundColor: "#fff" }}
              />
              <Text style={{ fontSize: 16 }}>{it.title}</Text>
            </View>
            <Switch
              value={it.enabled}
              onValueChange={() => toggle(it.key)}
              disabled={loading || saving}
              trackColor={{ true: colors.primary, false: "#ccc" }}
              thumbColor={it.enabled ? colors.secondary : "#eee"}
            />
          </Pressable>
        ))}

        <View style={{ height: 1, backgroundColor: "#E9EEF5", marginVertical: spacing.lg }} />

        {/* Botón: Editar Perfil */}
        <Pressable onPress={onEditProfile} style={buttonStyle}>
          <Text style={buttonText}>Editar Perfil</Text>
        </Pressable>

        <View style={{ height: 1, backgroundColor: "#E9EEF5", marginVertical: spacing.lg }} />

        {/* Botón: Cerrar sesión */}
        <Pressable onPress={onLogout} style={buttonStyle}>
          <Text style={buttonText}>Cerrar sesión</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
