import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { ActivityIndicator, Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, View } from "react-native";

import DisclaimerModal from "../../components/DisclaimerModal";
import FeaturedCarousel from "../../components/FeaturedCarousel";
import { Text } from "../../components/ui/Text";
import { useAuth } from "../../providers/auth";
import { colors } from "../../theme/colors";

const actions = [
  {
    title: "Crear una nueva lista",
    description: "Empieza a armar tu próxima compra.",
    icon: "add-circle-outline" as keyof typeof Ionicons.glyphMap,
    route: "/new-list",
    type: "primary",
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
    title: "Cerrar sesión",
    icon: "log-out-outline" as keyof typeof Ionicons.glyphMap,
    route: "/login",
    type: "destructive",
  },
];

export default function Home() {
  const router = useRouter();
  
  // --- 1. OBTENEMOS TODO DEL CONTEXTO ---
  // Ya no necesitamos 'useState' ni 'useEffect' para el modal
  const { user, logout, isLoading, showDisclaimerOnLoad, clearDisclaimerFlag } = useAuth();
  
  const primaryAction = actions.find(a => a.type === 'primary');
  const secondaryActions = actions.filter(a => a.type === 'secondary' || a.type === 'destructive');

  const onLogout = () => {
    Alert.alert("Cerrar sesión", "¿Quieres salir de tu cuenta?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Cerrar sesión",
        style: "destructive",
        onPress: async () => {
          try {
            await logout();
            router.replace("/login");
          } catch (e) {
            console.error("Error al cerrar sesión:", e);
            router.replace("/login");
          }
        },
      },
    ]);
  };

  if (isLoading) {
    return (
      <View style={styles.centeredScreen}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.rootContainer}>
      <LinearGradient
        colors={[colors.primary, colors.white]}
        style={styles.gradientBackground}
      />
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.header}>
            <View>
              <Text style={[styles.title, { color: colors.white }]}>
                Bienvenido!
              </Text>
            </View>
            <Pressable style={styles.profileIconContainer} onPress={() => router.push('/profile')}>
                <Ionicons name="person-circle-outline" size={40} color={colors.white} />
            </Pressable>
          </View>
          
          <FeaturedCarousel />

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

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Más opciones</Text>
            <View style={styles.secondaryActionsList}>
              {secondaryActions.map((action, index) => {
                const isDestructive = action.type === 'destructive';
                return (
                  <Pressable
                    key={action.route}
                    style={[
                      styles.secondaryActionItem,
                      index === secondaryActions.length - 1 && styles.secondaryActionItemLast
                    ]}
                    onPress={isDestructive ? onLogout : () => router.push(action.route)}
                  >
                    <Ionicons name={action.icon} size={24} color={isDestructive ? colors.error : colors.tertiary} />
                    <Text style={[styles.secondaryActionTitle, isDestructive && styles.destructiveText]}>{action.title}</Text>
                    <Ionicons name="chevron-forward-outline" size={22} color={colors.gray100} />
                  </Pressable>
                )
              })}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* --- 2. EL MODAL AHORA SE CONTROLA DIRECTAMENTE DESDE EL AUTHPROVIDER --- */}
      <DisclaimerModal 
        visible={showDisclaimerOnLoad}
        onClose={clearDisclaimerFlag} 
      />
    </View>
  );
}
const styles = StyleSheet.create({
  rootContainer: { flex: 1, backgroundColor: colors.white },
  centeredScreen: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  gradientBackground: { position: "absolute", top: 0, left: 0, right: 0, height: 250 },
  safeArea: { flex: 1, backgroundColor: "transparent" },
  container: { paddingBottom: 48 },
  header: {
    paddingTop: 16,
    marginBottom: 24,
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: { fontSize: 28, fontWeight: "bold" },
  profileIconContainer: { padding: 4, },
  section: { marginTop: 24, paddingHorizontal: 24, },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: colors.tertiary, marginBottom: 12, },
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
  primaryActionTextContainer: { flex: 1, marginLeft: 16 },
  primaryActionTitle: { fontSize: 16, fontWeight: 'bold', color: colors.primary },
  primaryActionDescription: { fontSize: 14, color: colors.tertiary, marginTop: 4 },
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
    borderBottomColor: colors.gray50,
  },
  secondaryActionItemLast: { borderBottomWidth: 0 },
  secondaryActionTitle: {
    flex: 1,
    marginLeft: 16,
    fontSize: 16,
    color: colors.tertiary,
    fontWeight: '500',
  },
  destructiveText: { color: colors.error, },
});