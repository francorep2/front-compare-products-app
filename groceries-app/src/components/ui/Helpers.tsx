import { View } from "react-native";

export function CheckBadge() {
  return (
    <View style={{
      width: 22, height: 22, borderRadius: 11,
      backgroundColor: "#FF1058", alignItems: "center", justifyContent: "center"
    }}>
      <View style={{ width: 10, height: 5, borderLeftWidth: 2, borderBottomWidth: 2, borderColor: "white", transform: [{ rotate: "-45deg" }] }} />
    </View>
  );
}

export function ErrorBadge() {
  return (
    <View style={{
      width: 22, height: 22, borderRadius: 11,
      backgroundColor: "#FF1010", alignItems: "center", justifyContent: "center"
    }}>
      <View style={{ width: 10, height: 2, backgroundColor: "white", transform: [{ rotate: "45deg" }] }} />
      <View style={{ width: 10, height: 2, backgroundColor: "white", transform: [{ rotate: "-45deg" }], position: "absolute" }} />
    </View>
  );
}