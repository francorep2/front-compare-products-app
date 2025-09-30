import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
  Animated as RNAnimated,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import {
  addItem as apiAddItem,
  deleteItem as apiDeleteItem,
  deleteList as apiDeleteList,
  renameList as apiRenameList,
  updateItem as apiUpdateItem,
  getListDetail,
  getScrapeSources,
  renameList,
  searchAll,
  sourcesToEnabled,
  startComparison
} from "../../../api/endpoints";
import type {
  ScrapeSources,
  SearchHit,
  SearchRawResponse,
  ShoppingItemOut,
} from "../../../api/types";
import { useTheme } from "../../../providers/theme";
import { colors } from "../../../theme/colors";

// ================= Helpers =================
const SHEET_HEIGHT = Math.round(Dimensions.get("window").height * 0.55);

const API_BASE = "https://api-compare-products-app.onrender.com"
const RENAME_PATH = (id: number) => `/shopping/${id}`;

type Row = ShoppingItemOut & {
  _checked: boolean;
  _nombre: string;
  _cantidad: string;
  _saving?: boolean;
  _deleting?: boolean;
};

const COMPANY_ICONS: Record<string, any> = {
  coto: require("../../../../assets/company/coto.png"),
  dia: require("../../../../assets/company/dia.png"),
  carrefour: require("../../../../assets/company/carrefour.png"),
  jumbo: require("../../../../assets/company/jumbo.png"),
};
const normalizeKey = (s: string) => s.toLowerCase().replace(/\s+|_/g, "");
const iconForStore = (store: string) => COMPANY_ICONS[normalizeKey(store)] ?? null;

const parsePrice = (raw?: string): number => {
  if (!raw) return 0;
  let v = raw.replace(/[^\d.,]/g, "");
  if (v.includes(",") && v.includes(".")) v = v.replace(/\./g, "").replace(",", ".");
  else if (v.includes(",")) v = v.replace(",", ".");
  const n = parseFloat(v.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

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

const onlyDigits = (s?: string | null) => (s || "").replace(/\D/g, "");
function ymdFromAny(input: unknown): string | null {
  if (input == null) return null;
  const s = String(input).trim();
  const mIso = s.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (mIso) return `${mIso[1]}-${mIso[2]}-${mIso[3]}`;
  const mLatam = s.match(/\b(\d{2})\/(\d{2})\/(\d{4})\b/);
  if (mLatam) return `${mLatam[3]}-${mLatam[2]}-${mLatam[1]}`;
  if (/^\d{10,13}$/.test(s)) { // epoch
    const ms = s.length === 13 ? Number(s) : Number(s) * 1000;
    const d = new Date(ms);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(d.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${dd}`;
  }
  return null;
}

function formatEsArYMD(ymd: string | null | undefined): string {
  if (!ymd) return "";
  const m = String(ymd).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return String(ymd);
  const y = Number(m[1]), mo = Number(m[2]), d = Number(m[3]);
  const meses = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
  return `${d} de ${meses[mo - 1]} de ${y}`;
}



// ================= Screen =================
export default function ListDetailScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight(); 
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const listId = Number(id);
  const listDate = getListDetail(listId).then(l => l.created_at);

  // Theme fallbacks
  const BG = colors?.background || "#F5F5F5";
  const CARD = colors?.card || "#FFFFFF";
  const SURFACE = colors?.surface || "#FFFFFF";
  const BORDER = colors?.border || "#E5E5E5";
  const TEXT = colors?.text || "#111";
  const TEXT_SECONDARY = (colors as any)?.textSecondary || "#4B5563";
  const PRIMARY = colors?.primary || "#FD1648";
  const SECONDARY = colors?.secondary || "#FF1058";
  const TERTIARY = colors?.tertiary || "#4A5899";
  const ERROR = colors?.error || "#FF1010";
  const WHITE = "#FFFFFF";
  const GRAY100 = (colors as any)?.gray100 || "#F3F4F6";
  const GRAY200 = (colors as any)?.gray200 || "#E5E7EB";
  const GRAY400 = (colors as any)?.gray400 || "#9CA3AF";

  // State: lista
  const [listName, setListName] = useState("");
  const [listNameOrig, setListNameOrig] = useState("");
  const [createdAt, setCreatedAt] = useState<string | undefined>(undefined);
  const [fechaCampo, setFechaCampo] = useState<string | undefined>(undefined); // si la API trae "fecha"
  const [editingName, setEditingName] = useState(false);

  // State: items
  const [rows, setRows] = useState<Row[]>([]);
  const [isStartingComparison, setIsStartingComparison] = useState(false);
  const [editingRowId, setEditingRowId] = useState<number | string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // State: añadir producto
  const [newNombre, setNewNombre] = useState("");
  const [newCantidad, setNewCantidad] = useState("");
  const [adding, setAdding] = useState(false);
  const qtyRef = useRef<TextInput>(null);

  // State: scrapers
  const [sources, setSources] = useState<ScrapeSources | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [sheetLoading, setSheetLoading] = useState(false);
  const [sheetErr, setSheetErr] = useState<string | null>(null);
  const [hits, setHits] = useState<SearchHit[]>([]);
  const sheetY = useRef(new RNAnimated.Value(SHEET_HEIGHT)).current;
  const backdrop = useRef(new RNAnimated.Value(0)).current;

  // State: scanner
  const [scannerVisible, setScannerVisible] = useState(false);
  const [scanningRowIdx, setScanningRowIdx] = useState<number | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [hasScanned, setHasScanned] = useState(false);

  const onRename = async (nombre: string) => {
  const out = await apiRenameList(listId, { nombre });
  setListName(out.nombre);
  setListName(out.nombre);
  
};

  // ========= Data loading =========
  const loadSources = useCallback(async () => {
    try {
      const cfg = await getScrapeSources();
      setSources(cfg);
    } catch {
      setSources({ carrefour: true, coto: true, jumbo: true, dia: true });
    }
  }, []);
  useEffect(() => {
    loadSources();
  }, [loadSources]);

  const handleStartComparison = async () => {
    if (rows.length === 0) return Alert.alert("Lista vacía", "Agrega productos antes de comparar.");
    setIsStartingComparison(true);
    try {
        const itemsToCompare = rows.map(item => ({ nombre: item._nombre, cantidad: parseInt(item._cantidad) || 1 }));
        const { task_id } = await startComparison({
            items: itemsToCompare,
            enabled: enabled, 
        });

        router.push({
            pathname: "list/task/[taskId]",
            params: { taskId: task_id}
        });

    } catch (e: any) {
        Alert.alert("Error", e.message || "No se pudo iniciar la comparación.");
    } finally {
        setIsStartingComparison(false);
    }
  };


  const load = useCallback(async () => {
    if (!listId) return;
    try {
      const detail = await getListDetail(listId);
      setListName(detail.nombre);
      setListNameOrig(detail.nombre);            
      setCreatedAt(detail.created_at);
      setFechaCampo((detail as any)?.fecha);
      setRows(
        detail.items.map((i) => ({
          ...i,
          _checked: i.done,
          _nombre: i.nombre,
          _cantidad: i.cantidad,
        }))
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [listId]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load])
  );
  const onRefresh = () => {
    setRefreshing(true);
    load();
  };
   const enabled = useMemo(() => sourcesToEnabled(sources || {}), [sources]);


  const setRow = (idx: number, patch: Partial<Row>) =>
    setRows((prev) => {
      const next = [...prev];
      if (next[idx]) next[idx] = { ...next[idx], ...patch };
      return next;
    });

  // ========= Bottom sheet (scrapers) =========
  const showSheet = () => {
    setSheetVisible(true);
    RNAnimated.parallel([
      RNAnimated.timing(sheetY, {
        toValue: 0,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: Platform.OS !== "web",
      }),
      RNAnimated.timing(backdrop, {
        toValue: 1,
        duration: 180,
        useNativeDriver: Platform.OS !== "web",
      }),
    ]).start();
  };

  const hideSheet = () => {
    RNAnimated.parallel([
      RNAnimated.timing(sheetY, {
        toValue: SHEET_HEIGHT,
        duration: 220,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: Platform.OS !== "web",
      }),
      RNAnimated.timing(backdrop, {
        toValue: 0,
        duration: 180,
        useNativeDriver: Platform.OS !== "web",
      }),
    ]).start(({ finished }) => {
      if (finished) {
        setSheetVisible(false);
        setHits([]);
        setSheetErr(null);
        setSheetLoading(false);
      }
    });
  };

  // ========= Actions =========
  const saveRowIfChanged = async (idx: number) => {
    const r = rows[idx];
    const patch: { nombre?: string; cantidad?: string | null } = {};
    if (r._nombre.trim() !== r.nombre) patch.nombre = r._nombre.trim();
    if (r._cantidad.trim() !== r.cantidad) patch.cantidad = r._cantidad.trim() || "1";
    if (!Object.keys(patch).length) {
      setEditingRowId(null);
      return;
    }
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
      Alert.alert("Error", e?.message || "No se pudo guardar el producto.");
    } finally {
      setEditingRowId(null);
    }
  };

  const confirmDeleteRow = (idx: number) => {
    const r = rows[idx];
    Alert.alert("Eliminar producto", `¿Quieres borrar "${r.nombre}"?`, [
      { text: "Cancelar" },
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
            Alert.alert("Error", e?.message || "No se pudo eliminar el producto.");
          }
        },
      },
    ]);
  };

  const onCartPress = async (query: string) => {
    const q = query.trim();
    if (!q) return;
    setSheetErr(null);
    setHits([]);
    setSheetLoading(true);
    showSheet();
    try {
      if (!sources) {
        try {
          const cfg = await getScrapeSources();
          setSources(cfg);
        } catch {}
      }
      const enabledNow = sourcesToEnabled(sources || {});
      const data = await searchAll({ q, limit: 2, enabled: enabledNow });
      setHits(flattenSearch(data as SearchRawResponse).slice(0, 10));
    } catch (e: any) {
      setSheetErr(e?.message || "No se pudieron obtener precios.");
    } finally {
      setSheetLoading(false);
    }
  };

  const startScanForRow = async (idx: number) => {
    setScanningRowIdx(idx);
    if (!permission?.granted) {
      const { granted } = await requestPermission();
      if (!granted) return Alert.alert("Permiso requerido", "Necesitamos acceso a la cámara.");
    }
    setHasScanned(false);
    setScannerVisible(true);
  };

  const onBarcodeDetected = async ({ data }: { data: string }) => {
    if (hasScanned) return;
    const ean = onlyDigits(data);
    if (!ean) return;
    setHasScanned(true);
    setScannerVisible(false);
    try {
      // Si querés abrir el sheet por código:
      // const dataRes = await searchAllBarcode(ean, 3, enabled);
      // setHits(flattenSearch(dataRes as SearchRawResponse).slice(0, 10));
      // showSheet();
      if (scanningRowIdx != null) {
        setRow(scanningRowIdx, { _nombre: rows[scanningRowIdx]._nombre });
      }
    } finally {
      setTimeout(() => setHasScanned(false), 400);
      setScanningRowIdx(null);
    }
  };
  const onEndEditListName = async () => {
    setEditingName(false); // Sale del modo de edición
    const nombre = listName.trim();
    
    if (!nombre) {
      Alert.alert("Nombre inválido", "La lista debe tener un nombre.");
      return;
    }

    try {
      const updatedList = await renameList(listId, { nombre });
      setListName(updatedList.nombre);

    } catch (e: any) {
      Alert.alert("Error", e?.message || "No se pudo renombrar la lista.");
    }
};

  const addNewItem = async () => {
    if (adding) return;
    const nombre = newNombre.trim();
    if (!nombre) return;
    try {
      setAdding(true);
      const created = (await apiAddItem(listId, {
        nombre,
        cantidad: newCantidad.trim() || "1",
      })) as ShoppingItemOut;
      setRows((prev) => [
        {
          ...created,
          _checked: created.done,
          _nombre: created.nombre,
          _cantidad: created.cantidad,
        },
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

  // ========= Render =========
  const ymdHeader = fechaCampo ?? (createdAt ? ymdFromAny(createdAt) : null);
  const friendlyHeader = formatEsArYMD(ymdHeader);

  const renderItem = ({ item, index }: { item: Row; index: number }) => {
    const isEditing = editingRowId === item.id;
    return (
      <Animated.View entering={FadeInUp.duration(300).delay(index * 40)}>
        <View
          style={[
            styles.itemCard,
            { backgroundColor: CARD, borderColor: BORDER, opacity: item._deleting ? 0.5 : 1 },
          ]}
        >
          {!isEditing ? (
            <Pressable style={styles.itemMain} onPress={() => setEditingRowId(item.id)}>
              <Text style={[styles.rowName, { color: TEXT }]} numberOfLines={1}>
                {item._nombre}
              </Text>
              <Text style={[styles.rowQty, { color: TEXT_SECONDARY }]}>
                Cantidad: {item._cantidad || "1"}
              </Text>
            </Pressable>
          ) : (
            <View style={styles.editCompactRow}>
              <TextInput
                value={item._nombre}
                onChangeText={(t) => setRow(index, { _nombre: t })}
                style={[styles.inlineNameInput, { borderColor: BORDER, color: TEXT }]}
                placeholder="Nombre"
                placeholderTextColor={GRAY400}
                cursorColor={PRIMARY}
                selectionColor={PRIMARY}
                underlineColorAndroid="transparent"
                returnKeyType="next"
              />
              <TextInput
                value={item._cantidad}
                onChangeText={(t) => setRow(index, { _cantidad: t })}
                style={[styles.inlineQtyInput, { borderColor: BORDER, color: TEXT }]}
                placeholder="Cant."
                placeholderTextColor={GRAY400}
                keyboardType="numeric"
                cursorColor={PRIMARY}
                selectionColor={PRIMARY}
                underlineColorAndroid="transparent"
                returnKeyType="done"
                onSubmitEditing={() => saveRowIfChanged(index)}
                maxLength={4}
              />
              {item._saving ? (
                <ActivityIndicator size="small" style={{ marginLeft: 6 }} />
              ) : (
                <>
                  <Pressable
                    onPress={() => saveRowIfChanged(index)}
                    style={[styles.inlineIconBtn, { backgroundColor: TERTIARY }]}
                    hitSlop={6}
                  >
                    <Ionicons name="checkmark" size={16} color={WHITE} />
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      setEditingRowId(null);
                      setRow(index, { _nombre: item.nombre, _cantidad: item.cantidad });
                    }}
                    style={[styles.inlineIconBtn, { backgroundColor: GRAY200 }]}
                    hitSlop={6}
                  >
                    <Ionicons name="close" size={16} color={"#333"} />
                  </Pressable>
                </>
              )}
            </View>
          )}

          <View style={styles.itemActions}>
            <Pressable onPress={() => onCartPress(item._nombre)} style={styles.actionIcon} disabled={item._deleting}>
              <Ionicons name="cart-outline" size={22} color={SECONDARY} />
            </Pressable>
            <Pressable onPress={() => startScanForRow(index)} style={styles.actionIcon} disabled={item._deleting}>
              <MaterialCommunityIcons name="barcode-scan" size={22} color={TERTIARY} />
            </Pressable>
            <Pressable onPress={() => confirmDeleteRow(index)} style={styles.actionIcon} disabled={item._deleting}>
              <Ionicons name="trash-outline" size={22} color={ERROR} />
            </Pressable>
          </View>
        </View>
      </Animated.View>
    );
  };

  const bottomPad = insets.bottom + tabBarHeight + 16; // 👈 nada queda bajo la bottom bar
  

  return (
    <View style={[styles.root, { backgroundColor: BG }]}>
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        {/* Header rectangular primario */}
        <View style={[styles.headerPrimary, { backgroundColor: PRIMARY, paddingTop: insets.top + 12 }]}>
          <Pressable onPress={() => router.replace("/purchases")} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color={WHITE} />
          </Pressable>

          <View style={styles.headerTitleArea}>
              <Pressable
              onPress={handleStartComparison}
              disabled={isStartingComparison || rows.length < 1}
              style={[styles.compareButton, { backgroundColor: colors.white }]}
              >
              {isStartingComparison ? (
              <ActivityIndicator color={colors.primary} />
                ) : (
                <>
                <Ionicons name="analytics-outline" size={20} color={colors.primary} />
                <Text style={styles.compareButtonText}>Comparar Lista Completa</Text>
                </>
                )}
              </Pressable>
            {!editingName ? (
              <>
                <View style={styles.titleRow}>
                  <Text style={styles.titleText} numberOfLines={1}>{listName}</Text>
                  <Pressable onPress={() => setEditingName(true)} style={styles.pencilBtn} hitSlop={8}>
                    <Ionicons name="create-outline" size={20} color={`${WHITE}CC`} />
                  </Pressable>
                </View>
                {!!friendlyHeader && <Text style={styles.dateText}>{friendlyHeader}</Text>}
              </>
            ) : (
              <View style={styles.titleEditRow}>
                <TextInput
                    value={listName}
                    onChangeText={setListName}
                    style={styles.titleInput}
                    autoFocus
                    onBlur={onEndEditListName}
                    cursorColor={WHITE}
                    selectionColor={WHITE}
                    underlineColorAndroid="transparent"
                    placeholderTextColor={`${WHITE}CC`}
                  />
              </View>
            )}
          </View>

          <Pressable
            onPress={() => {
              Alert.alert("Eliminar lista", `¿Quieres borrar "${listName}"?`, [
                { text: "Cancelar" },
                {
                  text: "Eliminar",
                  style: "destructive",
                  onPress: async () => {
                    await apiDeleteList(listId);
                    router.replace("/purchases");
                  },
                },
              ]);
            }}
            style={styles.deleteListButton}
          >
            <Ionicons name="trash-outline" size={24} color={`${WHITE}CC`} />
          </Pressable>
        </View>

        {/* Añadir producto fijo */}
        <View style={[styles.inputBarFixed, { backgroundColor: CARD, borderColor: BORDER }]}>
          <TextInput
            placeholder="Añadir producto..."
            value={newNombre}
            onChangeText={setNewNombre}
            onSubmitEditing={() => qtyRef.current?.focus()}
            returnKeyType="next"
            style={[styles.textInputFixed, { flex: 1, backgroundColor: SURFACE, borderColor: BORDER, color: TEXT }]}
            placeholderTextColor={GRAY400}
            cursorColor={PRIMARY}
            selectionColor={PRIMARY}
            underlineColorAndroid="transparent"
          />
          <TextInput
            ref={qtyRef}
            placeholder="Cant."
            value={newCantidad}
            onChangeText={setNewCantidad}
            keyboardType="numeric"
            onSubmitEditing={addNewItem}
            returnKeyType="done"
            style={[styles.textInputFixed, { width: 90, backgroundColor: SURFACE, borderColor: BORDER, color: TEXT }]}
            placeholderTextColor={GRAY400}
            cursorColor={PRIMARY}
            selectionColor={PRIMARY}
            underlineColorAndroid="transparent"
          />
          <Pressable onPress={addNewItem} disabled={!newNombre.trim() || adding}
            style={[styles.submitButtonFixed, { backgroundColor: newNombre.trim() && !adding ? PRIMARY : GRAY100 }]}>
            {adding ? <ActivityIndicator color={WHITE} /> : <Ionicons name="add" size={28} color={WHITE} />}
          </Pressable>
        </View>

        {/* Lista */}
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <FlatList
            data={rows}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={[styles.listContainerFixed, { paddingBottom: bottomPad }]} // 👈 scroll safe
            renderItem={renderItem}
            ListEmptyComponent={() => (
              <View style={styles.emptyContainer}>
                <Ionicons name="file-tray-stacked-outline" size={60} color={GRAY200} />
                <Text style={[styles.emptyText, { color: TEXT_SECONDARY }]}>Agrega productos para empezar.</Text>
              </View>
            )}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            keyboardShouldPersistTaps="handled"
          />
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Bottom Sheet Scrapers */}
      <Modal visible={sheetVisible} transparent animationType="none" onRequestClose={hideSheet}>
        <Pressable style={StyleSheet.absoluteFill} onPress={hideSheet}>
          <RNAnimated.View style={[styles.backdrop, { opacity: backdrop }]} />
        </Pressable>
        <RNAnimated.View style={[styles.sheet, { backgroundColor: CARD, transform: [{ translateY: sheetY }] }]}>
          <View style={[styles.sheetHeader, { borderBottomColor: BORDER }]}>
            <Text style={[styles.sheetTitle, { color: TERTIARY }]}>Mejores resultados</Text>
            <Pressable onPress={hideSheet}><Ionicons name="close" size={24} color={GRAY400} /></Pressable>
          </View>
          {sheetLoading ? (
            <ActivityIndicator style={{ flex: 1 }} />
          ) : sheetErr ? (
            <Text style={[styles.errorText, { color: ERROR }]}>{sheetErr}</Text>
          ) : (
            <FlatList
              data={hits}
              keyExtractor={(h, i) => `${h.store}-${h.url}-${i}`}
              renderItem={({ item: h }) => (
                <Pressable onPress={() => Linking.openURL(h.url!)} style={[styles.hitCard, { borderColor: BORDER }]}>
                  <Image src={h.image_url} style={styles.hitImage} />
                  <View style={styles.hitTextContainer}>
                    <Text numberOfLines={1} style={styles.hitName}>{h.name}</Text>
                    <Text style={styles.hitStore}>{String(h.store || "").toUpperCase()}</Text>
                  </View>
                  <Text style={styles.hitPrice}>
                    {typeof h.price === "number" ? `$${h.price.toLocaleString("es-AR")}` : ""}
                  </Text>
                </Pressable>
              )}
              ListEmptyComponent={() => (
                <Text style={{ textAlign: "center", padding: 20, color: GRAY400 }}>Sin resultados.</Text>
              )}
              contentContainerStyle={{ paddingBottom: insets.bottom + 24 }} // 👈 modal también safe
            />
          )}
        </RNAnimated.View>
      </Modal>

      {/* Scanner simple */}
      <Modal visible={scannerVisible} transparent animationType="fade" onRequestClose={() => setScannerVisible(false)}>
        <View style={styles.scannerOverlayFull}>
          {permission?.granted ? (
            <CameraView style={StyleSheet.absoluteFill} onBarcodeScanned={onBarcodeDetected} />
          ) : (
            <Text style={{ color: WHITE }}>Pidiendo permiso...</Text>
          )}
          <View style={[styles.scannerBarTop, { paddingTop: insets.top }]}>
            <Pressable onPress={() => setScannerVisible(false)} style={styles.scannerCloseButton}>
              <Ionicons name="close" size={28} color={WHITE} />
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ================= Styles =================
const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1 },

  // Header primario
  headerPrimary: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  backButton: { marginRight: 8, padding: 8 },
  headerTitleArea: { flex: 1 },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  titleText: { fontSize: 22, fontWeight: "bold", color: "white", textAlign: "center", flexShrink: 1 },
  pencilBtn: { padding: 4 },
  dateText: { color: colors.white, opacity: 0.9, fontSize: 14, textAlign: "center", marginTop: 2 },
  titleEditRow: { flex: 1, alignItems: "center", justifyContent: "center" },
  titleInput: {
    fontSize: 22,
    fontWeight: "bold",
    color: "white",
    textAlign: "center",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
    borderRadius: 6,
    minWidth: 200,
  },
  deleteListButton: { marginLeft: 8, padding: 8 },
   compareButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 14,
      borderRadius: 16,
      marginBottom: 16,
      gap: 8,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 5,
    },
    compareButtonText: {
      color: colors.primary,
      fontSize: 16,
      fontWeight: 'bold',
    },

  // Añadir producto fijo
  inputBarFixed: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    margin: 16,
    borderRadius: 16,
    gap: 8,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 5,
  },
  textInputFixed: {
    height: 48,
    fontSize: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  submitButtonFixed: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  // Lista
  listContainerFixed: { paddingHorizontal: 16, paddingBottom: 24 },

  emptyContainer: { paddingTop: "20%", alignItems: "center" },
  emptyText: { marginTop: 16, fontSize: 16, fontWeight: "600", opacity: 0.7 },

  // Ítem
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    gap: 12,
  },
  itemMain: { flex: 1 },
  rowName: { fontSize: 16, fontWeight: "600" },
  rowQty: { fontSize: 14, marginTop: 2 },

  itemActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  actionIcon: { padding: 6 },

  // Edición inline compacta
  editCompactRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 24,
  },
  inlineNameInput: {
    flex: 1,
    fontSize: 16,
    paddingHorizontal: 0,
    paddingVertical: 2,
    borderBottomWidth: 1,
  },
  inlineQtyInput: {
    width: 64,
    height: 32,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderRadius: 8,
    textAlign: "center",
    fontSize: 14,
  },
  inlineIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },

  // Bottom sheet
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: SHEET_HEIGHT,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    elevation: 20,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  sheetHeader: { flexDirection: "row", alignItems: "center", padding: 16, borderBottomWidth: 1 },
  sheetTitle: { flex: 1, fontSize: 18, fontWeight: "bold" },
  hitCard: { flexDirection: "row", alignItems: "center", padding: 10, gap: 12, borderBottomWidth: 1 },
  hitImage: { width: 48, height: 48, borderRadius: 8, resizeMode: "contain", backgroundColor: "#fff" },
  hitTextContainer: { flex: 1 },
  hitName: { fontWeight: "600" , color: colors.tertiary},
  hitStore: { fontSize: 12, opacity: 0.7 , fontStyle: 'italic', color: colors.gray600},
  hitPrice: { fontSize: 16, fontWeight: "bold" , color: colors.secondary},
  errorText: { padding: 16, textAlign: "center" },

  // Scanner
  scannerOverlayFull: { ...StyleSheet.absoluteFillObject, backgroundColor: "black" },
  scannerBarTop: { width: "100%", alignItems: "flex-start" },
  scannerCloseButton: {
    margin: 16,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 20,
    padding: 4,
  },
});


