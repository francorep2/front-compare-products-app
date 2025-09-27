import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Defs, Path, Stop, LinearGradient as SvgGradient } from "react-native-svg";
import { mapSearchResponse, useDebouncedValue } from "../../../utils/search";

import { capitalize } from "../../../utils/helpers";
import { getScrapeSources, searchAll, searchAllBarcode, sourcesToEnabled } from "../../api/endpoints";
import { ScrapeSources, SearchHit, SearchRawResponse } from "../../api/types";
import { useTheme } from "../../providers/theme";

const BARCODE_RE = /^(?:\d{7,14}|\d{18})$/;

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

const ResultCard = ({ item, openProduct }: { item: SearchHit, openProduct: (url?: string) => void }) => {
  const { colors } = useTheme();
  return (
    <Pressable 
      onPress={() => openProduct(item.url)}
      style={[styles.resultCard, { backgroundColor: colors.white, borderColor: colors.border }]}
    >
      <Image source={{ uri: item.image_url }} style={styles.productImage} />
      <View style={styles.productInfo}>
        <Text numberOfLines={2} style={[styles.productName, { color: colors.text }]}>{item.name}</Text>
        <View style={styles.priceRow}>
          <Text style={[styles.productPrice, { color: colors.primary }]}>
            ${Number(item.price ?? 0).toLocaleString("es-AR")}
          </Text>
          {item.promotion && (
            <View style={[styles.promoBadge, { backgroundColor: colors.white }]}>
              <Text style={[styles.promoText, { color: colors.secondary }]}>{item.promotion}</Text>
            </View>
          )}
        </View>
        <Text style={[styles.storeText, { color: colors.tertiary }]}>{capitalize(item.store)}</Text>
      </View>
    </Pressable>
  );
};

export default function SearchScreen() {
  const { colors, spacing } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ scanned?: string }>();

  const [q, setQ] = useState("");
  const dq = useDebouncedValue(q, 420);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [results, setResults] = useState<SearchHit[]>([]);

  const [sources, setSources] = useState<ScrapeSources | null>(null);
  const [loadingSources, setLoadingSources] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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

  useFocusEffect(
    useCallback(() => {
      loadSources();
    }, [loadSources])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadSources();
    setRefreshing(false);
  }, [loadSources]);

  const enabled = useMemo(() => {
    if (!sources) return [];
    return sourcesToEnabled(sources);
  }, [sources]);

  useEffect(() => {
    const s = (params?.scanned ?? "").toString();
    if (s) setQ(s);
  }, [params?.scanned]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setErr(null);
      if (loadingSources || !sources) return;

      if (!dq || dq.trim().length < 3) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const isBarcode = BARCODE_RE.test(dq.trim());
        const data = isBarcode
          ? await searchAllBarcode(dq.trim(), 3, enabled)
          : await searchAll({ q: dq, limit: 3, enabled });

        const mapped = mapSearchResponse(data as SearchRawResponse);
        if (!cancelled) setResults(mapped);
      } catch (e: any) {
        if (!cancelled) {
          setErr(e?.message ?? "Error al buscar.");
          setResults([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => { cancelled = true; };
  }, [dq, enabled, loadingSources, sources]);

  const clear = () => setQ("");
  const openProduct = async (url?: string) => { if (url) await Linking.openURL(url); };

  const renderListStatus = () => {
    if (loading || loadingSources) {
      return <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />;
    }
    if (err) {
      return <Text style={[styles.statusText, { color: colors.error }]}>{err}</Text>;
    }
    if (dq.trim().length >= 3 && results.length === 0) {
      return <Text style={[styles.statusText, { color: colors.gray400 }]}>No encontramos resultados para "{dq}".</Text>;
    }
    return null;
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <WaveBackground />
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          {/* --- ENCABEZADO FIJO --- */}
          <Animated.View entering={FadeInUp.duration(600)} style={{ paddingHorizontal: spacing.md }}>
            <View style={{ paddingTop: 60 }}/>
            <View style={[styles.contentCard, { backgroundColor: colors.white }]}>
              <Text style={[styles.title, { color: colors.primary }]}>Busca cualquier producto</Text>
              <Text style={[styles.subtitle, { color: colors.gray700 }]}>Encuentra el mejor precio.</Text>
              <View style={[styles.searchBar, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Ionicons name="search-outline" size={22} color={colors.primary} />
                <TextInput
                  value={q}
                  onChangeText={setQ}
                  placeholder="Leche, pan, galletitas..."
                  placeholderTextColor={colors.gray400}
                  returnKeyType="search"
                  style={[styles.input, { color: colors.text }]}
                />
                {q ? (
                  <Pressable onPress={clear} hitSlop={10}>
                    <Ionicons name="close-circle" size={20} color={colors.gray200} />
                  </Pressable>
                ) : null}
              </View>
              <Pressable style={styles.scanButton} onPress={() => router.push("/(main)/scanner")}>
                <MaterialCommunityIcons name="barcode-scan" size={20} color={colors.tertiary} />
                <Text style={[styles.scanButtonText, { color: colors.tertiary }]}>Escanear código de barras</Text>
              </Pressable>
            </View>
          </Animated.View>
          
          <FlatList
            style={{ flex: 1, marginTop: spacing.md }}
            data={results}
            keyExtractor={(item, index) => `${item.store}-${item.url}-${index}`}
            contentContainerStyle={styles.listContainer}
            ListFooterComponent={renderListStatus}
            renderItem={({ item, index }) => (
              <Animated.View entering={FadeInUp.duration(600).delay(index * 100)}>
                <ResultCard item={item} openProduct={openProduct} />
              </Animated.View>
            )}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary}/>
            }
            keyboardShouldPersistTaps="handled"
          />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1 },
  listContainer: { 
    paddingHorizontal: 16,
    paddingBottom: 48 
  },
  contentCard: {
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    marginTop: 4,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingTop: 16,
  },
  scanButtonText: {
    fontWeight: '600',
    fontSize: 14,
  },
  statusText: {
    textAlign: 'center',
    fontSize: 16,
    padding: 20,
  },
  resultCard: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    backgroundColor: 'white',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  productImage: {
    width: 70,
    height: 70,
    borderRadius: 12,
    backgroundColor: '#F0F0F0',
  },
  productInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  productName: {
    fontWeight: '600',
    fontSize: 15,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  productPrice: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  promoBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  promoText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  storeText: {
    fontSize: 12,
    marginTop: 4,
  },
});