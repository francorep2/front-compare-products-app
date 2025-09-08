// app/(main)/list/[id].tsx
import { Ionicons } from "@expo/vector-icons";
import { useHeaderHeight } from "@react-navigation/elements";
import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  TextInput,
  View
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import {
  addItem as apiAddItem,
  deleteItem as apiDeleteItem,
  deleteList as apiDeleteList,
  renameList as apiRenameList,
  updateItem as apiUpdateItem,
  getListDetail,
  searchAll
} from "../../../api/endpoints";
import type { SearchHit, SearchRawResponse, ShoppingItemOut } from "../../../api/types";
import { Text } from "../../../components/ui/Text";
import { useTheme } from "../../../providers/theme";

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
    v = v.replace(/\./g, "").replace(",", ".");
  } else if (v.includes(",") && !v.includes(".")) {
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
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [sheetLoading, setSheetLoading] = React.useState(false);
  const [sheetErr, setSheetErr] = React.useState<string | null>(null);
  const [hits, setHits] = React.useState<SearchHit[]>([]);
  const [listName, setListName] = React.useState<string>("Lista");
  const [editingName, setEditingName] = React.useState(false);
  const [createdAt, setCreatedAt] = React.useState<string | undefined>(undefined);
  const headerH = useHeaderHeight();
  const [rows, setRows] = React.useState<Row[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const qtyRef = React.useRef<TextInput>(null);

  const COMPANY_ICONS: Record<string, any> = {
  coto: require("../../../../assets/company/coto.png"),
  dia: require("../../../../assets/company/dia.png"),
  carrefour: require("../../../../assets/company/carrefour.png"),
  jumbo: require("../../../../assets/company/jumbo.png"),
};

  const normalizeKey = (s: string) =>
  s.toLowerCase().replace(/\s+|_/g, "");

const iconForStore = (store: string) => COMPANY_ICONS[normalizeKey(store)] ?? null;

  // 👉 Estados para AGREGAR NUEVO ÍTEM
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

  const onCartPress = async (query: string) => {
      const q = query.trim();
      if (!q) return;
      setSheetOpen(true);
      setSheetLoading(true);
      setSheetErr(null);
      setHits([]);
      try {
        const data = await searchAll(q, 1);              
        const ordered = flattenSearch(data);              
        setHits(ordered);                                
      } catch (e: any) {
        setSheetErr(e?.data?.detail || e?.message || "No se pudieron obtener precios.");
      } finally {
        setSheetLoading(false);
      }
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

  // 👉 Agregar ítem a la lista existente
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
      const created = await apiAddItem(listId, { nombre, cantidad });
      // Lo agregamos al final (o al inicio si preferís)
      setRows((prev) => [{
        ...created,
          _checked: created.done,
          _nombre: created.nombre,
          _cantidad: created.cantidad,
        },...prev]);
     
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
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.white }} edges={["top", "bottom"]}>
  <KeyboardAvoidingView
    style={{ flex: 1 }}
    behavior={Platform.select({ ios: "padding", android: "height" })}
    // compensa la altura del header para que el teclado no tape inputs
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
        contentContainerStyle={{
          paddingBottom: insets.bottom + 24, // margen inferior para que no choque con la navbar
        }}
        // 👇 Header STICKY que queda arriba: Título + acciones + barra de agregar
        ListHeaderComponent={
          <View style={{ backgroundColor: "#fff" }}>
            {/* Header de la lista (nombre + editar + borrar) */}
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
                <Text style={{ color: colors.gray600, marginTop: 4, fontSize: 12 }}>Creada: {createdAt}</Text>
              )}
            </View>

            {/* 🔝 Barra para AGREGAR ítems (arriba, fija) */}
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
                  {adding ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Ionicons name="add" size={22} color="#fff" />
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        }
        // hace que el header quede pegado arriba mientras scrolleás
        stickyHeaderIndices={[0]}
      />
    )}
  </KeyboardAvoidingView>

    {/* Bottom Sheet: mejores precios */}
      <Modal
        visible={sheetOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setSheetOpen(false)}
      >
        {/* overlay para cerrar tocando afuera */}
        <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.25)" }} onPress={() => setSheetOpen(false)} />

        {/* sheet */}
        <View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "#fff",
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            padding: 16,
            maxHeight: "70%",
            shadowColor: "#000",
            shadowOpacity: 0.1,
            shadowRadius: 10,
            elevation: 8,
          }}
        >
          {/* header del sheet */}
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
            <Text style={{ flex: 1, fontSize: 16, fontWeight: "800", color: colors.success}}>
              Mejor precio
            </Text>
            <Pressable onPress={() => setSheetOpen(false)} hitSlop={8}>
              <Ionicons name="close" size={20} color={colors.gray600} />
            </Pressable>
          </View>

          {sheetLoading ? (
            <View style={{ paddingVertical: 20, alignItems: "center" }}>
              <ActivityIndicator />
            </View>
          ) : sheetErr ? (
            <Text style={{ color: colors.error }}>{sheetErr}</Text>
          ) : hits.length === 0 ? (
            <Text style={{ color: colors.gray600 }}>Sin resultados.</Text>
          ) : (
            <View style={{ gap: 10 }}>
              {hits.map((h, i) => {
                const icon = iconForStore(h.store);
                return (
                  <View
                    key={`${h.store}-${i}`}
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
                    {/* logo del súper */}
                    {icon ? (
                      <Image source={icon} style={{ width: 48, height: 28, resizeMode: "contain" }}/>
                    ) : (
                      <View
                        style={{
                          width: 48,
                          height: 28,
                          borderRadius: 6,
                          backgroundColor: "#EFEFF2",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Ionicons name="storefront-outline" size={18} color={colors.gray500} />
                      </View>
                    )}

                    {/* info */}
                    <View style={{ flex: 1 }}>
                      <Text numberOfLines={1} style={{ fontWeight: "700", color: colors.secondary }}>
                        {h.name}
                      </Text>
                      <Text style={{ color: colors.gray600, marginTop: 2 }}>{h.store}</Text>
                     /*<Text style={{ color: colors.gray600, marginTop: 2 }} {h.barcode}></Text>*/
                    </View>

                    {/* precio */}
                    <Text style={{ fontSize: 18, fontWeight: "900", color: colors.primary }}>
                      ${Number(h.price ?? 0).toLocaleString("es-AR")}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </Modal>
</SafeAreaView>
  );
}
