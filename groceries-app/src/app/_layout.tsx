import { Stack } from "expo-router";

import { AuthProvider } from "../providers/auth";
import { QueryProvider } from "../providers/query";
import { ThemeProvider } from "../providers/theme";

export default function RootLayout() {
  return (
    <QueryProvider>
      <ThemeProvider>
        <AuthProvider>
          <Stack screenOptions={{ headerShown: false }} />
        </AuthProvider>
      </ThemeProvider>
    </QueryProvider>
  );
}
