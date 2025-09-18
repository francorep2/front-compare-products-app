// app/(main)/list/[id].tsx
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useHeaderHeight } from "@react-navigation/elements";
import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
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

// 🚀 NUEVO: cámara para escanear
import { CameraView, useCameraPermissions } from "expo-camera";

import {
  addItem as apiAddItem,
  deleteItem as apiDeleteItem,
  deleteList as apiDeleteList,
  renameList as apiRenameList,
  updateItem as apiUpdateItem,
  getListDetail,
  getScrapeSources,
  searchAll, // se usa con { q } o con { barcode }
  sourcesToEnabled,
} from "../../../api/endpoints";
import type { ScrapeSources, SearchHit, SearchRawResponse, ShoppingItemOut } from "../../../api/types";
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
    v = v.replace(/\./g, "").replace(",", ".");
  } else if (v.includes(",") && !v.includes(".")) {
    v = v.replace(",", ".");
  }
  v = v.replace(/[^0-9.]/g, "");
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

function flattenSearch(raw: SearchRawResponse): SearchHit[] {
  const buckets: Record<string, any> = (raw as any)?.results ?? (raw as any) ?? {};
  const out: SearchHit[] = [];

  for (const [store, arr] of Object.entries(buckets)) {
    if (!Array.isArray(arr)) continue;
    for (const it of arr) {
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

// 👉 helper para limpiar EAN/UPC
const onlyDigits = (s: string | undefined | null) => (s || "").replace(/\D/g, "");

export default function ListDetailScreen() {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const headerH = useHeaderHeight();

  const [listName, setListName] = useState<string>("Lista");
  const [editingName, setEditingName] = useState(false);
  const [createdAt, setCreatedAt] = useState<string | undefined>(undefined);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sheet state
  const [sheetVisible, setSheetVisible] = useState(false);
  const [sheetLoading, setSheetLoading] = useState(false);
  const [sheetErr, setSheetErr] = useState<string | null>(null);
  const [hits, setHits] = useState<SearchHit[]>([]);

  // Animations
  const sheetY = React.useRef(new Animated.Value(1)).current; // 1 => hidden, 0 => shown
  const backdrop = React.useRef(new Animated.Value(0)).current;

  // Assets por tienda
  const COMPANY_ICONS: Record<string, any> = {
    coto: require("../../../../assets/company/coto.png"),
    dia: require("../../../../assets/company/dia.png"),
    carrefour: require("../../../../assets/company/carrefour.png"),
    jumbo: require("../../../../assets/company/jumbo.png"),
  };
  const normalizeKey = (s: string) => s.toLowerCase().replace(/\s+|_/g, "");
  const iconForStore = (store: string) => COMPANY_ICONS[normalizeKey(store)] ?? null;

  // 👉 estados para agregar nuevo ítem
  const [newNombre, setNewNombre] = useState("");
  const [newCantidad, setNewCantidad] = useState("");
  const [adding, setAdding] = useState(false);

  const listId = Number(id);

  // ---- Selección de supermercados (desde /search/config) ----
  const [sources, setSources] = useState<ScrapeSources | null>(null);
  const [loadingSources, setLoadingSources] = useState(true);

  const loadSources = useCallback(async () => {
    setLoadingSources(true);
    try {
      const cfg = await getScrapeSources(); // { carrefour, coto, jumbo, dia }
      setSources(cfg);
    } catch {
      setSources({ carrefour: true, coto: true, jumbo: true, dia: true });
    } finally {
      setLoadingSources(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!cancelled) await loadSources();
    })();
    return () => {
      cancelled = true;
    };
  }, [loadSources]);

  useFocusEffect(
    useCallback(() => {
      // refrescar selección al volver de config
      loadSources();
    }, [loadSources])
  );

  const enabled = useMemo(() => {
    if (!sources) return [];
    return sourcesToEnabled(sources);
  }, [sources]);

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

  // --------- Lógica de mejores precios por NOMBRE (ya existente) ----------
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
      if (loadingSources || !sources) {
        await loadSources();
      }
      const enabledNow = sourcesToEnabled(sources || { carrefour: true, coto: true, jumbo: true, dia: true });

      const data = await searchAll({ q, limit: 2, enabled: enabledNow });
      const ordered = flattenSearch(data as SearchRawResponse).slice(0, 10);
      setHits(ordered);
    } catch (e: any) {
      setSheetErr(e?.data?.detail || e?.message || "No se pudieron obtener precios.");
    } finally {
      setSheetLoading(false);
    }
  };

  // --------- 🚀 NUEVO: mejores precios por BARCODE ----------
  const loadBestPricesByBarcodeAndOpen = async (barcode: string) => {
    const ean = onlyDigits(barcode);
    if (!ean) return;

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
      if (loadingSources || !sources) {
        await loadSources();
      }
      const enabledNow = sourcesToEnabled(sources || { carrefour: true, coto: true, jumbo: true, dia: true });

      // 👇 mismo endpoint, pero con { barcode }
      const data = await searchAll({ barcode: ean, limit: 2, enabled: enabledNow });
      const ordered = flattenSearch(data as SearchRawResponse).slice(0, 10);
      setHits(ordered);
    } catch (e: any) {
      setSheetErr(e?.data?.detail || e?.message || "No se pudieron obtener precios.");
    } finally {
      setSheetLoading(false);
    }
  };

  const hideSheet = React.useCallback(() => {
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

  // ------------------ 🚀 NUEVO: Escáner por fila ------------------
  const [scannerVisible, setScannerVisible] = useState(false);
  const [scanningRowIdx, setScanningRowIdx] = useState<number | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [hasScanned, setHasScanned] = useState(false); // evita doble trigger

  const startScanForRow = async (idx: number) => {
    setScanningRowIdx(idx);
    if (!permission?.granted) {
      const { granted } = await requestPermission();
      if (!granted) {
        Alert.alert("Permiso requerido", "Necesitamos acceso a la cámara para escanear el código.");
        return;
      }
    }
    setHasScanned(false);
    setScannerVisible(true);
  };

  const onBarcodeDetected = async ({ data }: { data: string; raw?: any; type?: string }) => {
    if (hasScanned) return;
    const ean = onlyDigits(data);
    if (!ean) return;

    setHasScanned(true);
    setScannerVisible(false);

    // 🔎 buscar por barcode y abrir sheet con resultados
    await loadBestPricesByBarcodeAndOpen(ean);

    // (opcional) si querés, autocompletar el nombre de la fila con el primer hit
    // try {
    //   if (hits.length > 0 && scanningRowIdx != null) {
    //     const first = hits[0];
    //     setRow(scanningRowIdx, { _nombre: first.name ?? rows[scanningRowIdx].nombre });
    //   }
    // } catch {}
    setScanningRowIdx(null);
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
      const maybeCreated = (await apiAddItem(listId, { nombre, cantidad })) as any;
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

      {/* Carrito (por nombre) */}
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

      {/* 📷 Escáner por fila (por barcode) */}
      <Pressable onPress={() => startScanForRow(index)} hitSlop={10} disabled={item._deleting}>
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

      {/* Bottom Sheet: mejores precios */}
      <Modal visible={sheetVisible} transparent animationType="none" onRequestClose={hideSheet}>
        {/* Backdrop */}
        <Animated.View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.25)",
            opacity: backdrop,
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
            transform: [{ translateY }],
          }}
        >
          <View
            style={{
              backgroundColor: "#fff",
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              padding: 16,
              height: SHEET_HEIGHT,
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
                data={hits}
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

                    <View style={{ flex: 1 }}>
                      <Text numberOfLines={1} style={{ fontWeight: "700", color: colors.secondary, fontSize: 14 }}>
                        {h.name}
                      </Text>
                      <Text style={{ color: colors.gray600, marginTop: 2, fontSize: 14 }}>
                        {h.store.toLocaleUpperCase()}
                      </Text>
                      {!!h.barcode && (
                        <Text style={{ color: colors.gray600, marginTop: 2, fontSize: 12 }}>
                          EAN: {h.barcode}
                        </Text>
                      )}
                    </View>

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

      {/* 📱 Modal del ESCÁNER */}
      <Modal
        visible={scannerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setScannerVisible(false);
          setScanningRowIdx(null);
        }}
      >
        <View style={{ flex: 1, backgroundColor: "black" }}>
          {/* Cámara en pantalla completa */}
          {permission?.granted ? (
            <CameraView
              style={{ flex: 1 }}
              facing="back"
              onBarcodeScanned={(ev: any) => {
                // ev: { data, type, cornerPoints, ... }
                onBarcodeDetected({ data: ev?.data, type: ev?.type });
              }}
              barcodeScannerSettings={{
                barcodeTypes: [
                  "ean13",
                  "ean8",
                  "upc_a",
                  "upc_e",
                  "code128",
                  "itf14",
                  "code39",
                  "codabar",
                ],
              }}
            />
          ) : (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
              <ActivityIndicator color="#fff" />
              <Text style={{ color: "#fff", marginTop: 8 }}>Solicitando permiso de cámara…</Text>
            </View>
          )}

          {/* Overlay y controles */}
          <View
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: 0,
              paddingTop: insets.top + 12,
              paddingHorizontal: 12,
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Pressable
              onPress={() => {
                setScannerVisible(false);
                setScanningRowIdx(null);
              }}
              style={{
                backgroundColor: "rgba(0,0,0,0.5)",
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 999,
              }}
            >
              <Ionicons name="close" size={22} color="#fff" />
            </Pressable>

            <View style={{ backgroundColor: "rgba(0,0,0,0.5)", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 }}>
              <Text style={{ color: "#fff", fontWeight: "700" }}>Apuntá al código de barras</Text>
            </View>
          </View>

          {/* Marco guía simple */}
          <View
            style={{
              position: "absolute",
              left: 24,
              right: 24,
              top: "35%",
              height: 180,
              borderWidth: 2,
              borderColor: "rgba(255,255,255,0.9)",
              borderRadius: 12,
            }}
          />
        </View>
      </Modal>
    </SafeAreaView>
  );
}
