// src/app/pages/_layout.tsx
import { Redirect, Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { Animated, StyleSheet } from "react-native";

import { AuthProvider, useAuth } from "../../providers/auth";
import { QueryProvider } from "../../providers/query";
import { ThemeProvider } from "../../providers/theme";

SplashScreen.preventAutoHideAsync();

function SplashFade({ onDone }: { onDone: () => void }) {
  const [opacity] = useState(new Animated.Value(1));

  useEffect(() => {
    Animated.timing(opacity, { toValue: 0, duration: 600, useNativeDriver: true })
      .start(async () => {
        await SplashScreen.hideAsync();
        onDone();
      });
  }, []);

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        { backgroundColor: "#FD1648", opacity, alignItems: "center", justifyContent: "center" }
      ]}
    >
      <Animated.Image
        source={require("../../../assets/logo.jpg")}
        style={{ width: 140, height: 140, resizeMode: "contain", opacity }}
      />
    </Animated.View>
  );
}

function Gate() {
  const { loading, user } = useAuth();
  const [faded, setFaded] = useState(false);

  // Esperamos a que AuthProvider termine (token + /auth/me)
  if (loading) return null;

  // Hacemos fade del splash; cuando termina, mostramos el router con Redirect
  if (!faded) return <SplashFade onDone={() => setFaded(true)} />;

  // 👉 Por ahora solo tenés /auth/login. Cuando agregues la home de app, cambiamos esto.
  if (!user) return <Redirect href="/auth/login" />;

  // TODO: cuando tengas listas, actualizá a "/app/lists" o la que definas
  return <Redirect href="/auth/login" />;
}

export default function RootLayout() {
  return (
    <QueryProvider>
      <ThemeProvider>
        <AuthProvider>
          <Stack screenOptions={{ headerShown: false }} />
          <Gate />
        </AuthProvider>
      </ThemeProvider>
    </QueryProvider>
  );
}
