// app/(main)/purchases.tsx
import { Ionicons } from "@expo/vector-icons";
import { useHeaderHeight } from "@react-navigation/elements";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { getMyLists } from "../../api/endpoints";
import type { ShoppingListOut } from "../../api/types";
import { Text } from "../../components/ui/Text";
import { useTheme } from "../../providers/theme";

function parseDDMMYYYY(s: string): number {
  // s = "dd-mm-YYYY" -> timestamp
  const [dd, mm, yyyy] = s.split("-").map(Number);
  return new Date(yyyy, (mm || 1) - 1, dd || 1).getTime();
}

export default function PurchasesMenu() {
  const { colors, spacing, radii } = useTheme();
  const insets = useSafeAreaInsets();
  const headerH = useHeaderHeight();
  const router = useRouter();

  const [lists, setLists] = React.useState<ShoppingListOut[]>([]);
  const [loading, setLoading] = React.useState(true);

  const load = async () => {
    try {
      const data = await getMyLists();
      // ordenar desc por fecha (dd-mm-YYYY) y tomar 5
      const ordered = [...data].sort((a, b) => parseDDMMYYYY(b.created_at) - parseDDMMYYYY(a.created_at));
      setLists(ordered.slice(0, 5));
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      setLoading(true);
      load();
    }, [])
  );

  const goAll = () => router.push("/purchases/recents");
  const goNewList = () => router.push("/new-list");

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.white }} edges={["top", "bottom"]}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          padding: spacing.md,
          paddingBottom: insets.bottom + 160, // espacio para la navbar + botón flotante
        }}
      >
        {/* Título */}
        <Text style={{ fontSize: 20, fontWeight: "800", color: colors.secondary, marginBottom: spacing.xs }}>
          ¡Tus Listas de Compras!
        </Text>

        {/* Ver todas */}
        <Pressable onPress={goAll} hitSlop={8} style={{ alignSelf: "flex-start", marginBottom: spacing.md }}>
          <Text style={{ color: colors.secondary, fontWeight: "700" }}>Ver todas las listas</Text>
        </Pressable>

        {/* Últimas 5 */}
        <Text style={{ color: colors.tertiary, marginBottom: spacing.sm , fontSize:12 }}>Últimas 5</Text>

        {loading ? (
          <View style={{ paddingVertical: 15, alignItems: "center" }}>
            <ActivityIndicator />
          </View>
        ) : lists.length === 0 ? (
          <View style={{ paddingVertical: 24 }}>
            <Text style={{ color: colors.gray600 }}>Aún no tenés listas. ¡Creá la primera!</Text>
          </View>
        ) : (
          <View style={{ gap: spacing.sm }}>
            {lists.map((it) => (
              <Pressable
                key={it.id}
                onPress={() => {
                  router.push({ pathname: "/list/[id]", params: { id: String(it.id) } })
                }}
                
                style={{
                  backgroundColor: "#FAFBFC",
                  borderWidth: 1,
                  borderColor: "#E9EEF5",
                  borderRadius: 10,
                  padding: 6,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  
                }}
              >
                <View style={{ gap: 2 }}>
                  <Text style={{ fontWeight: "800", color: colors.secondary }}>{it.nombre}</Text>
                  <Text style={{ color: colors.gray600, fontSize: 10 }}>Creada: {it.created_at}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.gray500} />
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Botón flotante centrado, arriba de la navbar */}
      <Pressable
        onPress={goNewList}
        style={{
          position: "absolute",
          alignSelf: "center",
          // Altura aproximada para quedar justo sobre la BottomBar (BAR_HEIGHT ~66 + margen)
          bottom: Math.max(insets.bottom, 10) + 105,
          minWidth: 220,
          height: 48,
          borderRadius: 999,
          backgroundColor: colors.primary,
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "row",
          gap: 10,
          paddingHorizontal: 18,
          zIndex: 30,
        }}
      >
        <Ionicons name="add-circle" size={22} color="#fff" />
        <Text style={{ color: "#fff", fontWeight: "800", }}>Nueva Lista</Text>
      </Pressable>
    </SafeAreaView>
  );
}
