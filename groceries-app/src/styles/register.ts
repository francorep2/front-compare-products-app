// styles/register.ts
import { StyleSheet } from "react-native";

/** Paleta del proyecto (APP-WS) */
export const colors = {
  primary: "#FD1648",
  secondary: "#FF1058",
  tertiary: "#4A5899",
  ok: "#75E809",
  warn: "#FFDD61",
  error: "#FF1010",
  white: "#FFFFFF",
  text: "#111111",
  gray600: "#777777",
  border: "#E5E5EA",
  field: "#F7F7F8",
};

export const spacing = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 24,
};

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white, padding: spacing.xl },
  title: { textAlign: "center", fontSize: 22, fontWeight: "800", color: colors.text, marginBottom: spacing.md },
  label: { fontSize: 12, color: colors.gray600, marginBottom: 6, marginTop: 6 },
  input: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.field,
    fontSize: 14,
    color: colors.text,
  },
  eye: { position: "absolute", right: 12, height: 44, justifyContent: "center", alignItems: "center" },
  btnPrimary: {
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  btnPrimaryText: { color: colors.white, fontWeight: "700" },
  errorText: { color: colors.error, marginTop: 6, fontSize: 12 },
});
