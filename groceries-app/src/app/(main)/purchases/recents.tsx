import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { getMyLists } from "../../../api/endpoints";
import type { ShoppingListOut } from "../../../api/types";
import { Button } from "../../../components/ui/Button";
import { useTheme } from "../../../providers/theme";

export default function RecentListsScreen() {
  const { colors, spacing } = useTheme();
  const router = useRouter();

  const [data, setData] = useState<ShoppingListOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setError(null);
      const lists = await getMyLists();
      const ordered = [...lists].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setData(ordered);
    } catch (e: any) {
      setError(e?.message || "No se pudieron cargar tus listas.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const renderItem = ({ item, index }: { item: ShoppingListOut, index: number }) => (
    <Animated.View entering={FadeInUp.duration(500).delay(index * 50)}>
      <Pressable
        onPress={() => router.push({ pathname: "/list/[id]", params: { id: String(item.id) } })}
        style={[styles.card, { backgroundColor: colors.white, borderColor: colors.border }]}
      >
        <View style={[styles.cardIcon, { backgroundColor: colors.primary_bg }]}>
            <Ionicons name="list-outline" size={24} color={colors.primary} />
        </View>
        <View style={styles.cardTextContainer}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>{item.nombre}</Text>
            <Text style={[styles.cardSubtitle, { color: colors.tertiary }]}>
                Creada el {new Date(item.created_at).toLocaleDateString('es-ES')}
            </Text>
        </View>
        <Ionicons name="chevron-forward" size={22} color={colors.gray200} />
      </Pressable>
    </Animated.View>
  );

  const renderEmptyState = () => {
    if (loading) return <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }}/>;
    
    if (error) return (
      <View style={styles.emptyContainer}>
          <Ionicons name="cloud-offline-outline" size={60} color={colors.error} />
          <Text style={[styles.emptyText, { color: colors.error }]}>Ocurrió un error</Text>
          <Text style={[styles.emptySubText, { color: colors.tertiary }]}>{error}</Text>
          <Button title="Reintentar" onPress={load} style={{ marginTop: spacing.md, backgroundColor: colors.primary }} />
      </View>
    );

    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="file-tray-outline" size={60} color={colors.gray200} />
        <Text style={[styles.emptyText, { color: colors.gray400 }]}>Aún no tienes listas guardadas</Text>
        <Button title="Crear tu primera lista" onPress={() => router.replace("/new-list")} style={{ marginTop: spacing.md, backgroundColor: colors.primary }}/>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={["top", "bottom"]}>
      <View style={[styles.header, { backgroundColor: colors.white, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.push("/purchases")} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>Todas mis Listas</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={data}
        keyExtractor={(it) => String(it.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={renderEmptyState}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      />
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  safeArea: { 
    flex: 1,
  },
  header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
  },
  backButton: {
      padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
  },
  listContainer: { 
    padding: 16,
    paddingBottom: 48,
  },
  emptyContainer: {
    marginTop: 80,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubText: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 5,
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cardTextContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  cardSubtitle: {
    fontSize: 12,
    marginTop: 4,
  },
});