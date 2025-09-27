import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator, Alert, Animated, Dimensions, Easing, FlatList, Image,
  KeyboardAvoidingView, Linking, Modal, Platform, Pressable, RefreshControl,
  StyleSheet, Text, TextInput, View
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { FadeInUp } from "react-native-reanimated";
import {
  addItem as apiAddItem, deleteItem as apiDeleteItem, deleteList as apiDeleteList,
  renameList as apiRenameList, updateItem as apiUpdateItem, getListDetail,
  getScrapeSources, searchAll, searchAllBarcode, sourcesToEnabled
} from "../../../api/endpoints";
import type { ScrapeSources, SearchHit, SearchRawResponse, ShoppingItemOut } from "../../../api/types";
import { useTheme } from "../../../providers/theme";

// --- TIPOS Y HELPERS (DE TU CÓDIGO ORIGINAL) ---
const SHEET_HEIGHT = Math.round(Dimensions.get("window").height * 0.5);
const HEADER_H = 100   // alto del header fijo
const ADD_BAR_H = 24;  // alto de la barra “Añadir producto” fija

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
      if (!it?.title || !it?.url) continue;
      out.push({
        store,
        name: it.title,
        price: parsePrice(it.price),
        url: it.url,
        image_url: it.image_url,
        barcode: it.barcode,
        promotion: it.promotion ?? null,
      } as SearchHit);
    }
  }
  out.sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
  return out;
}

const onlyDigits = (s: string | undefined | null) => (s || "").replace(/\D/g, "");

const COMPANY_ICONS: Record<string, any> = {
  coto: require("../../../../assets/company/coto.png"),
  dia: require("../../../../assets/company/dia.png"),
  carrefour: require("../../../../assets/company/carrefour.png"),
  jumbo: require("../../../../assets/company/jumbo.png"),
};
const normalizeKey = (s: string) => s.toLowerCase().replace(/\s+|_/g, "");
const iconForStore = (store: string) => COMPANY_ICONS[normalizeKey(store)] ?? null;

export default function ListDetailScreen() {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  // --- ESTADOS (DE TU CÓDIGO ORIGINAL) ---
  const [listName, setListName] = useState<string>("Nueva lista");
  const [editingName, setEditingName] = useState(false);
  const [createdAt, setCreatedAt] = useState<string | undefined>(undefined);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [sheetLoading, setSheetLoading] = useState(false);
  const [sheetErr, setSheetErr] = useState<string | null>(null);
  const [hits, setHits] = useState<SearchHit[]>([]);
  const sheetY = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const backdrop = useRef(new Animated.Value(0)).current;
  const [newNombre, setNewNombre] = useState("");
  const [newCantidad, setNewCantidad] = useState("");
  const [adding, setAdding] = useState(false);
  const [sources, setSources] = useState<ScrapeSources | null>(null);
  const [loadingSources, setLoadingSources] = useState(true);
  const [scannerVisible, setScannerVisible] = useState(false);
  const [scanningRowIdx, setScanningRowIdx] = useState<number | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [hasScanned, setHasScanned] = useState(false);

  const listId = Number(id);

  // --- LÓGICA DE DATOS (DE TU CÓDIGO ORIGINAL) ---
  const loadSources = useCallback(async () => {
    setLoadingSources(true);
    try {
      const cfg = await getScrapeSources();
      setSources(cfg);
    } catch {
      setSources({ carrefour: true, coto: true, jumbo: true, dia: true });
    } finally {
      setLoadingSources(false);
    }
  }, []);

  useEffect(() => { loadSources(); }, []);

  const load = useCallback(async () => {
    if (!listId) return;
    try {
      setError(null);
      const detail = await getListDetail(listId);
      setListName(detail.nombre || "Nueva lista");
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
      setError(e?.message || "No se pudo cargar la lista.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [listId]);

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [load]));

  const onRefresh = () => { setRefreshing(true); load(); };

  const enabled = useMemo(() => sourcesToEnabled(sources || {}), [sources]);

  const setRow = (idx: number, patch: Partial<Row>) =>
    setRows((prev) => {
      const next = [...prev];
      if (next[idx]) next[idx] = { ...next[idx], ...patch };
      return next;
    });

  // --- LÓGICA DE ACCIONES (DE TU CÓDIGO ORIGINAL) ---
  const showSheet = () => {
    setSheetVisible(true);
    Animated.parallel([
      Animated.timing(sheetY, { toValue: 0, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(backdrop, { toValue: 1, duration: 180, useNativeDriver: Platform.OS !== 'web' }),
    ]).start();
  };

  const hideSheet = useCallback(() => {
    Animated.parallel([
      Animated.timing(sheetY, { toValue: SHEET_HEIGHT, duration: 220, easing: Easing.in(Easing.cubic), useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(backdrop, { toValue: 0, duration: 180, useNativeDriver: Platform.OS !== 'web' }),
    ]).start(({ finished }) => {
      if (finished) { setSheetVisible(false); setHits([]); setSheetErr(null); setSheetLoading(false); }
    });
  }, [backdrop, sheetY]);

  const onCartPress = async (query: string) => {
    const q = query.trim();
    if (!q) return;
    setSheetErr(null);
    setHits([]);
    setSheetLoading(true);
    showSheet();
    try {
      if (loadingSources || !sources) await loadSources();
      const enabledNow = sourcesToEnabled(sources || {});
      const data = await searchAll({ q, limit: 2, enabled: enabledNow });
      setHits(flattenSearch(data as SearchRawResponse).slice(0, 10));
    } catch (e: any) {
      setSheetErr(e?.message || "No se pudieron obtener precios.");
    } finally {
      setSheetLoading(false);
    }
  };

  const loadBestPricesByBarcodeAndOpen = async (barcode: string) => {
    const ean = onlyDigits(barcode);
    if (!ean) return;
    setSheetErr(null);
    setHits([]);
    setSheetLoading(true);
    showSheet();
    try {
      if (loadingSources || !sources) await loadSources();
      const enabledNow = sourcesToEnabled(sources || {});
      const data = await searchAllBarcode(ean, 3, enabledNow);
      setHits(flattenSearch(data as SearchRawResponse).slice(0, 10));
    } catch (e: any) {
      setSheetErr(e?.message || "No se pudieron obtener precios.");
    } finally {
      setSheetLoading(false);
    }
  };

  const onBarcodeDetected = async ({ data }: { data: string }) => {
    if (hasScanned) return;
    const ean = onlyDigits(data);
    if (!ean) return;
    setHasScanned(true);
    setScannerVisible(false);
    await loadBestPricesByBarcodeAndOpen(ean);
    try {
      if (hits.length > 0 && scanningRowIdx != null) {
        setRow(scanningRowIdx, { _nombre: hits[0].name ?? rows[scanningRowIdx].nombre });
      }
    } catch { }
    setScanningRowIdx(null);
  };

  const startScanForRow = async (idx: number) => {
    setScanningRowIdx(idx);
    if (!permission?.granted) {
      const { granted } = await requestPermission();
      if (!granted) return Alert.alert("Permiso requerido", "Necesitamos acceso a la cámara para escanear el código.");
    }
    setHasScanned(false);
    setScannerVisible(true);
  };

  const confirmDeleteList = () => {
    Alert.alert("Eliminar lista", `¿Quieres borrar "${listName}"?`, [
      { text: "Cancelar" },
      {
        text: "Eliminar", style: "destructive", onPress: async () => {
          try { await apiDeleteList(listId); router.back(); }
          catch (e: any) { Alert.alert("Error", e?.message || "No se pudo eliminar la lista."); }
        }
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
      Alert.alert("Error", e?.message || "No se pudo renombrar la lista.");
    }
  };

  const toggleChecked = async (idx: number) => {
    const r = rows[idx];
    const next = !r._checked;
    setRow(idx, { _checked: next, done: next, _saving: true });
    try {
      const updated = await apiUpdateItem(r.id, { done: next });
      setRow(idx, { done: updated.done, _checked: updated.done, _saving: false });
    } catch (e: any) {
      setRow(idx, { _checked: !next, done: !next, _saving: false });
      Alert.alert("Error", e?.message || "No se pudo actualizar el estado.");
    }
  };

  const onChangeNombre = (idx: number, v: string) => setRow(idx, { _nombre: v });
  const onChangeCantidad = (idx: number, v: string) => setRow(idx, { _cantidad: v });

  const saveRowIfChanged = async (idx: number) => {
    const r = rows[idx];
    const patch: { nombre?: string; cantidad?: string | null } = {};
    if (r._nombre.trim() !== r.nombre) patch.nombre = r._nombre.trim();
    if (r._cantidad.trim() !== r.cantidad) patch.cantidad = r._cantidad.trim() || "1";
    if (Object.keys(patch).length === 0) return;
    try {
      setRow(idx, { _saving: true });
      const updated = await apiUpdateItem(r.id, patch);
      setRow(idx, {
        nombre: updated.nombre, cantidad: updated.cantidad, done: updated.done,
        _nombre: updated.nombre, _cantidad: updated.cantidad, _checked: updated.done,
        _saving: false,
      });
    } catch (e: any) {
      setRow(idx, { _saving: false });
      Alert.alert("Error", e?.message || "No se pudo guardar el producto.");
    }
  };

  const confirmDeleteRow = (idx: number) => {
    const r = rows[idx];
    Alert.alert("Eliminar producto", `¿Quieres borrar "${r.nombre}"?`, [
      { text: "Cancelar" },
      {
        text: "Eliminar", style: "destructive", onPress: async () => {
          try {
            setRow(idx, { _deleting: true });
            await apiDeleteItem(r.id);
            setRows((prev) => prev.filter((x) => x.id !== r.id));
          } catch (e: any) {
            setRow(idx, { _deleting: false });
            Alert.alert("Error", e?.message || "No se pudo eliminar el producto.");
          }
        }
      },
    ]);
  };

  const addNewItem = async () => {
    if (adding) return;
    const nombre = newNombre.trim();
    if (!nombre) {
      Alert.alert("Falta producto", "Ingresa el nombre del producto.");
      return;
    }
    try {
      setAdding(true);
      const created = (await apiAddItem(listId, { nombre, cantidad: newCantidad.trim() || "1" })) as ShoppingItemOut;
      setRows((prev) => [
        { ...created, _checked: created.done, _nombre: created.nombre, _cantidad: created.cantidad },
        ...prev,
      ]);
      setNewNombre("");
      setNewCantidad("");
    } catch (e: any) {
      Alert.alert("Error", e?.message || "No se pudo agregar el producto.");
    } finally {
      setAdding(false);
    }
  };

  const renderItem = ({ item, index }: { item: Row; index: number }) => (
    <Animated.View
      entering={FadeInUp.duration(400).delay(index * 50)}
      style={[styles.itemCard, { backgroundColor: colors.white, borderColor: colors.border, opacity: item._deleting ? 0.5 : 1 }]}
    >
      <Pressable onPress={() => toggleChecked(index)} hitSlop={10} style={{ paddingRight: spacing.sm }}>
        <Ionicons name={item.done ? "checkbox" : "square-outline"} size={24} color={item.done ? colors.gray200 : colors.primary} />
      </Pressable>

      {/* Nombre y Cantidad en la MISMA fila */}
      <View style={styles.itemRow}>
        <TextInput
          value={item._nombre}
          onChangeText={(t) => onChangeNombre(index, t)}
          onEndEditing={() => saveRowIfChanged(index)}
          placeholder="Producto"
          style={[styles.itemProduct, item.done && styles.itemDone, { color: colors.text }]}
        />
        <TextInput
          value={item._cantidad}
          onChangeText={(t) => onChangeCantidad(index, t)}
          onEndEditing={() => saveRowIfChanged(index)}
          placeholder="Cant."
          keyboardType="numeric"
          style={[styles.itemQty, item.done && styles.itemDone, { color: colors.primary }]}
        />
      </View>

      {item._saving ? (
        <ActivityIndicator size="small" style={{ marginHorizontal: 8 }} />
      ) : (
        <View style={styles.itemActions}>
          <Pressable onPress={() => onCartPress(item._nombre || item.nombre)} style={styles.actionIcon} disabled={item._deleting}>
            <Ionicons name="cart-outline" size={24} color={colors.secondary} />
          </Pressable>
          <Pressable onPress={() => startScanForRow(index)} style={styles.actionIcon} disabled={item._deleting}>
            <MaterialCommunityIcons name="barcode-scan" size={24} color={colors.tertiary} />
          </Pressable>
          <Pressable onPress={() => confirmDeleteRow(index)} style={styles.actionIcon} disabled={item._deleting}>
            <Ionicons name="trash-outline" size={22} color={colors.error} />
          </Pressable>
        </View>
      )}
    </Animated.View>
  );

  // paddingTop dinámico para no tapar la lista con los elementos fijos
  const contentTopPad = insets.top + HEADER_H + ADD_BAR_H + 12;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        {/* HEADER FIJO con fondo primario */}
        <View style={[styles.headerContainer, { paddingTop: insets.top, backgroundColor: colors.primary }]}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color={"#FFFFFF"} />
          </Pressable>

          <View style={styles.titleContainer}>
            {editingName ? (
              <TextInput
                value={listName}
                onChangeText={setListName}
                style={styles.titleInput}
                autoFocus
                onBlur={onEndEditListName}
                placeholder="Nueva lista"
                placeholderTextColor={"#FFFFFFCC"}
              />
            ) : (
              <Text style={styles.titleText} numberOfLines={1}>{listName}</Text>
            )}
            <Pressable onPress={() => setEditingName(s => !s)} style={{ paddingLeft: 6 }}>
              <Ionicons name="create-outline" size={22} color={"#FFFFFFCC"} />
            </Pressable>
          </View>

          <Pressable onPress={confirmDeleteList} style={styles.deleteListButton}>
            <Ionicons name="trash-outline" size={24} color={"#FFFFFFCC"} />
          </Pressable>
        </View>

        {/* BARRA “AÑADIR PRODUCTO” FIJA debajo del header */}
        <View style={[styles.addBarFixed, { top: insets.top + HEADER_H }]}>
          <View style={[styles.inputBar, { backgroundColor: colors.white, borderColor: colors.border }]}>
            <TextInput
              placeholder="Añadir producto..."
              value={newNombre}
              onChangeText={setNewNombre}
              onSubmitEditing={addNewItem}
              returnKeyType="done"
              style={[styles.textInput, { flex: 1, backgroundColor: colors.background }]}
              placeholderTextColor={colors.gray400}
            />
            <TextInput
              placeholder="Cant."
              value={newCantidad}
              onChangeText={setNewCantidad}
              keyboardType="numeric"
              style={[styles.textInput, styles.textInputQty]}
              placeholderTextColor={colors.gray400}
            />
            <Pressable
              onPress={addNewItem}
              disabled={!newNombre.trim() || adding}
              style={[styles.submitButton, { backgroundColor: (newNombre.trim() && !adding) ? colors.primary : colors.gray100 }]}
            >
              {adding ? <ActivityIndicator color={"#FFFFFF"} /> : <Ionicons name="add" size={28} color={"#FFFFFF"} />}
            </Pressable>
          </View>
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <FlatList
            data={rows}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={[styles.listContainer, { paddingTop: contentTopPad }]}
            renderItem={renderItem}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="file-tray-stacked-outline" size={60} color={colors.gray200} />
                <Text style={[styles.emptyText, { color: colors.gray400 }]}>Agrega productos para empezar.</Text>
              </View>
            }
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          />
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Sheet de resultados */}
      <Modal visible={sheetVisible} transparent animationType="none" onRequestClose={hideSheet}>
        <Pressable style={StyleSheet.absoluteFill} onPress={hideSheet}>
          <Animated.View style={[styles.backdrop, { opacity: backdrop }]} />
        </Pressable>
        <Animated.View style={[styles.sheet, { backgroundColor: colors.white, transform: [{ translateY: sheetY }] }]}>
          <View style={[styles.sheetHeader, { borderBottomColor: colors.border }]}>
            <Text style={styles.sheetTitle}>Mejores resultados</Text>
            <Pressable onPress={hideSheet}><Ionicons name="close" size={24} color={colors.gray400} /></Pressable>
          </View>
          {sheetLoading ? (
            <ActivityIndicator style={{ flex: 1 }} />
          ) : sheetErr ? (
            <Text style={styles.errorText}>{sheetErr}</Text>
          ) : (
            <FlatList
              data={hits}
              keyExtractor={(h, i) => `${h.store}-${h.url}-${i}`}
              renderItem={({ item: h }) => (
                <Pressable onPress={() => Linking.openURL(h.url!)} style={[styles.hitCard, { borderColor: colors.border }]}>
                  <Image src={h.image_url } style={styles.hitImage} />
                  <View style={styles.hitTextContainer}>
                  <Text numberOfLines={1} style={[styles.hitName, { color: colors.text }]}>
                    {h.name}
                  </Text>
                  <Text style={[styles.hitStore, { color: colors.gray400 }]}>
                    {h.store.toUpperCase()}
                  </Text>
                  </View>
                  <Text style={[styles.hitPrice, { color: colors.primary }]}>
                    ${Number(h.price ?? 0).toLocaleString("es-AR")}
                  </Text>
                </Pressable>
              )}
            />
          )}
        </Animated.View>
      </Modal>

      {/* Scanner */}
      <Modal visible={scannerVisible} transparent animationType="fade" onRequestClose={() => setScannerVisible(false)}>
        <View style={styles.scannerContainer}>
          {permission?.granted ? <CameraView style={StyleSheet.absoluteFill} onBarcodeScanned={onBarcodeDetected} /> : <Text style={{ color: 'white' }}>Pidiendo permiso...</Text>}
          <View style={[styles.scannerOverlay, { paddingTop: insets.top }]}>
            <Pressable onPress={() => setScannerVisible(false)} style={styles.scannerCloseButton}><Ionicons name="close" size={28} color="white" /></Pressable>
            <View style={styles.scannerFocusFrame} />
            <Text style={styles.scannerText}>Apunta al código de barras</Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1 },

  // HEADER FIJO
  headerContainer: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: HEADER_H,
    zIndex: 20,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: { padding: 8 },
  titleContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  titleText: { fontSize: 20, fontWeight: 'bold', color: 'white', textAlign: 'center' },
  titleInput: { fontSize: 20, fontWeight: 'bold', color: 'white', textAlign: 'center', paddingVertical: 6, paddingHorizontal: 10 },
  deleteListButton: { padding: 8 },

  // ADD BAR FIJA
  addBarFixed: {
    position: 'absolute',
    left: 0, right: 0,
    height: ADD_BAR_H,
    zIndex: 19,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },

  // Lista
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },

  // Barra de inputs
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 14,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 5,
    borderWidth: 1,
  },
  textInput: {
    height: 44,
    fontSize: 16,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  textInputQty: {
    width: 56,          // ACHICADO
    textAlign: 'center' // centrado
  },
  submitButton: {
    width: 44, height: 44,
    borderRadius: 10, alignItems: 'center', justifyContent: 'center',
  },

  emptyContainer: { paddingTop: '20%', alignItems: 'center' },
  emptyText: { textAlign: 'center', marginTop: 16, fontSize: 18, fontWeight: '600', opacity: 0.7 },

  // Item
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8, paddingHorizontal: 12,
    borderRadius: 16, borderWidth: 1, marginBottom: 12, gap: 8,
  },

  // FILA (nombre + cantidad MISMO renglón)
  itemRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemProduct: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  itemQty: {
    width: 68,          // ACHICADO
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  itemDone: { textDecorationLine: 'line-through', opacity: 0.6 },
  itemActions: { flexDirection: 'row', alignItems: 'center' },
  actionIcon: { padding: 6 },

  // Sheet
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    height: SHEET_HEIGHT,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    elevation: 20, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10,
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  sheetTitle: { flex: 1, fontSize: 18, fontWeight: 'bold' },
  hitCard: { flexDirection: 'row', alignItems: 'center', padding: 10, gap: 12, borderBottomWidth: 1 },
  hitImage: { width: 48, height: 48, borderRadius: 8, resizeMode: 'contain' },
  hitTextContainer: { flex: 1 },
  hitName: { fontWeight: '600' },
  hitStore: { fontSize: 12, opacity: 0.7 },
  hitPrice: { fontSize: 16, fontWeight: 'bold' },

  // Scanner
  scannerContainer: { flex: 1, backgroundColor: 'black' },
  scannerOverlay: { flex: 1, justifyContent: 'space-between', alignItems: 'center' },
  scannerCloseButton: { alignSelf: 'flex-start', margin: 16, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20, padding: 4 },
  scannerFocusFrame: { width: '80%', height: '30%', borderWidth: 2, borderColor: 'white', borderRadius: 16 },
  scannerText: { color: 'white', backgroundColor: 'rgba(0,0,0,0.5)', padding: 8, borderRadius: 6, marginBottom: 40 },

  errorText: { padding: 16, textAlign: 'center' },
});
