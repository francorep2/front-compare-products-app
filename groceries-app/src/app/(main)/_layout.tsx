import { Tabs } from "expo-router";
import BottomBar from "../../components/nav/BottomBar";

export default function MainTabs() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(p) => <BottomBar {...p} />}>
      <Tabs.Screen name="new-list"  options={{ title: "Nueva Lista" }} />
      <Tabs.Screen name="search"    options={{ title: "Buscar" }} />
      <Tabs.Screen name="home" options={{ href: null }} />
      <Tabs.Screen name="purchases" options={{ title: "Mis Compras" }} />
      <Tabs.Screen name="profile"   options={{ title: "Perfil" }} />
    </Tabs>
  );
}
