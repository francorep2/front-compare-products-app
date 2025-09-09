// app/(main)/list/[id].tsx
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useHeaderHeight } from "@react-navigation/elements";
import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Easing,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import {
  addItem as apiAddItem,
  deleteItem as apiDeleteItem,
  deleteList as apiDeleteList,
  renameList as apiRenameList,
  updateItem as apiUpdateItem,
  getListDetail,
  searchAll,
} from "../../../api/endpoints";
import type { SearchHit, SearchRawResponse, ShoppingItemOut } from "../../../api/types";
import { Text } from "../../../components/ui/Text";
import { useTheme } from "../../../providers/theme";

// altura del sheet: media pantalla
const SHEET_HEIGHT = Math.round(Dimensions.get("window").height * 0.5);

type Row = ShoppingItemOut & {
  _checked: boolean;
  _nombre: string;
  _cantidad: string;
  _saving?: boolean;
  _deleting?: boolean;
};

function parsePrice(raw?: string): number {
  if (!raw) return 0;
  let v = raw.replace(/[^\d.,]/g, "");
  if (v.includes(",") && v.includes(".")) {
    // Ej: "1.234,56" -> "1234.56"
    v = v.replace(/\./g, "").replace(",", ".");
  } else if (v.includes(",") && !v.includes(".")) {
    // Ej: "123,45" -> "123.45"
    v = v.replace(",", ".");
  }
  v = v.replace(/[^0-9.]/g, "");
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}
function flattenSearch(raw: SearchRawResponse): SearchHit[] {
  const out: SearchHit[] = [];
  for (const [store, arr] of Object.entries(raw || {})) {
    for (const it of arr || []) {
      out.push({
        store,
        name: it.title,
        price: parsePrice(it.price),
        url: it.url,
        image_url: it.image_url,
        barcode: it.barcode,
      });
    }
  }
  out.sort((a, b) => a.price - b.price);
  return out;
}

export default function ListDetailScreen() {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const headerH = useHeaderHeight();

  const [listName, setListName] = React.useState<string>("Lista");
  const [editingName, setEditingName] = React.useState(false);
  const [createdAt, setCreatedAt] = React.useState<string | undefined>(undefined);
  const [rows, setRows] = React.useState<Row[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Sheet state
  const [sheetVisible, setSheetVisible] = React.useState(false);
  const [sheetLoading, setSheetLoading] = React.useState(false);
  const [sheetErr, setSheetErr] = React.useState<string | null>(null);
  const [hits, setHits] = React.useState<SearchHit[]>([]);

  // Animations
  const sheetY = React.useRef(new Animated.Value(1)).current; // 1 => hidden, 0 => shown
  const backdrop = React.useRef(new Animated.Value(0)).current;

  // assets por tienda
  const COMPANY_ICONS: Record<string, any> = {
    coto: require("../../../../assets/company/coto.png"),
    dia: require("../../../../assets/company/dia.png"),
    carrefour: require("../../../../assets/company/carrefour.png"),
    jumbo: require("../../../../assets/company/jumbo.png"),
  };
  const normalizeKey = (s: string) => s.toLowerCase().replace(/\s+|_/g, "");
  const iconForStore = (store: string) => COMPANY_ICONS[normalizeKey(store)] ?? null;

  // 👉 estados para agregar nuevo ítem
  const [newNombre, setNewNombre] = React.useState("");
  const [newCantidad, setNewCantidad] = React.useState("");
  const [adding, setAdding] = React.useState(false);

  const listId = Number(id);

  const load = async () => {
    if (!listId) return;
    try {
      setError(null);
      const detail = await getListDetail(listId);
      setListName(detail.nombre);
      setCreatedAt(detail.created_at);
      setRows(
        detail.items.map((i) => ({
          ...i,
          _checked: i.done,
          _nombre: i.nombre,
          _cantidad: i.cantidad,
        }))
      );
    } catch (e: any) {
      setError(e?.data?.detail || e?.message || "No se pudo cargar la lista.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      setLoading(true);
      load();
    }, [listId])
  );

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  // cargar mejores precios (máximo 10) y abrir sheet
  const loadBestPricesAndOpen = async (query: string) => {
    const q = query.trim();
    if (!q) return;

    setSheetErr(null);
    setHits([]);
    setSheetLoading(true);
    setSheetVisible(true);

    // animate in
    Animated.parallel([
      Animated.timing(sheetY, {
        toValue: 0,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(backdrop, {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    try {
      const data = await searchAll(q, 10);
      const ordered = flattenSearch(data).slice(0, 10);
      setHits(ordered);
    } catch (e: any) {
      setSheetErr(e?.data?.detail || e?.message || "No se pudieron obtener precios.");
    } finally {
      setSheetLoading(false);
    }
  };

  const hideSheet = React.useCallback(() => {
    // animate out
    Animated.parallel([
      Animated.timing(sheetY, {
        toValue: 1,
        duration: 220,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(backdrop, {
        toValue: 0,
        duration: 180,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        setSheetVisible(false);
        setHits([]);
        setSheetErr(null);
        setSheetLoading(false);
      }
    });
  }, [backdrop, sheetY]);

  const onCartPress = (query: string) => {
    loadBestPricesAndOpen(query);
  };

  const confirmDeleteList = () => {
    Alert.alert("Eliminar lista", "¿Querés borrar esta lista y todos sus productos?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          try {
            await apiDeleteList(listId);
            router.back();
          } catch (e: any) {
            Alert.alert("Error", e?.data?.detail || e?.message || "No se pudo eliminar la lista.");
          }
        },
      },
    ]);
  };

  const onEndEditListName = async () => {
    setEditingName(false);
    const nombre = listName.trim();
    if (!nombre) {
      Alert.alert("Nombre inválido", "La lista debe tener un nombre.");
      return;
    }
    try {
      const out = await apiRenameList(listId, { nombre });
      setListName(out.nombre);
    } catch (e: any) {
      Alert.alert("Error", e?.data?.detail || e?.message || "No se pudo renombrar la lista.");
    }
  };

  const setRow = (idx: number, patch: Partial<Row>) =>
    setRows((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...patch };
      return next;
    });

  const toggleChecked = async (idx: number) => {
    const r = rows[idx];
    const next = !r._checked;
    setRow(idx, { _checked: next, done: next, _saving: true });
    try {
      const updated = await apiUpdateItem(r.id, { done: next });
      setRow(idx, { done: updated.done, _checked: updated.done, _saving: false });
    } catch (e: any) {
      setRow(idx, { _checked: !next, done: !next, _saving: false });
      Alert.alert("Error", e?.data?.detail || e?.message || "No se pudo actualizar el estado.");
    }
  };

  const onChangeNombre = (idx: number, v: string) => setRow(idx, { _nombre: v });
  const onChangeCantidad = (idx: number, v: string) => setRow(idx, { _cantidad: v });

  const saveRowIfChanged = async (idx: number) => {
    const r = rows[idx];
    const patch: { nombre?: string; cantidad?: string | null } = {};
    if (r._nombre.trim() !== r.nombre) patch.nombre = r._nombre.trim();
    if (r._cantidad.trim() !== r.cantidad) patch.cantidad = r._cantidad.trim() || "1";
    if (!patch.nombre && !patch.cantidad) return;

    try {
      setRow(idx, { _saving: true });
      const updated = await apiUpdateItem(r.id, patch);
      setRow(idx, {
        nombre: updated.nombre,
        cantidad: updated.cantidad,
        done: updated.done,
        _nombre: updated.nombre,
        _cantidad: updated.cantidad,
        _checked: updated.done,
        _saving: false,
      });
    } catch (e: any) {
      setRow(idx, { _saving: false });
      Alert.alert("Error", e?.data?.detail || e?.message || "No se pudo guardar el producto.");
    }
  };

  const confirmDeleteRow = (idx: number) => {
    const r = rows[idx];
    Alert.alert("Eliminar producto", `¿Querés borrar "${r.nombre}"?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          try {
            setRow(idx, { _deleting: true });
            await apiDeleteItem(r.id);
            setRows((prev) => prev.filter((x) => x.id !== r.id));
          } catch (e: any) {
            setRow(idx, { _deleting: false });
            Alert.alert("Error", e?.data?.detail || e?.message || "No se pudo eliminar el producto.");
          }
        },
      },
    ]);
  };

  // agregar ítem a la lista existente
  const addNewItem = async () => {
    if (adding) return;
    const nombre = newNombre.trim();
    const cantidad = (newCantidad || "1").trim();
    if (!nombre) {
      Alert.alert("Falta producto", "Ingresá el nombre del producto.");
      return;
    }
    try {
      setAdding(true);
      const maybeCreated = await apiAddItem(listId, { nombre, cantidad }) as any;
      if (maybeCreated && typeof maybeCreated === "object") {
        const created = maybeCreated as ShoppingItemOut;
        setRows((prev) => [
          { ...created, _checked: created.done, _nombre: created.nombre, _cantidad: created.cantidad },
          ...prev,
        ]);
      } else {
        await load();
      }
      setNewNombre("");
      setNewCantidad("");
    } catch (e: any) {
      Alert.alert("Error", e?.data?.detail || e?.message || "No se pudo agregar el producto.");
    } finally {
      setAdding(false);
    }
  };

  const renderItem = ({ item, index }: { item: Row; index: number }) => (
    <View
      style={{
        paddingVertical: 8,
        paddingHorizontal: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: "#E9EEF5",
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
      }}
    >
      {/* Checklist */}
      <Pressable onPress={() => toggleChecked(index)} hitSlop={10}>
        <Ionicons
          name={item._checked ? "checkbox-outline" : "square-outline"}
          size={22}
          color={item._checked ? colors.primary : colors.gray500}
        />
      </Pressable>

      {/* Nombre */}
      <View style={{ flex: 1, opacity: item._deleting ? 0.5 : 1 }}>
        <TextInput
          value={item._nombre}
          onChangeText={(t) => onChangeNombre(index, t)}
          onEndEditing={() => saveRowIfChanged(index)}
          placeholder="Producto"
          style={{
            paddingVertical: 6,
            paddingHorizontal: 10,
            backgroundColor: "#FAFBFC",
            borderWidth: 1,
            borderColor: "#E9EEF5",
            borderRadius: 10,
          }}
        />
      </View>

      {/* Cantidad */}
      <View style={{ width: 90, opacity: item._deleting ? 0.5 : 1 }}>
        <TextInput
          value={item._cantidad}
          onChangeText={(t) => onChangeCantidad(index, t)}
          onEndEditing={() => saveRowIfChanged(index)}
          placeholder="Cant."
          keyboardType="numeric"
          style={{
            paddingVertical: 6,
            textAlign: "center",
            backgroundColor: "#FAFBFC",
            borderWidth: 1,
            borderColor: "#E9EEF5",
            borderRadius: 10,
          }}
        />
      </View>

      {/* Guardando… */}
      {item._saving ? <ActivityIndicator /> : null}

      {/* Carrito */}
      <Pressable
        onPress={() => onCartPress(item._nombre || item.nombre)}
        hitSlop={10}
        disabled={item._deleting}
        style={{ paddingHorizontal: 6, paddingVertical: 4 }}
      >
        <Ionicons name="cart-outline" size={20} color={item._deleting ? colors.gray400 : colors.secondary} />
      </Pressable>

      {/* Eliminar */}
      <Pressable onPress={() => confirmDeleteRow(index)} hitSlop={10} disabled={item._deleting}>
        <Ionicons name="trash-outline" size={20} color={item._deleting ? colors.gray400 : (colors.tertiary ?? "#ef4444")} />
      </Pressable>

      <Pressable onPress={() =>(index)} hitSlop={10} disabled={item._deleting}>
        <MaterialCommunityIcons name="barcode-scan" size={22} color={colors.tertiary} />
      </Pressable>

    </View>

  


  );

  // Animated transforms
  const translateY = sheetY.interpolate({
    inputRange: [0, 1],
    outputRange: [0, SHEET_HEIGHT + 40],
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.white }} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.select({ ios: "padding", android: "height" })}
        keyboardVerticalOffset={Platform.select({ ios: headerH, android: headerH })}
      >
        {loading ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator />
          </View>
        ) : error ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.md }}>
            <Text style={{ color: colors.error, textAlign: "center" }}>{error}</Text>
          </View>
        ) : (
          <FlatList
            data={rows}
            keyExtractor={(it) => String(it.id)}
            renderItem={renderItem}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
            ListHeaderComponent={
              <View style={{ backgroundColor: "#fff" }}>
                {/* Header de la lista */}
                <View
                  style={{
                    paddingHorizontal: spacing.md,
                    paddingTop: spacing.md,
                    paddingBottom: spacing.sm,
                    borderBottomWidth: 1,
                    borderBottomColor: "#E9EEF5",
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 8 }}>
                      {editingName ? (
                        <TextInput
                          value={listName}
                          onChangeText={setListName}
                          onEndEditing={onEndEditListName}
                          autoFocus
                          style={{ fontSize: 20, fontWeight: "800", color: colors.secondary, paddingVertical: 2 }}
                        />
                      ) : (
                        <Text style={{ fontSize: 20, fontWeight: "800", color: colors.secondary }}>{listName}</Text>
                      )}
                      <Pressable onPress={() => setEditingName((s) => !s)} hitSlop={10}>
                        <Ionicons name="create-outline" size={18} color={colors.secondary} />
                      </Pressable>
                    </View>

                    <Pressable onPress={confirmDeleteList} hitSlop={10}>
                      <Ionicons name="trash-outline" size={20} color={colors.tertiary ?? "#ef4444"} />
                    </Pressable>
                  </View>


                  {!!createdAt && (
                    <Text style={{ color: colors.gray600, marginTop: 4, fontSize: 12 }}>
                      Creada: {createdAt}
                    </Text>
                  )}
                </View>

                {/* Barra para AGREGAR ítems */}
                <View
                  style={{
                    paddingHorizontal: spacing.md,
                    paddingTop: spacing.sm,
                    paddingBottom: spacing.sm,
                    backgroundColor: "#fff",
                    borderBottomWidth: 1,
                    borderBottomColor: "#E9EEF5",
                  }}
                >
                  <View
                    style={{
                      backgroundColor: "#fff",
                      borderWidth: 1,
                      borderColor: "#E9EEF5",
                      borderRadius: 12,
                      padding: 8,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <TextInput
                      value={newNombre}
                      onChangeText={setNewNombre}
                      placeholder="Producto"
                      returnKeyType="done"
                      onSubmitEditing={() => {
                        if (newNombre.trim()) addNewItem();
                      }}
                      style={{
                        flex: 1,
                        paddingVertical: 8,
                        paddingHorizontal: 10,
                        backgroundColor: "#FAFBFC",
                        borderWidth: 1,
                        borderColor: "#E9EEF5",
                        borderRadius: 10,
                      }}
                    />
                    <TextInput
                      value={newCantidad}
                      onChangeText={setNewCantidad}
                      placeholder="Cant."
                      keyboardType="numeric"
                      style={{
                        width: 80,
                        paddingVertical: 8,
                        textAlign: "center",
                        backgroundColor: "#FAFBFC",
                        borderWidth: 1,
                        borderColor: "#E9EEF5",
                        borderRadius: 10,
                      }}
                    />
                    <Pressable
                      onPress={addNewItem}
                      disabled={!newNombre.trim() || adding}
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 999,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: colors.primary,
                        opacity: !newNombre.trim() || adding ? 0.5 : 1,
                      }}
                    >
                      {adding ? <ActivityIndicator color="#fff" /> : <Ionicons name="add" size={22} color="#fff" />}
                    </Pressable>
                  </View>
                </View>
              </View>
            }
            stickyHeaderIndices={[0]}
          />
        )}
      </KeyboardAvoidingView>

      {/* Bottom Sheet: mejores precios (10 resultados, media pantalla, scroll interno, imagen de producto y link) */}
<Modal visible={sheetVisible} transparent animationType="none" onRequestClose={hideSheet}>
  {/* Backdrop */}
  <Animated.View
    style={{
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.25)",
      opacity: backdrop, // fade in/out
    }}
  >
    <Pressable style={{ flex: 1 }} onPress={hideSheet} />
  </Animated.View>

  {/* Sheet */}
  <Animated.View
    style={{
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      transform: [{ translateY }], // slide up/down
    }}
  >
    <View
      style={{
        backgroundColor: "#fff",
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        padding: 16,
        height: SHEET_HEIGHT, // media pantalla
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 8,
        gap: 10,
      }}
    >
      {/* header */}
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Text style={{ flex: 1, fontSize: 16, fontWeight: "800", color: colors.tertiary }}>
          Mejores resultados
        </Text>
        <Pressable onPress={hideSheet} hitSlop={8}>
          <Ionicons name="close" size={20} color={colors.gray600} />
        </Pressable>
      </View>

      {/* resultados */}
      {sheetLoading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator />
        </View>
      ) : sheetErr ? (
        <Text style={{ color: colors.error }}>{sheetErr}</Text>
      ) : hits.length === 0 ? (
        <Text style={{ color: colors.gray600 }}>Sin resultados.</Text>
      ) : (
        <FlatList
          data={hits} // hasta 10
          keyExtractor={(h, i) => `${h.store}-${h.url}-${i}`}
          contentContainerStyle={{ paddingBottom: 4, gap: 10 }}
          showsVerticalScrollIndicator
          renderItem={({ item: h }) => (
            <Pressable
              onPress={() => Linking.openURL(h.url)}
              style={{
                backgroundColor: "#FAFBFC",
                borderWidth: 1,
                borderColor: "#E9EEF5",
                borderRadius: 12,
                padding: 10,
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
              }}
            >
              {/* imagen del producto (no más logo de súper) */}
              {h.image_url ? (
                <Image
                  source={{ uri: h.image_url }}
                  style={{ width: 64, height: 64, borderRadius: 8, resizeMode: "contain" }}
                />
              ) : (
                <View
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 8,
                    backgroundColor: "#EFEFF2",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="image-outline" size={24} color={colors.gray500} />
                </View>
              )}

              {/* info */}
              <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={{ fontWeight: "700", color: colors.secondary, fontSize: 14 }}>
                  {h.name}
                </Text>
                <Text style={{ color: colors.gray600, marginTop: 2 , fontSize : 14}}>{h.store.toLocaleUpperCase()}</Text>
                {!!h.barcode && (
                  <Text style={{ color: colors.gray600, marginTop: 2, fontSize: 12 }}>
                    EAN: {h.barcode}
                  </Text>
                )}
              </View>

              {/* precio */}
              <Text style={{ fontSize: 18, fontWeight: "900", color: colors.primary }}>
                ${Number(h.price ?? 0).toLocaleString("es-AR")}
              </Text>
            </Pressable>
          )}
        />
      )}
    </View>
  </Animated.View>
</Modal>
    </SafeAreaView>
  );
}
