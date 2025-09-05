import { ReactNode } from "react";
import { View, ViewProps } from "react-native";
import { useTheme } from "../../providers/theme";
import { Label } from "./Label";

export function FormField({
  label,
  children,
  rightAdornment,
  containerProps,
}: {
  label: string;
  children: ReactNode;
  rightAdornment?: ReactNode;
  containerProps?: ViewProps;
}) {
  const { spacing } = useTheme();
  return (
    <View style={{ marginBottom: spacing.md }} {...containerProps}>
      <Label style={{ marginBottom: 6 }}>{label}</Label>
      <View style={{ position: "relative" }}>
        {children}
        {rightAdornment ? (
          <View style={{ position: "absolute", right: 10, top: 10 }}>{rightAdornment}</View>
        ) : null}
      </View>
    </View>
  );
}
