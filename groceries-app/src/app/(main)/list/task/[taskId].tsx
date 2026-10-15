import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, FadeInUp } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { getComparisonResults } from "../../../../api/endpoints";
import type { ComparisonSummaryOut, StoreSummary } from "../../../../api/types";
import { useTheme } from "../../../../providers/theme";

const logos = {
  coto: require("../../../../../assets/company/coto.png"),
  dia: require("../../../../../assets/company/dia.png"),
  carrefour: require("../../../../../assets/company/carrefour.png"),
  jumbo: require("../../../../../assets/company/jumbo.png"),
} as const;

const StoreLogo = ({ store }: { store: string }) => {
  const normalizedStore = store.toLowerCase() as keyof typeof logos;
  const logo = logos[normalizedStore];
  
  if (!logo) return null;

  return <Image source={logo} style={styles.storeLogo} resizeMode="contain" />;
};


const StoreResultCard = ({ store, summary }: { store: string, summary: StoreSummary }) => {
    const { colors } = useTheme();
    const [expanded, setExpanded] = useState(false);

    return (
        <Animated.View entering={FadeInUp.duration(500)}>
            <Pressable 
                style={[styles.card, { backgroundColor: colors.white, borderColor: colors.border }]}
                onPress={() => setExpanded(!expanded)}
            >
                <View style={styles.cardHeader}>
                    <View style={{flexDirection: 'row', alignItems: 'center', gap: 12}}>
                       <StoreLogo store={store} />
                       <Text style={[styles.storeName, { color: colors.text }]}>{store.toUpperCase()}</Text>
                    </View>
                    <Text style={[styles.storeTotal, { color: colors.primary }]}>
                        ${summary.total.toFixed(2)}
                    </Text>
                </View>
                {summary.missing_count > 0 && (
                    <View style={styles.missingContainer}>
                        <Ionicons name="warning-outline" size={16} color={colors.warning} />
                        <Text style={[styles.missingText, { color: colors.warning }]}>
                            Faltan {summary.missing_count} productos
                        </Text>
                    </View>
                )}
                {expanded && summary.missing_items.length > 0 && (
                     <View style={styles.missingItemsList}>
                        {summary.missing_items.map((item, index) => (
                            <Text key={index} style={styles.missingItemText}>• {item}</Text>
                        ))}
                    </View>
                )}
            </Pressable>
        </Animated.View>
    );
};

export default function ComparisonResultsScreen() {
    const { colors, spacing } = useTheme();
    const router = useRouter();
    const { taskId, listName } = useLocalSearchParams<{ taskId: string, listName: string }>();

    const [result, setResult] = useState<ComparisonSummaryOut | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!taskId) {
            setError("No se recibió un ID de tarea para la comparación.");
            return;
        }

        const poll = async () => {
            try {
                const response = await getComparisonResults(taskId);
                if (response.status === "completed") {
                    setResult(response.data);
                    clearInterval(intervalId); // Detiene el polling
                }
            } catch (e: any) {
                setError(e.message || "Error al obtener resultados.");
                clearInterval(intervalId);
            }
        };

        poll(); // Llama una vez al principio
        const intervalId = setInterval(poll, 4000); // Y luego cada 4 segundos

        return () => clearInterval(intervalId);
    }, [taskId]);

    // --- Vista de Carga ---
    if (!result && !error) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.loadingTitle, { color: colors.text }]}>Comparando Precios...</Text>
                <Text style={[styles.loadingSubtitle, { color: colors.tertiary }]}>
                    Buscando en los supermercados ...
                </Text>
            </View>
        );
    }

    // --- Vista de Error ---
    if (error) {
        return <View style={styles.container}><Text>Error: {error}</Text></View>
    }

    if (!result) return null;

    // --- Vista de Resultados ---
    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <ScrollView contentContainerStyle={{padding: spacing.md}}>
                <Animated.View entering={FadeIn.duration(800)}>
                    <Pressable onPress={() => router.push("/purchases")} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={24} color={colors.primary} />
                    </Pressable>
                    <Text style={[styles.title, { color: colors.text }]}>Resultados</Text>
                    {result.winner ? (
                         <View style={[styles.winnerCard, { backgroundColor: colors.white }]}>
                            <Ionicons name="trophy-outline" size={28} color={colors.success} />
                            <Text style={[styles.winnerText, { color: colors.success }]}>
                                El más económico es: <Text style={{fontWeight: 'bold'}}>{result.winner.toUpperCase()}</Text>
                            </Text>
                        </View>
                    ) : (
                        <View style={[styles.winnerCard, { backgroundColor: colors.error }]}>
                           <Ionicons name="alert-circle-outline" size={28} color={colors.white} />
                           <Text style={[styles.winnerText, { color: colors.white }]}>
                               No hay un ganador claro (faltan productos en todas las tiendas).
                           </Text>
                       </View>
                    )}
                </Animated.View>
                
                {Object.entries(result.totals_by_store)
                    .sort(([, a], [, b]) => a.total - b.total)
                    .map(([store, summary]) => (
                        <StoreResultCard key={store} store={store} summary={summary} />
                ))}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    loadingTitle: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginTop: 20 },
    loadingSubtitle: { fontSize: 16, textAlign: 'center', marginTop: 8, paddingHorizontal: 20 },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' },
    winnerCard: {
        flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, marginBottom: 24,
    },
      storeLogo: {
        width: 32,
        height: 32,
        borderRadius: 8,
    },
    winnerText: { fontSize: 18, marginLeft: 12, flex: 1 },
    card: { 
        padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, 
        shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3
    },
    cardHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    },
    storeName: { fontSize: 18, fontWeight: 'bold', textTransform: 'capitalize' },
    storeTotal: { fontSize: 24, fontWeight: 'bold' },
    missingContainer: {
        flexDirection: 'row', alignItems: 'center', marginTop: 8,
        padding: 8, borderRadius: 8, backgroundColor: 'rgba(255, 165, 0, 0.1)'
    },
    missingText: { fontSize: 14, marginLeft: 8, fontWeight: '500' },
    missingItemsList: {
        marginTop: 12,
        paddingLeft: 8,
    },
     backButton: {
    padding: 8,
  },
    missingItemText: {
        fontSize: 14,
        color: '#666',
        marginBottom: 4,
    }
});