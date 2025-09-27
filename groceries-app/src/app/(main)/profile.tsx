import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { Ionicons } from "@expo/vector-icons";
import { getScrapeSources, setScrapeSources } from "../../api/endpoints";
import type { ScrapeSources } from "../../api/types";
import { useAuth } from "../../providers/auth";
import { useTheme } from "../../providers/theme";

function capitalize(s?: string) {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function getInitials(name?: string) {
    if (!name) return "?";
    const parts = name.split(' ');
    if (parts.length > 1) {
        return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
}

const logos = {
  carrefour: require("../../../assets/company/carrefour.png"),
  coto: require("../../../assets/company/coto.png"),
  jumbo: require("../../../assets/company/jumbo.png"),
  dia: require("../../../assets/company/dia.png"),
} as const;

export default function ProfileScreen() {
  const { colors, spacing } = useTheme();
  const router = useRouter();
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();

  const displayName = capitalize(user?.first_name?.trim() || user?.email.split("@")[0] || "Usuario");
  const userInitials = getInitials(user?.first_name || user?.email);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sources, setSources] = useState<ScrapeSources>({
    carrefour: true, coto: true, jumbo: true, dia: true,
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
    () => (Object.keys(sources) as (keyof ScrapeSources)[]).map((k) => ({
      key: k,
      enabled: sources[k],
      title: capitalize(k),
      icon: logos[k],
    })),
    [sources]
  );

  const toggle = async (key: keyof ScrapeSources) => {
    const next = { ...sources, [key]: !sources[key] };
    if (Object.values(next).every((v) => v === false)) {
      Alert.alert("No permitido", "Debes dejar al menos un supermercado habilitado.");
      return;
    }
    setSources(next);
    setSaving(true);
    try {
      const saved = await setScrapeSources(next);
      setSources(saved);
    } catch (e: any) {
      setSources((prev) => ({ ...prev, [key]: !prev[key] }));
      Alert.alert("Error", e?.message ?? "No se pudieron guardar cambios");
    } finally {
      setSaving(false);
    }
  };

  const onLogout = () => {
    Alert.alert("Cerrar sesión", "¿Quieres salir de tu cuenta?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Cerrar sesión",
        style: "destructive",
        onPress: async () => {
          try { await logout(); } 
          finally { router.replace("/login"); }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={["top"]}>
      <ScrollView 
        contentContainerStyle={[
            styles.container,
            { paddingBottom: insets.bottom + spacing.lg }
        ]}
      >
        
        <Animated.View entering={FadeIn.duration(400)} style={[styles.profileHeader, { backgroundColor: colors.primary }]}>
            <View style={[styles.avatar, { backgroundColor: colors.secondary }]}>
                <Text style={styles.avatarText}>{userInitials}</Text>
            </View>
            <Text style={styles.profileName}>{displayName}</Text>
            <Text style={styles.profileEmail}>{user?.email}</Text>
            <Pressable style={styles.editButton} onPress={() => router.push("/profile-edit")}>
                <Text style={styles.editButtonText}>Editar Perfil</Text>
            </Pressable>
        </Animated.View>

        <Animated.View entering={FadeIn.duration(400).delay(200)}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                Supermercados Habilitados
            </Text>
            <View style={[styles.card, { backgroundColor: colors.white }]}>
                {loading ? <ActivityIndicator style={{ padding: spacing.md }}/> : 
                    items.map((it, index) => (
                        <View key={it.key} style={[styles.rowContainer, { borderBottomColor: colors.border }, index === items.length - 1 && { borderBottomWidth: 0 }]}>
                            <Pressable onPress={() => toggle(it.key)} style={styles.settingsRow}>
                                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                                    <Image source={it.icon} resizeMode="contain" style={styles.logo} />
                                    <Text style={[styles.rowTitle, { color: colors.text }]}>{it.title}</Text>
                                </View>
                                <Switch
                                    value={it.enabled}
                                    onValueChange={() => toggle(it.key)}
                                    disabled={saving}
                                    trackColor={{ true: colors.primary, false: colors.gray100 }}
                                    thumbColor={colors.white}
                                />
                            </Pressable>
                            
                            {it.key === 'coto' && !it.enabled && (
                                <Animated.View entering={FadeIn.duration(300)} exiting={FadeOut.duration(300)} style={styles.cotoDisclaimer}>
                                    <Ionicons name="rocket-outline" size={14} color={colors.success} />
                                    <Text style={[styles.cotoDisclaimerText, { color: colors.success }]}>
                                        ¡Tus búsquedas ahora serán mucho más rápidas!
                                    </Text>
                                </Animated.View>
                            )}
                        </View>
                    ))
                }
            </View>
        </Animated.View>

        <Animated.View entering={FadeIn.duration(400).delay(400)}>
            <Pressable onPress={onLogout} style={styles.logoutButton}>
                <Ionicons name="log-out-outline" size={22} color={colors.error} />
                <Text style={[styles.logoutButtonText, { color: colors.error }]}>Cerrar sesión</Text>
            </Pressable>
        </Animated.View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1 },
    container: {
        padding: 16,
    },
    profileHeader: {
        borderRadius: 20,
        padding: 16, // ANTES: 24
        alignItems: 'center',
        marginBottom: 24,
    },
    avatar: {
        width: 70, // ANTES: 80
        height: 70, // ANTES: 80
        borderRadius: 35, // ANTES: 40
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8, // ANTES: 12
    },
    avatarText: {
        fontSize: 28, // ANTES: 32
        fontWeight: 'bold',
        color: 'white',
    },
    profileName: {
        fontSize: 20, // ANTES: 22
        fontWeight: 'bold',
        color: 'white',
    },
    profileEmail: {
        fontSize: 14, // ANTES: 16
        color: 'rgba(255, 255, 255, 0.7)',
        marginTop: 4,
    },
    editButton: {
        marginTop: 12, // ANTES: 16
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 999,
    },
    editButtonText: {
        color: 'white',
        fontWeight: '600',
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: "600",
        marginBottom: 12,
        paddingHorizontal: 4,
    },
    card: {
        borderRadius: 16,
        backgroundColor: 'white',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
    },
    rowContainer: {
        borderBottomWidth: 1,
        paddingHorizontal: 12,
    },
    settingsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
    },
    logo: {
        width: 40,
        height: 40,
        borderRadius: 8,
    },
    rowTitle: {
        fontSize: 16,
        fontWeight: '500',
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        marginTop: 24,
    },
    logoutButtonText: {
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
    cotoDisclaimer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingBottom: 12,
        paddingHorizontal: 4,
    },
    cotoDisclaimerText: {
        fontSize: 12,
        fontWeight: '500',
    },
});