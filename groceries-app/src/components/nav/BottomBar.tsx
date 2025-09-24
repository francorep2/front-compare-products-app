import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, { useAnimatedStyle, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Paleta de colores centralizada para un estilo consistente.
const colors = {
  primary: "#FF1455",
  white: "#FFFFFF",
  black: "#000000",
  gray100: "#B7C0CD",
};

// Constantes de diseño
const BAR_HEIGHT = 68;

// Rutas, incluyendo 'home' para el botón central.
const ROUTES = {
  newList: "new-list",
  search: "search",
  home: "home",
  purchases: "purchases",
  profile: "profile",
} as const;


/**
 * Componente de ícono individual para la barra de navegación.
 * Incluye animación para el estado activo/inactivo.
 */
const AnimatedTabBarItem = ({
  routeName,
  iconActive,
  iconIdle,
  iconComponent: IconComponent = Ionicons,
  isActive,
  onPress,
}: {
  routeName: string;
  iconActive: string;
  iconIdle: string;
  iconComponent?: typeof Ionicons | typeof MaterialCommunityIcons;
  isActive: boolean;
  onPress: (routeName: string) => void;
}) => {
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: withTiming(isActive ? 1.2 : 1, { duration: 200 }) }],
      opacity: withTiming(isActive ? 1 : 0.7, { duration: 200 }),
    };
  });

  return (
    <Pressable
      onPress={() => onPress(routeName)}
      style={styles.itemContainer}
      android_ripple={{ color: `${colors.primary}20`, borderless: true }}
    >
      <Animated.View style={animatedStyle}>
        <IconComponent
          name={isActive ? iconActive : iconIdle}
          size={28}
          color={isActive ? colors.white : colors.white}
        />
      </Animated.View>
    </Pressable>
  );
};


/**
 * Barra de navegación inferior principal, rediseñada para ser moderna y funcional.
 */
export default function BottomBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const currentName = state.routes[state.index]?.name;

  const go = (routeName: string) => {
    if (routeName === "home") {
      router.push("/home"); // Navegación específica para Expo Router
    } else {
      navigation.navigate(routeName as never);
    }
  };
  const isActive = (routeName: string) => currentName === routeName;
  
  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <View style={styles.bar}>
        <AnimatedTabBarItem
          routeName={ROUTES.newList}
          iconActive="add-circle"
          iconIdle="add-circle-outline"
          isActive={isActive(ROUTES.newList)}
          onPress={go}
        />
        <AnimatedTabBarItem
          routeName={ROUTES.search}
          iconActive="search"
          iconIdle="search-outline"
          isActive={isActive(ROUTES.search)}
          onPress={go}
        />
        <AnimatedTabBarItem
          routeName={ROUTES.home}
          iconActive="storefront"
          iconIdle="storefront-outline"
          iconComponent={MaterialCommunityIcons}
          isActive={isActive(ROUTES.home)}
          onPress={go}
        />
        <AnimatedTabBarItem
          routeName={ROUTES.purchases}
          iconActive="cart"
          iconIdle="cart-outline"
          isActive={isActive(ROUTES.purchases)}
          onPress={go}
        />
        <AnimatedTabBarItem
          routeName={ROUTES.profile}
          iconActive="person"
          iconIdle="person-outline"
          isActive={isActive(ROUTES.profile)}
          onPress={go}
        />
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
  },
  bar: {
    height: BAR_HEIGHT,
    backgroundColor: colors.primary,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",

    // --- CONFIGURACIÓN DE LA SOMBRA SUPERIOR ---

    // Sombra para iOS
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: -4 }, 
    shadowOpacity: 0.08,                  
    shadowRadius: 8,                      
    
    // Sombra para Android
    elevation: 10,                          
    borderTopWidth: 1,                     
    borderTopColor: "#00000010",          
  },
  itemContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
  },
});