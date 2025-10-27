import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react"; // <<< NUEVO: Import React
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
  TouchableOpacity, // <<< NUEVO: Para botones en el modal
  View,
} from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import {
  addItem as apiAddItem,
  deleteItem as apiDeleteItem,
  apiDeleteList,
  updateItem as apiUpdateItem,
  getListDetail,
  getScrapeSources,
  renameList,
  searchAll,
  searchAllBarcode, // Usaremos esta para buscar por barcode también
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

// ... (tus helpers: SHEET_HEIGHT, Row, COMPANY_ICONS, etc. quedan igual) ...
const SHEET_HEIGHT = Math.round(Dimensions.get("window").height * 0.55);

type Row = ShoppingItemOut & {
  _checked: boolean;
  _nombre: string;
  _cantidad: string;
  _saving?: boolean;
  _deleting?: boolean;
  _savingCheck?: boolean; // Ya no lo usaremos para guardar inmediato
  _modified?: boolean; // <<< NUEVO: Indica si la fila cambió
};

const COMPANY_ICONS: Record<string, any> = {
  coto: require("../../../../assets/company/coto.png"),
  dia: require("../../../../assets/company/dia.png"),
  carrefour: require("../../../../assets/company/carrefour.png"),
  jumbo: require("../../../../assets/company/jumbo.png"),
};
const normalizeKey = (s: string) => s.toLowerCase().replace(/\s+|_/g, "");
const iconForStore = (store: string) => COMPANY_ICONS[normalizeKey(store)] ?? null;

const parsePrice = (raw?: string | number): number => { // Acepta number también
  if (raw == null) return 0;
  let v = String(raw).replace(/[^\d.,]/g, "");
  // Priorizar coma como decimal si ambos existen o solo coma existe
  if (v.includes(",")) {
    v = v.replace(/\./g, "").replace(",", ".");
  } else if (v.includes(".") && v.lastIndexOf(".") !== v.indexOf(".")) {
    // Si hay multiples puntos sin comas, asumir que son separadores de miles
    v = v.replace(/\./g, "");
  }
  const n = parseFloat(v.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

function flattenSearch(raw: SearchRawResponse): SearchHit[] {
  const buckets: Record<string, any> = (raw as any)?.results ?? (raw as any) ?? {};
  const out: SearchHit[] = [];
  for (const [store, arr] of Object.entries(buckets)) {
    if (!Array.isArray(arr)) continue;
    for (const it of arr) {
      // Validar datos mínimos
      if (!it?.title || !it?.url) continue;
      out.push({
        store: store,
        name: it.title,
        price: parsePrice(it.price), // Asegurar que price sea number
        url: it.url,
        image_url: it.image_url || null, // Asegurar null si no existe
        barcode: it.barcode || null,
        promotion: it.promotion || null,
      });
    }
  }
  // Ordenar por precio, poniendo los que no tienen precio al final
  out.sort((a, b) => {
      const priceA = a.price ?? Infinity;
      const priceB = b.price ?? Infinity;
      return priceA - priceB;
  });
  return out;
}

const onlyDigits = (s?: string | null) => (s || "").replace(/\D/g, "");

// ... (tus helpers ymdFromAny, formatEsArYMD quedan igual) ...
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
  // Validar mes
  if (mo < 1 || mo > 12) return String(ymd);
  return `${d} de ${meses[mo - 1]} de ${y}`;
}

// ================= Screen =================
export default function ListDetailScreen() {
  const { colors: themeColors } = useTheme(); // Renombrar para evitar conflicto
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const listId = Number(id);

  // Theme fallbacks (usando themeColors)
  const BG = themeColors?.background || "#F5F5F5";
  const CARD = themeColors?.white || "#FFFFFF";
  const SURFACE = themeColors?.white || "#FFFFFF";
  const BORDER = themeColors?.border || "#E5E5E5";
  const TEXT = themeColors?.text || "#111";
  const TEXT_SECONDARY = (themeColors as any)?.textSecondary || "#4B5563";
  const PRIMARY = themeColors?.primary || "#FD1648";
  const SECONDARY = themeColors?.secondary || "#FF1058";
  const TERTIARY = themeColors?.tertiary || "#4A5899";
  const ERROR = themeColors?.error || "#FF1010";
  const WHITE = "#FFFFFF";
  const GRAY100 = (themeColors as any)?.gray100 || "#F3F4F6";
  const GRAY200 = (themeColors as any)?.gray200 || "#E5E7EB";
  const GRAY400 = (themeColors as any)?.gray400 || "#9CA3AF";

  // State: lista
  const [listName, setListName] = useState("");
  const [listNameOrig, setListNameOrig] = useState("");
  const [createdAt, setCreatedAt] = useState<string | undefined>(undefined);
  const [fechaCampo, setFechaCampo] = useState<string | undefined>(undefined);
  const [editingName, setEditingName] = useState(false);
  const [isSavingAll, setIsSavingAll] = useState(false);
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

  // State: scrapers (bottom sheet)
  const [sources, setSources] = useState<ScrapeSources | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [sheetLoading, setSheetLoading] = useState(false);
  const [sheetErr, setSheetErr] = useState<string | null>(null);
  const [hits, setHits] = useState<SearchHit[]>([]);
  const sheetY = useRef(new RNAnimated.Value(SHEET_HEIGHT)).current;
  const backdrop = useRef(new RNAnimated.Value(0)).current;

  // State: scanner
  const [scannerVisible, setScannerVisible] = useState(false);
  const [scanningRowIdx, setScanningRowIdx] = useState<number | null>(null); // Index del item a reemplazar
  const [permission, requestPermission] = useCameraPermissions();
  const [hasScanned, setHasScanned] = useState(false); // Para evitar escaneos múltiples

  // <<< NUEVO: Estados para el modal de resultados del escaneo >>>
  const [scannedResultsModalVisible, setScannedResultsModalVisible] = useState(false);
  const [scannedProductOptions, setScannedProductOptions] = useState<SearchHit[]>([]);
  const [isSearchingBarcode, setIsSearchingBarcode] = useState(false); // Loading para la búsqueda por barcode


 const handleStartComparison = async () => {
    if (rows.length === 0) {
        Alert.alert("Lista vacía", "Agrega productos antes de comparar.");
        return;
    }

    Alert.alert(
        "Comparación en Beta",
        "Esta función está en desarrollo.\n\n• Puede demorar varios segundos.\n• Los precios/productos podrían no ser exactos.\n• Para mejores resultados, sé lo más específico posible con los nombres (ej: 'Coca Cola Sin Azúcar 1.5L').",
        [
            {
                text: "Cancelar",
                style: "cancel",
                onPress: () => {
                    console.log("Comparación cancelada por el usuario.");
                }
            },
            {
                text: "Continuar",
                onPress: async () => {
                    // Ponemos el loading ANTES del try para asegurarnos que se vea
                    setIsStartingComparison(true);
                    let taskIdGenerated: string | null = null; // Variable para guardar el ID

                    try {
                        const itemsToCompare = rows.map(item => ({
                            nombre: item._nombre,
                            cantidad: parseInt(item._cantidad) || 1
                        }));

                        // <<< IMPORTANTE: Asegúrate que 'enabled' esté definido y tenga valor aquí >>>
                        // Si 'enabled' viene de useMemo, podría ser [] inicialmente si 'sources' es null.
                        const enabledStores = enabled;
                        if (!enabledStores || enabledStores.length === 0) {
                            // Si no hay tiendas habilitadas, mostramos error y paramos
                            throw new Error("No hay tiendas habilitadas para comparar.");
                        }

                        console.log(`[Compare] Iniciando tarea con ${itemsToCompare.length} items para tiendas:`, enabledStores);

                        // Llamada a la API
                        const { task_id } = await startComparison({
                            items: itemsToCompare,
                            enabled: enabledStores,
                        });

                        taskIdGenerated = task_id; // Guardamos el ID por si la navegación falla
                        console.log(`[Compare] Tarea iniciada con ID: ${taskIdGenerated}`);

                        // Intento de Navegación
                        console.log(`[Compare] Intentando navegar a list/task/${taskIdGenerated}...`);
                        router.push({
                            pathname: "list/task/[taskId]", // <<< VERIFICA QUE ESTA RUTA SEA CORRECTA EN TU APP >>>
                            params: { taskId: taskIdGenerated }
                        });
                        // Si la navegación es exitosa, el componente se desmonta
                        // y no necesitamos quitar el loading manualmente aquí.

                    } catch (e: any) {
                        // Si ALGO falla (API o navegación implícita)
                        console.error("Error durante la comparación o navegación:", e);
                        Alert.alert("Error", e.message || "No se pudo iniciar la comparación o navegar.");
                        // <<< IMPORTANTE: Quitar el loading SIEMPRE en caso de error >>>
                        setIsStartingComparison(false);
                    }
                    // <<< QUITAMOS EL FINALLY >>>
                    // No ponemos setIsStartingComparison(false) aquí para evitar warnings
                    // si la navegación fue exitosa y el componente se desmontó.
                    // El estado de carga se maneja en el CATCH o desaparece con la navegación.
                }
            }
        ],
        { cancelable: true }
    );
};

  // ========= Data loading =========
  const loadSources = useCallback(async () => {
    try {
      const cfg = await getScrapeSources();
      setSources(cfg);
    } catch {
      setSources({ carrefour: true, coto: true, jumbo: true, dia: true }); // Fallback
    }
  }, []);
  useEffect(() => {
    loadSources();
  }, [loadSources]);

  const load = useCallback(async () => {
    if (!listId || isNaN(listId)) {
        console.error("Invalid listId:", listId);
        setLoading(false);
        setRefreshing(false);
        Alert.alert("Error", "ID de lista inválido.");
        // Podrías redirigir si el ID es inválido
        // router.replace("/purchases");
        return;
    }
    try {
      setLoading(true); // Asegurar que loading sea true al inicio
      const detail = await getListDetail(listId);
      setListName(detail.nombre);
      setListNameOrig(detail.nombre);
      setCreatedAt(detail.created_at);
      setFechaCampo((detail as any)?.fecha); // Mantener por si acaso
      setRows(
        detail.items.map((i) => ({
          ...i,
          _checked: i.done,
          _nombre: i.nombre,
          _cantidad: String(i.cantidad || "1"), // Asegurar que sea string
          _saving: false, // Inicializar estados internos
          _deleting: false,
        }))
      );
    } catch (error: any) {
        console.error("Error loading list details:", error);
        Alert.alert("Error", `No se pudo cargar la lista: ${error.message || 'Error desconocido'}`);
        // Considera si quieres limpiar el estado o redirigir
        setRows([]);
        setListName("Error al cargar");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [listId]);

  useFocusEffect(
    useCallback(() => {
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
        if (idx < 0 || idx >= prev.length) return prev;
        const next = [...prev];
        const originalItem = next[idx]; 

        const updatedItem = { ...originalItem, ...patch };

        const nameChanged = updatedItem._nombre.trim() !== originalItem.nombre;
        const qtyChanged = (updatedItem._cantidad.trim() || "1") !== String(originalItem.cantidad || "1");
        const checkedChanged = updatedItem._checked !== originalItem.done;

        updatedItem._modified = nameChanged || qtyChanged || checkedChanged;

        next[idx] = updatedItem;
        return next;
    });

    const toggleItemDone = (index: number) => {
    if (index < 0 || index >= rows.length) return;
    const item = rows[index];
    if (item._saving || item._deleting) return; // Evitar cambios si se está editando/borrando

    const newCheckedState = !item._checked;

    // <<< MODIFICADO: Solo actualiza el estado local y marca como modificado >>>
    setRow(index, { _checked: newCheckedState });
};

  // ========= Bottom sheet (scrapers) =========
  // ... (tus funciones showSheet y hideSheet quedan igual) ...
  const showSheet = () => {
    setSheetVisible(true);
    RNAnimated.parallel([
      RNAnimated.timing(sheetY, { toValue: 0, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== "web" }),
      RNAnimated.timing(backdrop, { toValue: 1, duration: 180, useNativeDriver: Platform.OS !== "web" }),
    ]).start();
  };

  const hideSheet = useCallback(() => { // <<< Hacerla useCallback
    RNAnimated.parallel([
      RNAnimated.timing(sheetY, { toValue: SHEET_HEIGHT, duration: 220, easing: Easing.in(Easing.cubic), useNativeDriver: Platform.OS !== "web" }),
      RNAnimated.timing(backdrop, { toValue: 0, duration: 180, useNativeDriver: Platform.OS !== "web" }),
    ]).start(({ finished }) => {
      if (finished) {
        setSheetVisible(false);
        setHits([]); // Limpiar resultados al cerrar
        setSheetErr(null);
        setSheetLoading(false); // Resetear loading
      }
    });
  }, [sheetY, backdrop]); // <<< Dependencias

  const saveListChanges = async () => {
    // Encontrar todas las filas marcadas como modificadas
    const modifiedRows = rows.filter(r => r._modified && !r._deleting); // Ignorar las que se están borrando

    if (modifiedRows.length === 0) {
        Alert.alert("Sin cambios", "No hay modificaciones para guardar.");
        return;
    }

    setIsSavingAll(true); // Mostrar indicador de carga general
    console.log(`[SaveAll] Guardando ${modifiedRows.length} items modificados...`);

    const savePromises = modifiedRows.map(async (item, indexInModified) => {
        const originalIndex = rows.findIndex(r => r.id === item.id); // Encontrar índice original

        // Crear el payload solo con los campos necesarios para la API
        const payload: { nombre?: string; cantidad?: string; done?: boolean } = {};
        const nombreTrimmed = item._nombre.trim();
        const cantidadTrimmed = item._cantidad.trim() || "1";

        // Incluir solo si cambió respecto al original guardado
        if (nombreTrimmed !== item.nombre) payload.nombre = nombreTrimmed;
        if (cantidadTrimmed !== String(item.cantidad || "1")) payload.cantidad = cantidadTrimmed;
        if (item._checked !== item.done) payload.done = item._checked;

        // Si por alguna razón no hay cambios detectados en el payload, saltar
        if (Object.keys(payload).length === 0) {
             console.log(`[SaveAll] Item ${item.id} marcado como modificado pero sin payload.`);
             // Resetear flag localmente aunque no se envíe nada
             if (originalIndex !== -1) {
                 setRow(originalIndex, { _modified: false });
             }
             return null; // O un indicador de éxito sin llamada
        }


        try {
            console.log(`[SaveAll] Llamando apiUpdateItem para ${item.id} con payload:`, payload);
            const updatedItem = await apiUpdateItem(item.id, payload);

            // Actualizar la fila original en el estado local con los datos confirmados
            // y quitar el flag _modified
            if (originalIndex !== -1) {
                setRow(originalIndex, {
                    ...updatedItem, // Usar todos los datos de la respuesta
                    _checked: updatedItem.done,
                    _nombre: updatedItem.nombre,
                    _cantidad: String(updatedItem.cantidad || "1"),
                    _modified: false, // <-- Quitar flag
                    _saving: false, // Asegurar que no quede en modo saving
                });
            }
            return updatedItem; // Devolver éxito

        } catch (e: any) {
            console.error(`[SaveAll] Error guardando item ${item.id}:`, e);
            Alert.alert(
            "Error al guardar", // Título
            `No se pudieron guardar ${failedCount} de ${modifiedRows.length} cambios. Revisa tu conexión e intenta de nuevo.`, // Mensaje
            [{ text: "OK" }] // Botón para cerrar
              );
            if (originalIndex !== -1) {
                 // Mantener _modified = true para reintentar? O mostrar error?
                 // setRow(originalIndex, { _saving: false }); // Quitar saving si se usara
            }
            return e; // Devolver el error para saber qué falló
        }
    });

    // Esperar a que todas las llamadas terminen
    const results = await Promise.all(savePromises);

    setIsSavingAll(false); // Ocultar indicador de carga general

    // Contar cuántas fallaron
    const failedCount = results.filter(r => r instanceof Error).length;

    if (failedCount > 0) {
        Alert.alert("Error al guardar", `No se pudieron guardar ${failedCount} de ${modifiedRows.length} cambios. Intenta de nuevo.`);
        
    } else {
        // Opcional: Mostrar un mensaje de éxito breve
        console.log("[SaveAll] Todos los cambios guardados exitosamente.");
        Alert.alert(
            "¡Listo!", // Título
            "Los cambios en la lista se guardaron correctamente.", // Mensaje
            [{ text: "OK" }] // Botón para cerrar
        );
    }
};

  // ========= Actions =========
  // ... (tus funciones saveRowIfChanged, confirmDeleteRow, onCartPress quedan igual) ...
  const saveRowIfChanged = async (idx: number) => {
    if (idx < 0 || idx >= rows.length) return; // Validar índice
    const r = rows[idx];
    const nombreTrimmed = r._nombre.trim();
    const cantidadTrimmed = r._cantidad.trim() || "1"; // Default a "1" si está vacío

    // Validar nombre no vacío
    if (!nombreTrimmed) {
        Alert.alert("Nombre inválido", "El nombre del producto no puede estar vacío.");
        // Resetear al valor original si es inválido
        setRow(idx, { _nombre: r.nombre });
        return;
    }

    const patch: { nombre?: string; cantidad?: string } = {}; // Solo enviar si cambió
    if (nombreTrimmed !== r.nombre) patch.nombre = nombreTrimmed;
    if (cantidadTrimmed !== r.cantidad) patch.cantidad = cantidadTrimmed;

    if (Object.keys(patch).length === 0) {
      setEditingRowId(null); // No hubo cambios, solo salir de edición
      return;
    }

    try {
      setRow(idx, { _saving: true });
      const updated = await apiUpdateItem(r.id, patch);
      setRow(idx, {
        ...updated, // Usar todos los datos actualizados de la API
        _checked: updated.done,
        _nombre: updated.nombre,
        _cantidad: String(updated.cantidad || "1"), // Asegurar string
        _saving: false,
      });
      setEditingRowId(null); // Salir de edición en éxito
    } catch (e: any) {
      setRow(idx, { _saving: false }); // Quitar loading en error
      Alert.alert("Error", e?.message || "No se pudo guardar el producto.");
      // No salir de edición en error, para que el usuario pueda reintentar o cancelar
    }
  };

  const confirmDeleteRow = (idx: number) => {
    if (idx < 0 || idx >= rows.length) return; // Validar índice
    const r = rows[idx];
    Alert.alert("Eliminar producto", `¿Quieres borrar "${r.nombre}"?`, [
      { text: "Cancelar", style: "cancel" }, // Usar estilo cancel
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          try {
            setRow(idx, { _deleting: true });
            await apiDeleteItem(r.id);
            // Actualizar estado ANTES de filtrar para evitar flickering
            setRows((prev) => prev.filter((_, i) => i !== idx));
          } catch (e: any) {
            // Solo quitar el flag de deleting si falló
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
    showSheet(); // Mostrar sheet ANTES de la llamada
    try {
      // Cargar sources solo si es necesario (ya debería estar cargado)
      const currentSources = sources || await getScrapeSources().catch(() => ({ carrefour: true, coto: true, jumbo: true, dia: true }));
      if (!sources) setSources(currentSources);

      const enabledNow = sourcesToEnabled(currentSources);
      const data = await searchAll({ q, limit: 2, enabled: enabledNow });
      setHits(flattenSearch(data as SearchRawResponse).slice(0, 10)); // Limitar a 10 resultados
    } catch (e: any) {
      console.error("Error en onCartPress (searchAll):", e);
      setSheetErr(e?.message || "No se pudieron obtener precios.");
    } finally {
      setSheetLoading(false);
    }
  };

  const startScanForRow = async (idx: number) => {
    setScanningRowIdx(idx); // Guardamos el índice del item original
    // <<< NUEVO: Limpiar resultados anteriores >>>
    setScannedProductOptions([]);
    setScannedResultsModalVisible(false); // Asegurar que el modal de resultados esté cerrado

    if (!permission?.granted) {
      const { granted } = await requestPermission();
      if (!granted) {
          Alert.alert("Permiso requerido", "Necesitamos acceso a la cámara para escanear.");
          setScanningRowIdx(null); // Resetear índice si no hay permiso
          return;
      }
    }
    setHasScanned(false); // Permitir un nuevo escaneo
    setScannerVisible(true); // Abrir la cámara
  };

  // <<< MODIFICADO: onBarcodeDetected >>>
  const onBarcodeDetected = async ({ data }: { data: string }) => {
    if (hasScanned || isSearchingBarcode) return; // Evitar procesar múltiples veces o si ya está buscando
    const ean = onlyDigits(data);
    if (!ean) return; // Ignorar si no son solo dígitos

    setHasScanned(true); // Marcar como escaneado
    setScannerVisible(false); // Cerrar la cámara
    setIsSearchingBarcode(true); // Mostrar indicador de carga

    try {
      console.log(`[Scan] Barcode detectado: ${ean}. Buscando en backend...`);
      // Llamar al backend para buscar por barcode
      // Usamos searchAllBarcode que asumo tienes, o puedes adaptar searchAll
      const currentSources = sources || await getScrapeSources().catch(() => ({ carrefour: true, coto: true, jumbo: true, dia: true }));
      if (!sources) setSources(currentSources);
      const enabledNow = sourcesToEnabled(currentSources);

      // Usar searchAllBarcode o searchAll con el barcode
      const searchFunction = typeof searchAllBarcode === 'function' ? searchAllBarcode : (bc: string, lim: number, en: string[]) => searchAll({ barcode: bc, limit: lim, enabled: en });
      const rawResults = await searchFunction(ean, 3, enabledNow); // Buscar hasta 3 por tienda

      const foundProducts = flattenSearch(rawResults as SearchRawResponse);
      console.log(`[Scan] Backend devolvió ${foundProducts.length} opciones.`);

      if (foundProducts.length > 0) {
        setScannedProductOptions(foundProducts); // Guardar opciones
        setScannedResultsModalVisible(true); // Mostrar el modal de resultados
      } else {
        Alert.alert("Producto no encontrado", `No se encontraron productos para el código ${ean}.`);
        setScanningRowIdx(null); // Resetear el índice si no se encontró nada
      }
    } catch (e: any) {
      console.error("[Scan] Error buscando barcode en backend:", e);
      Alert.alert("Error de Búsqueda", e?.message || "No se pudo buscar el código de barras.");
      setScanningRowIdx(null); // Resetear
    } finally {
      setIsSearchingBarcode(false); // Ocultar indicador de carga
      // Permitir un nuevo escaneo después de un breve delay
      setTimeout(() => setHasScanned(false), 500);
    }
  };

  // <<< NUEVO: Función para manejar la selección del producto escaneado >>>
  const handleSelectScannedProduct = (selectedProduct: SearchHit) => {
    if (scanningRowIdx !== null && scanningRowIdx >= 0 && scanningRowIdx < rows.length) {
      console.log(`[Scan] Reemplazando item ${scanningRowIdx} con "${selectedProduct.name}"`);
      // Actualizar el nombre en la fila correspondiente
      setRow(scanningRowIdx, { _nombre: selectedProduct.name });
      // Aquí podrías opcionalmente llamar a saveRowIfChanged(scanningRowIdx)
      // si quieres guardar el cambio inmediatamente en el backend,
      // o podrías esperar a que el usuario edite la cantidad y guarde manualmente.
      // Por ahora, solo actualizamos el estado local:
      // saveRowIfChanged(scanningRowIdx); // Descomenta si quieres guardar ya
    } else {
       console.error("[Scan] Error: scanningRowIdx inválido al seleccionar producto.");
    }
    // Cerrar el modal y resetear estados
    setScannedResultsModalVisible(false);
    setScannedProductOptions([]);
    setScanningRowIdx(null);
  };

  // ... (tus funciones onEndEditListName, addNewItem quedan igual) ...
  const onEndEditListName = async () => {
    setEditingName(false);
    const nombreTrimmed = listName.trim();

    if (!nombreTrimmed) {
      Alert.alert("Nombre inválido", "La lista debe tener un nombre.");
      setListName(listNameOrig); // Resetear al original si es inválido
      return;
    }
    // Solo llamar a la API si el nombre realmente cambió
    if (nombreTrimmed === listNameOrig) return;

    try {
      const updatedList = await renameList(listId, { nombre: nombreTrimmed });
      setListName(updatedList.nombre);
      setListNameOrig(updatedList.nombre); // Actualizar el original también
    } catch (e: any) {
      Alert.alert("Error", e?.message || "No se pudo renombrar la lista.");
      setListName(listNameOrig); // Resetear al original en caso de error
    }
  };

 const addNewItem = async () => {
    if (adding) return;
    const nombre = newNombre.trim();
    const cantidad = newCantidad.trim() || "1"; // Default a "1"
    if (!nombre) return; // No agregar si el nombre está vacío

    // Validar cantidad numérica (opcional pero recomendado)
    if (!/^\d+$/.test(cantidad)) {
        Alert.alert("Cantidad inválida", "La cantidad debe ser un número entero.");
        return;
    }

    try {
      setAdding(true);
      const created = (await apiAddItem(listId, { nombre, cantidad })) as ShoppingItemOut;
      // Crear el nuevo objeto Row completo
      const newRow: Row = {
        ...created,
        _checked: created.done,
        _nombre: created.nombre,
        _cantidad: String(created.cantidad || "1"),
        _saving: false,
        _deleting: false,
      };
      // Agregar al PRINCIPIO de la lista para visibilidad inmediata
      setRows((prev) => [newRow, ...prev]);
      setNewNombre(""); // Limpiar campos
      setNewCantidad("");
      // Opcional: Mover foco de vuelta al nombre
      // nameInputRef.current?.focus(); // Necesitarías un ref para el input de nombre
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
             // ... (tu JSX de edición inline queda igual) ...
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
                 // Opcional: Mover foco a cantidad al presionar Enter
                 onSubmitEditing={() => { /* Busca el ref del input de cantidad */ }}
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
                 // Podrías necesitar un ref aquí si quieres mover el foco desde el nombre
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
            <Pressable onPress={() => onCartPress(item._nombre)} style={styles.actionIcon} disabled={item._deleting || isEditing}>
              <Ionicons name="cart-outline" size={22} color={SECONDARY} />
            </Pressable>
            {/* <<< MODIFICADO: Llamar a startScanForRow con el índice >>> */}
            <Pressable onPress={() => startScanForRow(index)} style={styles.actionIcon} disabled={item._deleting || isEditing}>
              <MaterialCommunityIcons name="barcode-scan" size={22} color={TERTIARY} />
            </Pressable>
            <Pressable onPress={() => confirmDeleteRow(index)} style={styles.actionIcon} disabled={item._deleting || isEditing}>
              <Ionicons name="trash-outline" size={22} color={ERROR} />
            </Pressable>
          </View>
        </View>
      </Animated.View>
    );
  };

  const bottomPad = Platform.OS === 'ios' ? Math.max(insets.bottom, 16) + tabBarHeight : tabBarHeight + 16; // Mejor manejo del padding
  const hasPendingChanges = useMemo(() => rows.some(r => r._modified && !r._deleting), [rows]);

return (
    <View style={[styles.root, { backgroundColor: BG }]}>
        <SafeAreaView style={styles.safeArea} edges={["top"]}>
            {/* Header */}
            <View style={[styles.headerPrimary, { backgroundColor: PRIMARY, paddingTop: insets.top + 12 }]}>
                {/* Back Button */}
                <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace("/purchases")} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={28} color={WHITE} />
                </Pressable>

                {/* Center Area (Title, Compare, Save) */}
                <View style={styles.headerTitleArea}>
                    {/* Compare Button */}
                    <Pressable
                        onPress={handleStartComparison}
                        disabled={isStartingComparison || rows.length < 1}
                        style={[styles.compareButton, { backgroundColor: WHITE }]}
                    >
                        {isStartingComparison ? (
                            <ActivityIndicator color={PRIMARY} />
                        ) : (
                            <>
                                <Ionicons name="analytics-outline" size={20} color={PRIMARY} />
                                <Text style={[styles.compareButtonText, { color: PRIMARY }]}>Comparar Lista</Text>
                            </>
                        )}
                    </Pressable>

                    {/* Title / Edit Title */}
                    {!editingName ? (
                        <>
                            <View style={styles.titleRow}>
                                <Text style={styles.titleText} numberOfLines={1}>{listName || "Cargando..."}</Text>
                                <Pressable onPress={() => setEditingName(true)} style={styles.pencilBtn} hitSlop={8}>
                                    <Ionicons name="create-outline" size={20} color={`${WHITE}CC`} />
                                </Pressable>
                            </View>
                            {/* Renderizar fecha solo si es válida */}
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
                                onSubmitEditing={onEndEditListName}
                                cursorColor={WHITE}
                                selectionColor={`${WHITE}99`}
                                underlineColorAndroid="transparent"
                                placeholder="Nombre de la lista"
                                placeholderTextColor={`${WHITE}99`}
                            />
                        </View>
                    )}

                    {/* Save Changes Button (Conditional) */}
                    {hasPendingChanges && (
                        <Pressable
                            onPress={saveListChanges}
                            disabled={isSavingAll}
                            style={[styles.saveAllButton, { backgroundColor: isSavingAll ? GRAY200 : TERTIARY }]}
                        >
                            {isSavingAll ? (
                                <ActivityIndicator color={WHITE} size="small" />
                            ) : (
                                <Ionicons name="save-outline" size={20} color={WHITE} />
                            )}
                            <Text style={styles.saveAllButtonText}>Guardar</Text>
                        </Pressable>
                    )}
                </View>

                {/* Delete List Button */}
                <Pressable
                    onPress={() => {
                        Alert.alert("Eliminar lista", `¿Quieres borrar "${listName}"? Esta acción no se puede deshacer.`, [
                            { text: "Cancelar", style: "cancel" },
                            { text: "Eliminar", style: "destructive", onPress: async () => {
                                try { await apiDeleteList(listId); router.replace("/purchases"); }
                                catch (e: any) { Alert.alert("Error", e?.message || "No se pudo eliminar la lista."); }
                            }},
                        ]);
                    }}
                    style={styles.deleteListButton}
                >
                    <Ionicons name="trash-outline" size={24} color={`${WHITE}CC`} />
                </Pressable>
            </View>

            {/* Add Item Bar */}
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
                    style={[styles.textInputFixed, { width: 70, backgroundColor: SURFACE, borderColor: BORDER, color: TEXT }]}
                    placeholderTextColor={GRAY400}
                    cursorColor={PRIMARY}
                    selectionColor={PRIMARY}
                    underlineColorAndroid="transparent"
                    maxLength={3}
                />
                <Pressable onPress={addNewItem} disabled={!newNombre.trim() || adding}
                    style={[styles.submitButtonFixed, { backgroundColor: newNombre.trim() && !adding ? PRIMARY : GRAY100 }]}>
                    {adding ? <ActivityIndicator color={WHITE} /> : <Ionicons name="add" size={28} color={WHITE} />}
                </Pressable>
            </View>

            {/* Item List */}
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}
                keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
            >
                <FlatList
                    data={rows}
                    keyExtractor={(item) => String(item.id)}
                    contentContainerStyle={[styles.listContainerFixed, { paddingBottom: bottomPad }]}
                    renderItem={renderItem} // Asume que renderItem está definida correctamente
                    ListEmptyComponent={() => (
                        <View style={styles.emptyContainer}>
                            {loading ? (
                                <ActivityIndicator size="large" color={PRIMARY} />
                            ) : (
                                <>
                                    <Ionicons name="file-tray-stacked-outline" size={60} color={GRAY200} />
                                    <Text style={[styles.emptyText, { color: TEXT_SECONDARY }]}>Agrega productos para empezar.</Text>
                                </>
                            )}
                        </View>
                    )}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY}/>}
                    keyboardShouldPersistTaps="handled"
                />
            </KeyboardAvoidingView>
        </SafeAreaView>

        {/* Modals */}
        {/* Bottom Sheet Scrapers */}
        <Modal visible={sheetVisible} transparent animationType="none" onRequestClose={hideSheet}>
            <Pressable style={StyleSheet.absoluteFill} onPress={hideSheet}>
                <RNAnimated.View style={[styles.backdrop, { opacity: backdrop }]} />
            </Pressable>
            <RNAnimated.View style={[styles.sheet, { backgroundColor: CARD, transform: [{ translateY: sheetY }] }]}>
                <View style={[styles.sheetHeader, { borderBottomColor: BORDER }]}>
                    <Text style={[styles.sheetTitle, { color: TERTIARY }]}>Resultados de Búsqueda</Text>
                    <Pressable onPress={hideSheet}><Ionicons name="close" size={24} color={GRAY400} /></Pressable>
                </View>
                {sheetLoading ? (
                    <ActivityIndicator style={{ flex: 1, padding: 20 }} color={PRIMARY} size="large"/>
                ) : sheetErr ? (
                    <View style={styles.errorContainer}>
                        <Ionicons name="warning-outline" size={40} color={ERROR} />
                        {typeof sheetErr === 'string' && <Text style={[styles.errorText, { color: ERROR, marginTop: 10 }]}>{sheetErr}</Text>}
                    </View>
                ) : (
                    <FlatList
                        data={hits}
                        keyExtractor={(h, i) => `${h.store}-${h.url}-${i}`}
                        renderItem={({ item: h }) => (
                            <TouchableOpacity onPress={() => h.url && Linking.openURL(h.url)} style={[styles.hitCard, { borderBottomColor: BORDER }]}>
                                <Image
                                    source={h.image_url ? { uri: h.image_url } : require('../../../../assets/icon.png')}
                                    style={styles.hitImage}
                                />
                                <View style={styles.hitTextContainer}>
                                    <Text numberOfLines={2} style={[styles.hitName, {color: TEXT}]}>{h.name}</Text>
                                    <View style={styles.storeInfoContainer}>
                                        {iconForStore(h.store) && <Image source={iconForStore(h.store)} style={styles.hitStoreIcon} />}
                                        <Text style={[styles.hitStore, {color: TEXT_SECONDARY}]}>{String(h.store || "").toUpperCase()}</Text>
                                    </View>
                                </View>
                                <Text style={[styles.hitPrice, {color: SECONDARY}]}>
                                    {typeof h.price === "number" && h.price > 0 ? `$${h.price.toLocaleString("es-AR", {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : ""}
                                </Text>
                            </TouchableOpacity>
                        )}
                        ListEmptyComponent={() => (
                            <View style={styles.emptyListContainer}>
                                <Ionicons name="search-outline" size={40} color={GRAY400} />
                                <Text style={styles.emptyListText}>No se encontraron productos.</Text>
                            </View>
                        )}
                        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 24 }}
                    />
                )}
            </RNAnimated.View>
        </Modal>

        {/* Scanner */}
        <Modal visible={scannerVisible} transparent animationType="fade" onRequestClose={() => setScannerVisible(false)}>
            <View style={styles.scannerOverlayFull}>
                {permission?.granted ? (
                    <CameraView
                        style={StyleSheet.absoluteFill}
                        onBarcodeScanned={onBarcodeDetected}
                        barcodeScannerSettings={{ barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e"] }}
                    />
                ) : (
                    <View style={styles.permissionMessageContainer}>
                        <Text style={styles.permissionMessageText}>Pidiendo permiso de cámara...</Text>
                        {!permission && <ActivityIndicator color={WHITE} style={{marginTop: 10}}/>}
                    </View>
                )}
                <View style={styles.scannerGuideOverlay}>
                    <View style={styles.scannerGuideBox} />
                    <Text style={styles.scannerGuideText}>Apunta al código de barras</Text>
                </View>
                <View style={[styles.scannerBarTop, { paddingTop: insets.top }]}>
                    <Pressable onPress={() => setScannerVisible(false)} style={styles.scannerCloseButton}>
                        <Ionicons name="close" size={28} color={WHITE} />
                    </Pressable>
                </View>
            </View>
        </Modal>

        {/* Scan Results Modal */}
        <Modal
            visible={scannedResultsModalVisible}
            transparent animationType="fade"
            onRequestClose={() => {
                setScannedResultsModalVisible(false);
                setScannedProductOptions([]);
                setScanningRowIdx(null);
            }}
        >
            <Pressable
                style={styles.scanModalBackdrop}
                onPress={() => {
                    setScannedResultsModalVisible(false);
                    setScannedProductOptions([]);
                    setScanningRowIdx(null);
                }}
            >
                <Pressable onPress={() => {}} style={[styles.scanModalContainer, { backgroundColor: CARD }]}>
                    <View style={[styles.sheetHeader, { borderBottomColor: BORDER }]}>
                        <Text style={[styles.sheetTitle, { color: TERTIARY }]}>Selecciona un producto</Text>
                        <Pressable onPress={() => {
                            setScannedResultsModalVisible(false);
                            setScannedProductOptions([]);
                            setScanningRowIdx(null);
                        }}>
                            <Ionicons name="close" size={24} color={GRAY400} />
                        </Pressable>
                    </View>
                    {isSearchingBarcode ? (
                        <ActivityIndicator style={{ padding: 20 }} color={PRIMARY} size="large"/>
                    ) : (
                        <FlatList
                            data={scannedProductOptions}
                            keyExtractor={(item, index) => `${item.store}-${item.url}-${index}`}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[styles.hitCard, { borderBottomColor: BORDER }]}
                                    onPress={() => handleSelectScannedProduct(item)}
                                >
                                    <Image
                                        source={item.image_url ? { uri: item.image_url } : require('../../../../assets/icon.png')}
                                        style={styles.hitImage}
                                    />
                                    <View style={styles.hitTextContainer}>
                                        <Text numberOfLines={2} style={[styles.hitName, {color: TEXT}]}>{item.name}</Text>
                                        <Text style={[styles.hitPrice, {color: SECONDARY}]}>
                                            {typeof item.price === "number" && item.price > 0 ? `$${item.price.toLocaleString("es-AR", {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : ""}
                                        </Text>
                                        <View style={styles.storeInfoContainer}>
                                            {iconForStore(item.store) && <Image source={iconForStore(item.store)} style={styles.hitStoreIcon} />}
                                            <Text style={[styles.hitStore, {color: TEXT_SECONDARY}]}>{String(item.store || "").toUpperCase()}</Text>
                                        </View>
                                    </View>
                                    <Ionicons name="checkmark-circle-outline" size={28} color={TERTIARY} />
                                </TouchableOpacity>
                            )}
                            ListEmptyComponent={() => (
                                <View style={styles.emptyScanResultContainer}>
                                    <Ionicons name="warning-outline" size={30} color={GRAY400} />
                                    <Text style={styles.emptyScanResultText}>No se encontraron productos para el código escaneado.</Text>
                                </View>
                            )}
                            contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) }}
                        />
                    )}
                </Pressable>
            </Pressable>
        </Modal>

        {/* Global Loading Overlays */}
        {isSearchingBarcode && (
            <View style={styles.globalLoadingOverlay}>
                <ActivityIndicator size="large" color={WHITE} />
                <Text style={styles.globalLoadingText}>Buscando código...</Text>
            </View>
        )}
        {isSavingAll && ( // Overlay para guardar cambios
             <View style={styles.globalLoadingOverlay}>
                 <ActivityIndicator size="large" color={WHITE} />
                 <Text style={styles.globalLoadingText}>Guardando cambios...</Text>
             </View>
         )}

    </View>
  );
};
// ================= Styles =================
// Mantén tus estilos originales, pero agrega estos nuevos/modificados:
const styles = StyleSheet.create({
  // ... (Tus estilos existentes: root, safeArea, headerPrimary, etc.) ...
  root: { flex: 1 },
  safeArea: { flex: 1 },
  headerPrimary: { paddingHorizontal: 16, paddingBottom: 12, flexDirection: "row", alignItems: "flex-start" },
  backButton: { marginRight: 8, padding: 8 },
  headerTitleArea: { flex: 1 },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  titleText: { fontSize: 22, fontWeight: "bold", color: "white", textAlign: "center", flexShrink: 1 },
  pencilBtn: { padding: 4 },
  dateText: { color: colors.white, opacity: 0.9, fontSize: 14, textAlign: "center", marginTop: 2 },
  titleEditRow: { flex: 1, alignItems: "center", justifyContent: "center" },
  titleInput: { fontSize: 22, fontWeight: "bold", color: "white", textAlign: "center", paddingVertical: 6, paddingHorizontal: 10, borderBottomWidth: 1, borderColor: "rgba(255,255,255,0.4)", borderRadius: 6, minWidth: 200 },
  deleteListButton: { marginLeft: 8, padding: 8 },
  compareButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 16, marginBottom: 16, gap: 8, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 5 },
  compareButtonText: { fontSize: 16, fontWeight: 'bold' },
  inputBarFixed: { flexDirection: "row", alignItems: "center", padding: 12, marginHorizontal: 16, marginTop: 8, marginBottom: 8, borderRadius: 16, gap: 8, borderWidth: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 5 },
  textInputFixed: { height: 48, fontSize: 16, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1 },
  submitButtonFixed: { width: 48, height: 48, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  listContainerFixed: { paddingHorizontal: 16, paddingTop: 8 }, // Ajustar paddingTop
  emptyContainer: { flex: 1, paddingTop: "20%", alignItems: "center", justifyContent: 'center' }, // Centrar si está vacío
  emptyText: { marginTop: 16, fontSize: 16, fontWeight: "600", opacity: 0.7, textAlign: 'center' },
  itemCard: { flexDirection: "row", alignItems: "center", paddingVertical: 10, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1, marginBottom: 12, gap: 12 },
  itemMain: { flex: 1, marginRight: 8 }, // Añadir margen
  rowName: { fontSize: 16, fontWeight: "600" },
  rowQty: { fontSize: 14, marginTop: 2 },
  itemActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  actionIcon: { padding: 6 },
  editCompactRow: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, minHeight: 24 },
  inlineNameInput: { flex: 1, fontSize: 16, paddingHorizontal: 0, paddingVertical: 2, borderBottomWidth: 1 },
  inlineQtyInput: { width: 64, height: 36, paddingHorizontal: 8, borderWidth: 1, borderRadius: 8, textAlign: "center", fontSize: 14 }, // Aumentar altura
  inlineIconBtn: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: { position: "absolute", left: 0, right: 0, bottom: 0, height: SHEET_HEIGHT, borderTopLeftRadius: 20, borderTopRightRadius: 20, elevation: 20, shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 10 },
  sheetHeader: { flexDirection: "row", alignItems: "center", padding: 16, borderBottomWidth: 1 },
  sheetTitle: { flex: 1, fontSize: 18, fontWeight: "bold" },
  hitCard: { flexDirection: "row", alignItems: "center", paddingVertical: 10, paddingHorizontal: 16, gap: 12, borderBottomWidth: 1 }, // Ajustar padding
  hitImage: { width: 48, height: 48, borderRadius: 8, resizeMode: "contain", backgroundColor: "#eee" }, // Color de fondo suave
  hitTextContainer: { flex: 1, marginRight: 8 }, // Añadir margen
  hitName: { fontWeight: "600", fontSize: 15 }, // Ajustar tamaño
  hitStore: { fontSize: 12, opacity: 0.8 , fontStyle: 'italic', marginLeft: 4 }, // Añadir margen
  hitStoreIcon: { width: 14, height: 14, resizeMode: 'contain'}, // Icono de tienda
  hitPrice: { fontSize: 16, fontWeight: "bold" },
  errorText: { padding: 16, textAlign: "center" },
  scannerOverlayFull: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.8)" }, // Más oscuro
  scannerBarTop: { width: "100%", alignItems: "flex-start", position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
  scannerCloseButton: { margin: 16, backgroundColor: "rgba(0,0,0,0.5)", borderRadius: 20, padding: 4 },
  // <<< NUEVO: Estilos para guía del escáner >>>
  scannerGuideOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  scannerGuideBox: { width: '70%', height: '30%', borderWidth: 2, borderColor: 'rgba(255, 255, 255, 0.6)', borderRadius: 10 },
  scannerGuideText: { color: 'white', marginTop: 15, fontSize: 16, fontWeight: '500', backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 5 },
  // <<< NUEVO: Estilos para el modal de resultados del escaneo >>>
  scanModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)", // Fondo semitransparente
    justifyContent: "center",
    alignItems: "center",
  },
  scanModalContainer: {
    width: "90%",
    maxHeight: "70%", // Limitar altura
    borderRadius: 20,
    overflow: "hidden", // Para que el FlatList respete el borde redondeado
    elevation: 10,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
   // <<< NUEVO: Estilos para el overlay de carga global >>>
   globalLoadingOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000, // Asegurar que esté por encima de todo
   },
   globalLoadingText: {
      marginTop: 10,
      color: 'white',
      fontSize: 16,
      fontWeight: '500',
   },
   permissionMessageContainer : {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 20,
   },
    permissionMessageText: {
      color: 'white',
      fontSize: 18,
      textAlign: 'center',
   },
    emptyScanResultContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingTop: 40,
   },
    emptyScanResultText: {
      marginTop: 16,
      fontSize: 16,
      fontWeight: '600',
      opacity: 0.7,
      textAlign: 'center',
   },
   storeInfoContainer : {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 4,
   },
   emptyListContainer: {  
      flex: 1,
      paddingTop: 40,
      justifyContent: 'center',
      alignItems: 'center',
   },
   emptyListText: {
      marginTop: 16,
      fontSize: 16,
      fontWeight: '600',
      opacity: 0.7,
      textAlign: 'center',
   },
   errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
   },
   saveAllButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 12,
        marginTop: 8, // Espacio debajo del título/comparar
        gap: 6,
        alignSelf: 'center', // Centrar el botón
    },
    saveAllButtonText: {
        color: '#FFFFFF', // Usar WHITE
        fontSize: 14,
        fontWeight: 'bold',
    }

});