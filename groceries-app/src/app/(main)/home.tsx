import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, Dimensions, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import Svg, { Defs, Path, Stop, LinearGradient as SvgGradient } from "react-native-svg";

import DisclaimerModal from "../../components/DisclaimerModal";
import FeaturedCarousel from "../../components/FeaturedCarousel";
import SupportModal from "../../components/SupportModal";
import { useAuth } from "../../providers/auth";
import { useTheme } from "../../providers/theme";

// Componente para el fondo de ola, definido fuera del componente principal para estabilidad.
const WaveBackground = () => {
  const { colors } = useTheme();
  const { width } = Dimensions.get('window');
  const height = 220;
  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height }}>
      <Svg height="100%" width="100%" viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          <SvgGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={colors.primary} stopOpacity="1" />
            <Stop offset="100%" stopColor={colors.secondary} stopOpacity="1" />
          </SvgGradient>
        </Defs>
        <Path fill="url(#grad)" d={`M0,0 L0,${height * 0.7} Q${width / 2},${height * 1.2} ${width},${height * 0.7} L${width},0 Z`} />
      </Svg>
    </View>
  );
};

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
];

export default function Home() {
  const router = useRouter();
  const { colors, spacing } = useTheme();
  const { user, logout, isLoading, showDisclaimerOnLoad, clearDisclaimerFlag } = useAuth();
  
  const [isSupportModalVisible, setSupportModalVisible] = useState(false);

  const primaryAction = actions.find(a => a.type === 'primary');
  const secondaryActions = actions.filter(a => a.type === 'secondary');

  const onLogout = () => {
    Alert.alert("Cerrar sesión", "¿Quieres salir de tu cuenta?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Cerrar sesión",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/login");
        },
      },
    ]);
  };

  if (isLoading) {
    return (
      <View style={[styles.centeredScreen, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }
  
  if (!user) {
     return (
      <View style={[styles.centeredScreen, { backgroundColor: colors.background }]}>
        <Text>Redirigiendo al login...</Text>
        <ActivityIndicator style={{ marginTop: 16 }} size="small" />
      </View>
    );
  }

  return (
    <View style={[styles.rootContainer, { backgroundColor: colors.background }]}>
      <WaveBackground />
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.container}>
          
          <Animated.View entering={FadeInUp.duration(600)}>
            <View style={styles.header}>
              <View>
                <Text style={styles.title}>
                  Hola, {user.first_name || 'de nuevo'}!
                </Text>
              </View>
              <Pressable style={styles.profileIconContainer} onPress={() => router.push('/profile')}>
                  <Ionicons name="person-circle-outline" size={44} color={colors.white} />
              </Pressable>
            </View>
            <FeaturedCarousel />
          </Animated.View>
          
          <Animated.View entering={FadeInUp.duration(600).delay(200)} style={[styles.section, { paddingHorizontal: spacing.md }]}>
            {primaryAction && (
              <Pressable style={[styles.card, styles.primaryActionCard]} onPress={() => router.push(primaryAction.route)}>
                <Ionicons name={primaryAction.icon} size={28} color={colors.primary} />
                <View style={styles.primaryActionTextContainer}>
                  <Text style={[styles.primaryActionTitle, { color: colors.primary }]}>{primaryAction.title}</Text>
                  <Text style={[styles.primaryActionDescription, { color: colors.gray500 }]}>{primaryAction.description}</Text>
                </View>
                <Ionicons name="chevron-forward-outline" size={24} color={colors.primary} />
              </Pressable>
            )}
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(600).delay(300)} style={[styles.section, { paddingHorizontal: spacing.md }]}>
            <Pressable 
              style={[styles.card, styles.supportButton, { backgroundColor: colors.secondary }]} 
              onPress={() => setSupportModalVisible(true)}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={22} color={colors.white} />
              <Text style={styles.supportButtonText}>¿Viste un error? ¡Repórtalo!</Text>
            </Pressable>
          </Animated.View>
          
          <Animated.View entering={FadeInUp.duration(600).delay(400)} style={[styles.section, { paddingHorizontal: spacing.md }]}>
            <Text style={[styles.sectionTitle, { color: colors.secondary }]}>Más opciones</Text>
            <View style={[styles.card, styles.secondaryActionsList]}>
              {secondaryActions.map((action, index) => (
                <Pressable
                  key={action.route}
                  style={[
                    styles.secondaryActionItem,
                    { borderBottomColor: colors.border },
                    index === secondaryActions.length - 1 && { borderBottomWidth: 0 }
                  ]}
                  onPress={() => router.push(action.route)}
                >
                  <Ionicons name={action.icon} size={24} color={colors.tertiary} />
                  <Text style={[styles.secondaryActionTitle, { color: colors.gray600 }]}>{action.title}</Text>
                  <Ionicons name="chevron-forward-outline" size={22} color={colors.gray200} />
                </Pressable>
              ))}
            </View>
          </Animated.View>

          <Pressable style={styles.logoutButton} onPress={onLogout}>
              <Ionicons name="log-out-outline" size={22} color={colors.error} />
              <Text style={[styles.logoutButtonText, { color: colors.error }]}>Cerrar sesión</Text>
          </Pressable>

        </ScrollView>
      </SafeAreaView>

      <DisclaimerModal 
        visible={showDisclaimerOnLoad}
        onClose={clearDisclaimerFlag} 
      />
      <SupportModal
        visible={isSupportModalVisible}
        onClose={() => setSupportModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: { flex: 1 },
  centeredScreen: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  safeArea: { flex: 1 },
  container: { paddingBottom: 48 },
  header: {
    paddingTop: 40,
    paddingBottom: 24,
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: 'white',
  },
  profileIconContainer: { padding: 4 },
  section: { 
    marginTop: 8,
    marginBottom: 8,
  },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12 },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 5,
  },
  primaryActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  primaryActionTextContainer: { flex: 1, marginLeft: 16 },
  primaryActionTitle: { fontSize: 16, fontWeight: 'bold' },
  primaryActionDescription: { fontSize: 14, marginTop: 4 },
  supportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  supportButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 12,
  },
  secondaryActionsList: {
    padding: 0,
  },
  secondaryActionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  secondaryActionTitle: {
    flex: 1,
    marginLeft: 16,
    fontSize: 16,
    fontWeight: '500',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    padding: 10,
    opacity: 0.8,
  },
  logoutButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
  },
});