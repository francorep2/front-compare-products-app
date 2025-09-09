import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useHeaderHeight } from "@react-navigation/elements";
import { useLocalSearchParams, useRouter } from "expo-router"; // 👈 importar router & params
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { mapSearchResponse, useDebouncedValue } from "../../../utils/search";
import { searchAll } from "../../api/endpoints";
import { SearchHit, SearchRawResponse } from "../../api/types";
import { Text } from "../../components/ui/Text";
import { useTheme } from "../../providers/theme";

export default function SearchScreen() {
  const { colors, spacing, radii } = useTheme();
  const insets = useSafeAreaInsets();
  const headerH = useHeaderHeight();
  const router = useRouter(); // 👈
  const params = useLocalSearchParams<{ scanned?: string }>(); // 👈

  const [q, setQ] = useState("");
  const dq = useDebouncedValue(q, 420);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [results, setResults] = useState<SearchHit[]>([]);

  // Si volvemos del scanner con ?scanned=..., cargamos el input y disparamos la búsqueda
  useEffect(() => {
    const s = (params?.scanned ?? "").toString();
    if (s) setQ(s);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params?.scanned]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setErr(null);
      if (!dq || dq.trim().length < 2) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const data = await searchAll(dq, 3);
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
  }, [dq]);

  const clear = () => setQ("");

  const openProduct = async (url?: string) => {
    if (!url) return;
    try {
      const ok = await Linking.canOpenURL(url);
      if (ok) await Linking.openURL(url);
      else await Linking.openURL(url);
    } catch {}
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.white }} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? headerH : 0}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: spacing.md, paddingBottom: insets.bottom + 120 }}
        >
          <Text style={{ fontSize: 30, fontWeight: "800", color: colors.secondary, marginBottom: spacing.sm }}>
            ¿Qué producto estás buscando?
          </Text>

          {/* Input */}
          <View
            style={{
              height: 48,
              borderRadius: radii.md,
              backgroundColor: "#FAFBFC",
              borderWidth: 1,
              borderColor: "#E9EEF5",
              paddingHorizontal: 12,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <Ionicons name="search-outline" size={20} color={colors.secondary} style={{ marginRight: 8 }} />
            <TextInput
              value={q}
              onChangeText={setQ}
              placeholder="Coca cola 500ml"
              returnKeyType="search"
              style={{ flex: 1, paddingVertical: 0, fontSize: 16 }}
            />
            {q ? (
              <Pressable onPress={clear} hitSlop={10} accessibilityLabel="Limpiar búsqueda">
                <Ionicons name="close-circle" size={18} color={colors.gray400} />
              </Pressable>
            ) : null}
          </View>

          {/* Escanear: este botón/ícono abre el scanner */}
          <Pressable
            onPress={() => router.push("/(main)/scanner")} // 👈 navegar al scanner
            style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: spacing.md }}
          >
            <MaterialCommunityIcons name="barcode-scan" size={22} color={colors.tertiary} />
            <Text style={{ color: colors.tertiary, fontWeight: "700" }}>
              Escaneá el código de barras
            </Text>
          </Pressable>

          <View style={{ height: 1, backgroundColor: "#E9EEF5", opacity: 0.7, marginBottom: spacing.md }} />

          {/* Estados */}
          {loading && (
            <View style={{ paddingVertical: spacing.md, alignItems: "center" }}>
              <ActivityIndicator />
            </View>
          )}
          {err && (
            <View
              style={{
                backgroundColor: "#FFF2F2",
                borderColor: "#FFD6D6",
                borderWidth: 1,
                padding: spacing.md,
                borderRadius: radii.md,
                marginBottom: spacing.md,
              }}
            >
              <Text style={{ color: colors.error, fontWeight: "700" }}>Ocurrió un error</Text>
              <Text style={{ color: colors.secondary }}>{err}</Text>
            </View>
          )}
          {!loading && !err && dq && results.length === 0 && (
            <Text style={{ color: colors.gray500 }}>
              No encontramos resultados para “{dq}”.
            </Text>
          )}

          {/* Resultados */}
          <View style={{ gap: 10 }}>
            {results.map((h, i) => (
              <Pressable
                key={`${h.store}-${h.url}-${i}`}
                onPress={() => openProduct(h.url)}  // 👈 link a la tienda
                accessibilityRole="link"
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  padding: 10,
                  borderWidth: 1,
                  borderColor: "#E9EEF5",
                  borderRadius: radii.md,
                  backgroundColor: "#FFFFFF",
                  gap: 12,
                }}
              >
                <View
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 8,
                    overflow: "hidden",
                    backgroundColor: "#F4F6F8",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {h.image_url ? (
                    <Image source={{ uri: h.image_url }} style={{ width: "100%", height: "100%" }} />
                  ) : (
                    <Ionicons name="image-outline" size={22} color={colors.gray400} />
                  )}
                </View>

                <View style={{ flex: 1 }}>
                  <Text numberOfLines={2} style={{ fontWeight: "700", color: colors.secondary }}>
                    {h.name}
                  </Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 }}>
                    <Text style={{ color: colors.primary, fontWeight: "900" }}>
                      ${Number(h.price ?? 0).toLocaleString("es-AR")}
                    </Text>
                    <View
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                        borderRadius: 999,
                        backgroundColor: "#FAFBFC",
                        borderWidth: 1,
                        borderColor: "#E9EEF5",
                      }}
                    >
                      <Text style={{ fontSize: 12, color: colors.gray600 }}>{h.store}</Text>
                    </View>
                  </View>
                  {!!h.barcode && (
                    <Text style={{ color: colors.gray500, fontSize: 12, marginTop: 2 }}>
                      EAN: {h.barcode}
                    </Text>
                  )}
                </View>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
