// styles/verify.ts
import { StyleSheet } from "react-native";

export const colors = {
  primary: "#FD1648",
  secondary: "#FF1058",
  tertiary: "#4A5899",
  error: "#FF1010",
  text: "#111111",
  gray600: "#777777",
  border: "#E5E5EA",
  field: "#F7F7F8",
  white: "#FFFFFF",
};

export const spacing = { xs: 6, sm: 10, md: 14, lg: 20, xl: 24 };

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white, padding: spacing.xl, justifyContent: "center" },
  title: { textAlign: "center", fontSize: 22, fontWeight: "800", color: colors.primary, marginBottom: spacing.sm },
  subtitle: { textAlign: "center", color: colors.gray600, marginBottom: 4 },
  email: { textAlign: "center", color: colors.secondary, fontWeight: "700", marginBottom: spacing.md },
  otpRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.md },
  otpBox: {
    width: 52, height: 52, borderRadius: 12, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.field, textAlign: "center", fontSize: 20, letterSpacing: 2, color: colors.text,
  },
  btn: {
    height: 44, borderRadius: 12, backgroundColor: colors.primary,
    alignItems: "center", justifyContent: "center",
  },
  btnText: { color: colors.white, fontWeight: "700" },
  resend: { textAlign: "center", color: colors.tertiary, fontWeight: "700", marginTop: spacing.sm },
  disabledResend: { opacity: 0.5 },
});
