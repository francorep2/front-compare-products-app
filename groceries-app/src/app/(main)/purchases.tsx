// app/(main)/purchases.tsx
import { Ionicons } from "@expo/vector-icons";
import { useHeaderHeight } from "@react-navigation/elements";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { deleteList, getMyLists } from "../../api/endpoints";
import type { ShoppingListOut } from "../../api/types";
import { Text } from "../../components/ui/Text";
import { useTheme } from "../../providers/theme";
import { Divider } from "../../components/ui/Divider";


function parseDDMMYYYY(s: string): number {
  const [dd, mm, yyyy] = s.split("-").map(Number);
  return new Date(yyyy, (mm || 1) - 1, dd || 1).getTime();
}

export default function PurchasesMenu() {
  const { colors, spacing } = useTheme();              // ✅ hook en top-level
  const insets = useSafeAreaInsets();                  // ✅ hook en top-level
  const headerH = useHeaderHeight();                   // ✅ hook en top-level
  const router = useRouter();                          // ✅ hook en top-level

  const [lists, setLists] = React.useState<ShoppingListOut[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [deletingId, setDeletingId] = React.useState<number | null>(null);

  const load = React.useCallback(async () => {
    try {
      const data = await getMyLists();
      const ordered = [...data].sort((a, b) => parseDDMMYYYY(b.created_at) - parseDDMMYYYY(a.created_at));
      setLists(ordered.slice(0, 5));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      setLoading(true);
      load();
    }, [load])
  );

  const goAll = () => router.push("/purchases/recents");
  const goNewList = () => router.push("/new-list");

  const onDelete = (id: number, name: string) => {
    Alert.alert("Eliminar lista", `¿Querés borrar “${name}”?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          try {
            setDeletingId(id);
            await deleteList(id);
            setLists(prev => prev.filter(l => l.id !== id));
          } catch (e: any) {
            Alert.alert("Error", e?.data?.detail || e?.message || "No se pudo eliminar la lista.");
          } finally {
            setDeletingId(null);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.white }} edges={["top", "bottom"]}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          padding: spacing.md,
          paddingBottom: insets.bottom + 160,
        }}
      >
        <Text style={{ fontSize: 30, fontWeight: "800", color: colors.secondary, marginBottom: spacing.xs }}>
          ¡Tus Listas de Compras!
        </Text>
        <View style={{ height: 1, backgroundColor: "#E9EEF5", opacity: 0.7, marginBottom: spacing.md }} />


        {/* Ver todas (como botón) */}
        <View style={{ alignItems: "center"}}>
        <Pressable
          onPress={goAll}
          hitSlop={8}
          android_ripple={{ color: "#00000010", borderless: false }}
          style={{
            marginBottom: spacing.md,
            paddingVertical: 8,
            paddingHorizontal: 14,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: colors.tertiary,
            backgroundColor: "white",
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
          }}
        >
          
          <Ionicons name="albums-outline" size={16} color={colors.tertiary} />
          <Text style={{ color: colors.tertiary, fontWeight: "800" }}>
            Ver todas las listas
          </Text>
          <Ionicons name="chevron-forward" size={16} color={colors.tertiary} />
        </Pressable>
        </View> 

        <View style={{ height: 1, backgroundColor: "#E9EEF5", opacity: 0.7, marginBottom: spacing.md }} />

        <Text style={{ color: colors.tertiary, marginBottom: spacing.sm, fontSize: 12 }}>Últimas 5</Text>

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
              <View
                key={it.id}
                style={{
                  backgroundColor: "#FAFBFC",
                  borderWidth: 1,
                  borderColor: "#E9EEF5",
                  borderRadius: 10,
                  padding: 6,
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                {/* Navegación al detalle */}
                <Pressable
                  onPress={() => router.push({ pathname: "/list/[id]", params: { id: String(it.id) } })}
                  style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
                  hitSlop={6}
                >
                  <View style={{ gap: 2 }}>
                    <Text style={{ fontWeight: "800", color: colors.secondary }}>{it.nombre}</Text>
                    <Text style={{ color: colors.gray600, fontSize: 10 }}>Creada: {it.created_at}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.gray500} />
                </Pressable>

                {/* Borrar lista (no usa hooks) */}
                <Pressable onPress={() => onDelete(it.id, it.nombre)} hitSlop={10} style={{ paddingHorizontal: 6, paddingVertical: 4, marginLeft: 4 }}>
                  {deletingId === it.id ? (
                    <ActivityIndicator />
                  ) : (
                    <Ionicons name="trash-outline" size={20} color={colors.tertiary ?? "#ef4444"} />
                  )}
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Botón flotante centrado */}
      <Pressable
        onPress={goNewList}
        style={{
          position: "absolute",
          alignSelf: "center",
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
        <Text style={{ color: "#fff", fontWeight: "800" }}>Nueva Lista</Text>
      </Pressable>
    </SafeAreaView>
  );
}
