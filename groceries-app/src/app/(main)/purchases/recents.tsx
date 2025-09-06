import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { getMyLists } from "../../../api/endpoints";
import type { ShoppingListOut } from "../../../api/types";
import { Text } from "../../../components/ui/Text";
import { useTheme } from "../../../providers/theme";

export default function RecentListsScreen() {
  const { colors, spacing, radii } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [data, setData] = React.useState<ShoppingListOut[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const load = async () => {
    try {
      setError(null);
      const lists = await getMyLists();
      setData(lists);
    } catch (e: any) {
      setError(e?.data?.detail || e?.message || "No se pudieron cargar tus listas.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      setLoading(true);
      load();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const renderItem = ({ item }: { item: ShoppingListOut }) => (
    <Pressable
      onPress={() => router.push({ pathname: "/list/[id]", params: { id: String(item.id) } })}
      style={{
        backgroundColor: "#FAFBFC",
        borderWidth: 1,
        borderColor: "#E9EEF5",
        borderRadius: 14,
        padding: spacing.md,
        marginHorizontal: spacing.sm,
        marginBottom: spacing.sm,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <View style={{ gap: 4 }}>
        <Text style={{ fontWeight: "800", color: colors.secondary }}>{item.nombre}</Text>
        <Text style={{ color: colors.gray600, fontSize: 12 }}>Creada: {item.created_at}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.gray500} />
    </Pressable>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.white }} edges={["top", "bottom"]}>
      <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.md }}>
        <Text style={{ fontSize: 20, fontWeight: "800", color: colors.secondary, marginBottom: spacing.sm }}>
          Tus listas recientes
        </Text>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator />
        </View>
      ) : error ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.md }}>
          <Text style={{ color: colors.error, textAlign: "center", marginBottom: spacing.md }}>{error}</Text>
          <Pressable
            onPress={load}
            style={{
              backgroundColor: colors.primary,
              paddingHorizontal: 16,
              height: 42,
              borderRadius: 999,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "800" }}>Reintentar</Text>
          </Pressable>
        </View>
      ) : data.length === 0 ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.md }}>
          <Text style={{ color: colors.gray600, marginBottom: spacing.md, textAlign: "center" }}>
            Aún no tenés listas guardadas.
          </Text>
          <Pressable
            onPress={() => router.replace("/new-list")}
            style={{
              backgroundColor: colors.primary,
              paddingHorizontal: 16,
              height: 42,
              borderRadius: 999,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "800" }}>Crear tu primera lista</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(it) => String(it.id)}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: insets.bottom + 120, paddingTop: spacing.xs }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      )}
    </SafeAreaView>
  );
}
