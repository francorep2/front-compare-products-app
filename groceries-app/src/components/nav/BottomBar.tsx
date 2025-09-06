import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const palette = {
  primary: "#FF1455",
  active:  "#FF1455",
  idle:    "#B7C0CD",
  bg:      "#FFFFFF",
};

const MARGIN_H = 12;
const BAR_HEIGHT = 66;
const FAB_SIZE = 62;
const CENTER_SPACE = FAB_SIZE + 18;
const PAD_H = 18;

const ROUTES = {
  newList: "new-list",
  search: "search",
  purchases: "purchases",
  profile: "profile",
} as const;

export default function BottomBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const currentName = state.routes[state.index]?.name;

  const go = (routeName: string) => navigation.navigate(routeName as never);
  const isActive = (routeName: string) => currentName === routeName;
  const goCenter = () => router.push("/home");

  const Item = ({
    routeName,
    iconActive,
    iconIdle,
    size = 28,
  }: {
    routeName: string;
    iconActive: keyof typeof Ionicons.glyphMap;
    iconIdle: keyof typeof Ionicons.glyphMap;
    size?: number;
  }) => {
    const active = isActive(routeName);
    return (
      <Pressable
        onPress={() => go(routeName)}
        style={{ padding: 10, alignItems: "center", justifyContent: "center" }}
        android_ripple={{ color: "#00000010", borderless: true }}
      >
        <Ionicons name={active ? iconActive : iconIdle} size={size} color={active ? palette.active : palette.idle} />
      </Pressable>
    );
  };

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        paddingBottom: Math.max(insets.bottom, 10),
      }}
    >
      {/* base sin sombra + borde superior hairline */}
      <View
        style={{
          height: BAR_HEIGHT,
          marginHorizontal: MARGIN_H,
          backgroundColor: palette.bg,
          borderRadius: 22,
          justifyContent: "center",
          overflow: "hidden",
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: "#E9EEF5",
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: PAD_H,
            justifyContent: "space-between",
          }}
        >
          {/* izquierda */}
          <View style={{ flex: 1, flexDirection: "row", justifyContent: "space-between", paddingRight: 8 }}>
            <Item routeName={ROUTES.newList} iconActive="add-circle" iconIdle="add-circle-outline" />
            <Item routeName={ROUTES.search}  iconActive="search"     iconIdle="search-outline" />
          </View>

          {/* espacio del FAB */}
          <View style={{ width: CENTER_SPACE }} />

          {/* derecha */}
          <View style={{ flex: 1, flexDirection: "row", justifyContent: "space-between", paddingLeft: 8 }}>
            <Item routeName={ROUTES.purchases} iconActive="cart"  iconIdle="cart-outline" />
            <Item routeName={ROUTES.profile}   iconActive="person" iconIdle="person-outline" />
          </View>
        </View>
      </View>

      {/* FAB mitad dentro / mitad fuera */}
      <Pressable
        onPress={goCenter}
        style={{
          position: "absolute",
          alignSelf: "center",
          bottom: Math.max(insets.bottom, 10) + BAR_HEIGHT - FAB_SIZE / 2,
          width: FAB_SIZE,
          height: FAB_SIZE,
          borderRadius: FAB_SIZE / 2,
          backgroundColor: palette.primary,
          alignItems: "center",
          justifyContent: "center",
          zIndex: 20,
        }}
        android_ripple={{ color: "#ffffff30", radius: FAB_SIZE / 2 }}
        accessibilityRole="button"
        accessibilityLabel="Inicio"
      >
        <MaterialCommunityIcons name="storefront-outline" size={30} color="#fff" />
      </Pressable>
    </View>
  );
}
