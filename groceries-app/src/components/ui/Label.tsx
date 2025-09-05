import { useTheme } from "../../providers/theme";
import { Text, TextProps } from "react-native";

export function Label(props: TextProps) {
  const { colors } = useTheme();
  return (
    <Text {...props} style={[{ color: colors.gray700, fontWeight: "600" }, props.style]} />
  );
}
