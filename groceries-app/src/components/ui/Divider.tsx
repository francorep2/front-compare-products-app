import { Text, View } from "react-native";
import { useTheme } from "../../providers/theme";

export function Divider({ text }: { text?: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      <View style={{ flex: 1, height: 1, backgroundColor: colors.gray300 }} />
      {text ? <Text style={{ color: colors.gray600 }}>{text}</Text> : null}
      <View style={{ flex: 1, height: 1, backgroundColor: colors.gray300 }} />
    </View>
  );
}
