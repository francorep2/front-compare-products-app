import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, { useAnimatedStyle, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../../theme/colors";

const BAR_HEIGHT = 68;
const ROUTES = {
  newList: "new-list",
  search: "search",
  home: "home",
  purchases: "purchases",
  profile: "profile",
} as const;


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
          color={isActive ? colors.primary : colors.noActiveBottomBarIcon}
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
    backgroundColor: colors.white,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",


  },
  itemContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
  },
});