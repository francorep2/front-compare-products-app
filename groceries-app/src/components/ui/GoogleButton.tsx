import { useTheme } from "../../providers/theme";
import { Pressable, Text, View } from "react-native";

export function GoogleButton({ disabled = true }: { disabled?: boolean }) {
  const { colors, radii, spacing } = useTheme();
  return (
    <Pressable
      disabled={disabled}
      style={{
        opacity: disabled ? 0.6 : 1,
        borderWidth: 1, borderColor: colors.gray300,
        paddingVertical: spacing.sm, borderRadius: radii.md,
        alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 10,
        backgroundColor: colors.white
      }}
    >
      {/* “Logo” simple para ahora */}
      <View style={{ width: 18, height: 18, borderRadius: 4, backgroundColor: "#4285F4" }} />
      <Text style={{ color: colors.gray800, fontWeight: "600" }}>Continuá con Google</Text>
    </Pressable>
  );
}
