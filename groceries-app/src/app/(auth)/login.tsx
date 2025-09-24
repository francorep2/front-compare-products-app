import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

// --- API (Asegúrate de que estas rutas sean correctas para tu proyecto) ---
import { getToken, setToken } from "../../api/clients";
import { me } from "../../api/endpoints";
import type { MeOut } from "../../api/types";

// --- Componentes UI (Asegúrate de que estas rutas sean correctas) ---
import DisclaimerModal from "../../components/DisclaimerModal";
import FeaturedCarousel from "../../components/FeaturedCarousel";
import { Button } from "../../components/ui/Button";
import { Text } from "../../components/ui/Text";
import { colors } from "../../theme/colors";

export default function Home() {
  const router = useRouter();
  const { showDisclaimer } = useLocalSearchParams();

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<MeOut | null>(null);
  const [error, setError] = useState<string | null>(null);

  // El modal solo será visible si el parámetro showDisclaimer es 'true'
  const [isDisclaimerVisible, setDisclaimerVisible] = useState(
    showDisclaimer === 'true'
  );

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        if (!token) {
          router.replace("/login");
          return;
        }
        const data = await me();
        setUser(data);
      } catch (e: any) {
        setError("No se pudo cargar tu información.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // --- Estado de Carga ---
  if (loading) {
    return (
      <View style={styles.centeredScreen}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // --- Estado de Error ---
  if (error) {
    return (
      <View style={styles.centeredScreen}>
        <Ionicons name="alert-circle-outline" size={60} color={colors.error} />
        <Text style={styles.errorText}>{error}</Text>
        <Button
          title="Intentar de nuevo"
          onPress={() => router.replace("/login")}
        />
      </View>
    );
  }

  // --- Pantalla Principal (Exitosa) ---
  return (
    <View style={styles.rootContainer}>
      <LinearGradient
        colors={[colors.primary, colors.white]}
        style={styles.gradientBackground}
      />
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.white }]}>
              Bienvenido/a !
            </Text>
          </View>
          
          <FeaturedCarousel />

          <View style={styles.actionsGrid}>
            <ActionCard
              icon="add-circle-outline"
              title="Crear Lista"
              onPress={() => router.push("/new-list")}
            />
            <ActionCard
              icon="search-outline"
              title="Buscar"
              onPress={() => router.push("/search")}
            />
            <ActionCard
              icon="cart-outline"
              title="Mis Compras"
              onPress={() => router.push("/purchases")}
            />
            <ActionCard
              icon="person-outline"
              title="Mi Perfil"
              onPress={() => router.push("/profile")}
            />
          </View>

          <Pressable
            style={styles.logoutButton}
            onPress={async () => {
              await setToken(null);
              router.replace("/login");
            }}
          >
            <Ionicons
              name="log-out-outline"
              size={22}
              color={colors.tertiary}
            />
            <Text style={styles.logoutText}>Cerrar sesión</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>

      <DisclaimerModal
        visible={isDisclaimerVisible}
        onClose={() => setDisclaimerVisible(false)}
      />
    </View>
  );
}

// Componente reutilizable para las tarjetas de acción
const ActionCard = ({
  icon,
  title,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  onPress: () => void;
}) => (
  <Pressable style={styles.card} onPress={onPress}>
    <Ionicons name={icon} size={32} color={colors.primary} />
    <Text style={styles.cardTitle}>{title}</Text>
  </Pressable>
);

// --- Estilos para toda la pantalla ---
const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: colors.white,
  },
  gradientBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 500,
  },
  safeArea: {
    flex: 1,
    backgroundColor: "transparent",
  },
  container: {
    paddingVertical: 24,
  },
  centeredScreen: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.white,
    padding: 24,
  },
  header: {
    marginBottom: 24,
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
  },
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 24,
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    width: "48%",
    marginBottom: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  cardTitle: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: "600",
    color: colors.primary,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
    padding: 10,
  },
  logoutText: {
    marginLeft: 8,
    color: colors.tertiary,
    fontSize: 16,
  },
  errorText: {
    fontSize: 18,
    color: colors.error,
    textAlign: "center",
    marginBottom: 20,
  },
});