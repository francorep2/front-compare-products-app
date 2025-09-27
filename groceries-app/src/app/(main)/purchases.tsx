import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React from "react";
import { ActivityIndicator, Alert, Dimensions, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Defs, Path, Stop, LinearGradient as SvgGradient } from "react-native-svg";

import { deleteList, getMyLists } from "../../api/endpoints";
import type { ShoppingListOut } from "../../api/types";
import { useTheme } from "../../providers/theme";

const WaveBackground = () => {
  const { colors } = useTheme();
  const { width } = Dimensions.get('window');
  const height = 180;

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height }}>
      <Svg height="100%" width="100%" viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          <SvgGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={colors.primary} stopOpacity="1" />
            <Stop offset="100%" stopColor={colors.secondary} stopOpacity="1" />
          </SvgGradient>
        </Defs>
        <Path fill="url(#grad)" d={`M0,0 L0,${height * 0.6} Q${width / 2},${height} ${width},${height * 0.6} L${width},0 Z`} />
      </Svg>
    </View>
  );
};


export default function PurchasesMenu() {
  const { colors, spacing } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [lists, setLists] = React.useState<ShoppingListOut[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [deletingId, setDeletingId] = React.useState<number | null>(null);

  const load = React.useCallback(async () => {
    try {
      const data = await getMyLists();
      const ordered = [...data].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setLists(ordered.slice(0, 5)); // Mostramos solo las últimas 5
    } catch (e) {
        Alert.alert("Error", "No se pudieron cargar tus listas.");
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
            setLists(prev => prev.filter(l => l.id !== id));
          } catch (e: any) {
            Alert.alert("Error", e?.message || "No se pudo eliminar la lista.");
          } finally {
            setDeletingId(null);
          }
        },
      },
    ]);
  };

  const ListCard = ({ item }: { item: ShoppingListOut }) => (
    <Animated.View entering={FadeInUp.duration(500)}>
        <Pressable 
            style={[styles.card, { backgroundColor: colors.white, borderColor: colors.border }]}
            onPress={() => router.push({ pathname: "/list/[id]", params: { id: String(item.id) } })}
        >
            <View style={[styles.cardIcon, { backgroundColor: colors.white }]}>
                <Ionicons name="list-outline" size={24} color={colors.primary} />
            </View>
            <View style={styles.cardTextContainer}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>{item.nombre}</Text>
                <Text style={[styles.cardSubtitle, { color: colors.tertiary }]}>
                    Creada el {new Date(item.created_at).toLocaleDateString('es-ES')}
                </Text>
            </View>
            <Pressable onPress={() => onDelete(item.id, item.nombre)} style={styles.deleteButton} hitSlop={10}>
                {deletingId === item.id ? 
                    <ActivityIndicator size="small" /> :
                    <Ionicons name="trash-outline" size={22} color={colors.error} />
                }
            </Pressable>
        </Pressable>
    </Animated.View>
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <WaveBackground />
      <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
        <FlatList
          data={lists}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={[styles.listContainer, { paddingBottom: insets.bottom + 80 }]}
          ListHeaderComponent={
            <Animated.View entering={FadeInUp.duration(600)} style={{ paddingTop: insets.top + 20 }}>
              <Text style={styles.title}>Mis Listas</Text>
              <Text style={styles.subtitle}>Aquí encontrarás tus listas de compras guardadas.</Text>
              
              {/* --- BOTÓN PARA VER TODAS LAS LISTAS --- */}
              <View style={styles.allListsButtonContainer}>
                <Pressable
                  onPress={() => router.push("/purchases/recents")}
                  style={[styles.allListsButton, { backgroundColor: colors.white, shadowColor: colors.text }]}
                >
                  <Ionicons name="albums-outline" size={18} color={colors.tertiary} />
                  <Text style={[styles.allListsButtonText, { color: colors.tertiary }]}>
                    Ver todas las listas
                  </Text>
                  <Ionicons name="chevron-forward" size={18} color={colors.tertiary} />
                </Pressable>
              </View>

              {/* --- SUBTÍTULO "ÚLTIMAS 5" --- */}
              <Text style={[styles.sectionTitle, { color: colors.black }]}>
                Últimas 5 listas creadas
              </Text>

            </Animated.View>
          }
          renderItem={({ item }) => <ListCard item={item} />}
          ListEmptyComponent={
            !loading ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="file-tray-outline" size={60} color={colors.gray200} />
                <Text style={[styles.emptyText, { color: colors.gray600 }]}>Aún no tienes listas</Text>
                <Text style={[styles.emptySubText, { color: colors.gray400 }]}>Crea tu primera lista con el botón (+)</Text>
              </View>
            ) : null
          }
          ListFooterComponent={loading ? <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} /> : null}
        />
        

      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1 },
  listContainer: { 
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: 'white',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginBottom: 24,
    marginTop: 4,
  },
  allListsButtonContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  allListsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 999,
    elevation: 5,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  allListsButtonText: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    paddingHorizontal: 4,
    textTransform: 'uppercase',
    opacity: 0.8,
  },
  emptyContainer: {
    marginTop: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubText: {
    fontSize: 14,
    marginTop: 8,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
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
  deleteButton: {
    padding: 8,
  },
  fab: {
      position: 'absolute',
      width: 60,
      height: 60,
      borderRadius: 30,
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
  },
});