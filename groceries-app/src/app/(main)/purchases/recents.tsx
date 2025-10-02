import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View, Alert } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { getMyLists, deleteList } from "../../../api/endpoints";
import type { ShoppingListOut } from "../../../api/types";
import { Button } from "../../../components/ui/Button";
import { useTheme } from "../../../providers/theme";

// --- HELPERS DE FECHA CORREGIDOS ---
function ymdFromAny(input: unknown): string | null {
  if (input == null) return null;
  const s = String(input).trim();

  // Caso 1: ISO yyyy-mm-dd
  const mIso = s.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (mIso) return `${mIso[1]}-${mIso[2]}-${mIso[3]}`;

  // --- CORRECCIÓN AQUÍ: AÑADIMOS EL CASO dd-mm-yyyy ---
  const mLatamDash = s.match(/\b(\d{2})-(\d{2})-(\d{4})\b/);
  if (mLatamDash) return `${mLatamDash[3]}-${mLatamDash[2]}-${mLatamDash[1]}`;

  // Caso 2: Latam dd/mm/yyyy
  const mLatamSlash = s.match(/\b(\d{2})\/(\d{2})\/(\d{4})\b/);
  if (mLatamSlash) return `${mLatamSlash[3]}-${mLatamSlash[2]}-${mLatamSlash[1]}`;
  
  // Caso 3: epoch
  if (/^\d{10,13}$/.test(s)) {
    const ms = s.length === 13 ? Number(s) : Number(s) * 1000;
    const d = new Date(ms);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(d.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${dd}`;
  }

  return null;
}

function ymdToInt(ymd: string | null): number {
  if (!ymd) return 0;
  return Number(ymd.replace(/-/g, ""));
}

function formatEsArYMD(ymd: string | null): string {
  if (!ymd) return "";
  const m = ymd.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return ymd;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const meses = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
  return `${d} de ${meses[mo - 1]} de ${y}`;
}

export default function RecentListsScreen() {
  const { colors, spacing } = useTheme();
  const router = useRouter();

  const [data, setData] = useState<ShoppingListOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const load = async () => {
    try {
      setError(null);
      const lists = await getMyLists();
      const ordered = [...lists].sort((a, b) => {
        const ya = ymdFromAny(a.created_at);
        const yb = ymdFromAny(b.created_at);
        return ymdToInt(yb) - ymdToInt(ya);
      });
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

<<<<<<< HEAD
  const renderItem = ({ item, index }: { item: ShoppingListOut, index: number }) => (
    <Animated.View entering={FadeInUp.duration(500).delay(index * 50)}>
      <Pressable
        onPress={() => router.push({ pathname: "/list/[id]", params: { id: String(item.id) } })}
        style={[styles.card, { backgroundColor: colors.white, borderColor: colors.border }]}
      >
        <View style={[styles.cardIcon, { backgroundColor: colors.white }]}>
=======
  const onDelete = (id: number, name: string) => {
    Alert.alert("Eliminar lista", `¿Quieres borrar "${name}"?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          setDeletingId(id);
          try {
            await deleteList(id);
            setData(prev => prev.filter(l => l.id !== id));
          } catch (e: any) {
            Alert.alert("Error", e?.message || "No se pudo eliminar la lista.");
          } finally {
            setDeletingId(null);
          }
        },
      },
    ]);
  };

  const renderItem = ({ item, index }: { item: ShoppingListOut, index: number }) => {
    const ymd = ymdFromAny(item.created_at);
    const friendly = formatEsArYMD(ymd);

    return (
      <Animated.View entering={FadeInUp.duration(500).delay(index * 50)}>
        <Pressable
          onPress={() => router.push({ pathname: "/list/[id]", params: { id: String(item.id) } })}
          style={[styles.card, { backgroundColor: colors.white, borderColor: colors.border }]}
        >
          <View style={[styles.cardIcon, { backgroundColor: colors.white }]}>
>>>>>>> 3a26e3ba5824b43aaa1399d8e8743930eaba56fb
            <Ionicons name="list-outline" size={24} color={colors.primary} />
          </View>
          <View style={styles.cardTextContainer}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>{item.nombre}</Text>
            <Text style={[styles.cardSubtitle, { color: colors.tertiary }]}>
              {friendly ? `Creada el ${friendly}` : "Sin fecha"}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {deletingId === item.id ? (
              <ActivityIndicator size="small" color={colors.error} style={{ marginRight: 12 }} />
            ) : (
              <Pressable onPress={() => onDelete(item.id, item.nombre)} hitSlop={8} style={{ padding: 6, marginRight: 8 }}>
                <Ionicons name="trash-outline" size={20} color={colors.error} />
              </Pressable>
            )}
            <Ionicons name="chevron-forward" size={22} color={colors.gray200} />
          </View>
        </Pressable>
      </Animated.View>
    );
  };

  const renderEmptyState = () => {
    if (loading) return <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }}/>;
    
    if (error) return (
      <View style={styles.emptyContainer}>
        <Ionicons name="cloud-offline-outline" size={60} color={colors.error} />
        <Text style={[styles.emptyText, { color: colors.error }]}>Ocurrió un error</Text>
        <Text style={[styles.emptySubText, { color: colors.error }]}>{error}</Text>
        <Button title="Reintentar" onPress={load} style={{ marginTop: spacing.md, backgroundColor: colors.primary }} />
      </View>
    );

    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="file-tray-outline" size={60} color={colors.gray200} />
        <Text style={[styles.emptyText, { color: colors.gray500 }]}>Aún no tienes listas guardadas</Text>
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