import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  View
} from "react-native";

// --- API y Componentes (sin cambios en las importaciones) ---
import type { MeOut } from "../../api/types";
import DisclaimerModal from "../../components/DisclaimerModal";
import FeaturedCarousel from "../../components/FeaturedCarousel";
import { Text } from "../../components/ui/Text";
import { colors } from "../../theme/colors";

// --- 1. DEFINIMOS LAS ACCIONES EN UNA LISTA ---
// Esto hace que sea muy fácil añadir o quitar botones en el futuro.
const actions = [
  {
    title: "Crear una nueva lista",
    description: "Empieza a armar tu próxima compra.",
    icon: "add-circle-outline" as keyof typeof Ionicons.glyphMap,
    route: "/new-list",
    type: "primary", // La marcamos como acción principal
  },
  {
    title: "Buscar productos",
    icon: "search-outline" as keyof typeof Ionicons.glyphMap,
    route: "/search",
    type: "secondary",
  },
  {
    title: "Mis compras",
    icon: "cart-outline" as keyof typeof Ionicons.glyphMap,
    route: "/purchases",
    type: "secondary",
  },
  {
    title: "Mi perfil",
    icon: "person-outline" as keyof typeof Ionicons.glyphMap,
    route: "/profile",
    type: "secondary",
  },
];


export default function Home() {
  const router = useRouter();
  const { showDisclaimer } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<MeOut | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDisclaimerVisible, setDisclaimerVisible] = useState(showDisclaimer === 'true');

  useEffect(() => { /* ... (sin cambios) */ }, []);
  if (loading) { /* ... (sin cambios) */ }
  if (error) { /* ... (sin cambios) */ }

  const primaryAction = actions.find(a => a.type === 'primary');
  const secondaryActions = actions.filter(a => a.type === 'secondary');

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

          {/* --- 2. RENDERIZAMOS LA ACCIÓN PRINCIPAL --- */}
          <View style={styles.section}>
            {primaryAction && (
              <Pressable style={styles.primaryActionCard} onPress={() => router.push(primaryAction.route)}>
                <Ionicons name={primaryAction.icon} size={28} color={colors.primary} />
                <View style={styles.primaryActionTextContainer}>
                  <Text style={styles.primaryActionTitle}>{primaryAction.title}</Text>
                  <Text style={styles.primaryActionDescription}>{primaryAction.description}</Text>
                </View>
                <Ionicons name="chevron-forward-outline" size={24} color={colors.primary} />
              </Pressable>
            )}
          </View>

          {/* --- 3. RENDERIZAMOS LA LISTA DE ACCIONES SECUNDARIAS --- */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Más opciones</Text>
            <View style={styles.secondaryActionsList}>
              {secondaryActions.map((action, index) => (
                <Pressable
                  key={action.route}
                  style={[
                    styles.secondaryActionItem,
                    index === secondaryActions.length - 1 && styles.secondaryActionItemLast // Sin borde inferior para el último
                  ]}
                  onPress={() => router.push(action.route)}
                >
                  <Ionicons name={action.icon} size={24} color={colors.tertiary} />
                  <Text style={styles.secondaryActionTitle}>{action.title}</Text>
                  <Ionicons name="chevron-forward-outline" size={22} color={colors.gray100} />
                </Pressable>
              ))}
            </View>
          </View>

          {/* Botón de Logout (sin cambios) */}
          <Pressable style={styles.logoutButton} onPress={async () => { /* ... */ }}>
            <Ionicons name="log-out-outline" size={22} color={colors.tertiary} />
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

// --- 4. ESTILOS COMPLETAMENTE NUEVOS PARA EL DISEÑO ---
const styles = StyleSheet.create({
  rootContainer: { flex: 1, backgroundColor: colors.white },
  gradientBackground: { position: "absolute", top: 0, left: 0, right: 0, height: 500 },
  safeArea: { flex: 1, backgroundColor: "transparent" },
  container: { paddingVertical: 24 },
  header: { marginBottom: 24, paddingHorizontal: 24 },
  title: { fontSize: 28, fontWeight: "bold" },
  section: {
    marginTop: 16,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.tertiary,
    marginBottom: 12,
  },
  // Estilos para la Tarjeta de Acción Principal
  primaryActionCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  primaryActionTextContainer: {
    flex: 1,
    marginLeft: 16,
  },
  primaryActionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
  },
  primaryActionDescription: {
    fontSize: 14,
    color: colors.tertiary,
    marginTop: 4,
  },
  // Estilos para la Lista de Acciones Secundarias
  secondaryActionsList: {
    backgroundColor: colors.white,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  secondaryActionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray50, // Un gris muy claro para el separador
  },
  secondaryActionItemLast: {
    borderBottomWidth: 0,
  },
  secondaryActionTitle: {
    flex: 1,
    marginLeft: 16,
    fontSize: 16,
    color: colors.tertiary,
    fontWeight: '500',
  },
  // Otros estilos
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 48,
    padding: 10,
  },
  logoutText: {
    marginLeft: 8,
    color: colors.tertiary,
    fontSize: 16,
  },
});