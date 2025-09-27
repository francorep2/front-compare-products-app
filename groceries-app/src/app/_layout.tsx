import { Slot, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { AuthProvider, useAuth } from "../providers/auth";
import { QueryProvider } from "../providers/query";
import { ThemeProvider } from "../providers/theme";

function RootLayoutNav() {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const inAuthGroup = segments[0] === "(auth)";
    
    // Solo redirige si la carga ha terminado
    if (!isLoading) {
      if (!user && !inAuthGroup) {
        router.replace("/login");
      } else if (user && inAuthGroup) {
        router.replace("/home");
      }
    }
  }, [user, isLoading, segments]);
  
  // Muestra un spinner mientras se verifica la sesión, esto evita el bucle
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // Muestra la pantalla correspondiente
  return <Slot />;
}

export default function RootLayout() {
  return (
    // 1. AuthProvider envuelve todo
    <AuthProvider>
      <ThemeProvider>
        <QueryProvider>
          {/* 2. RootLayoutNav consume el contexto y decide qué hacer */}
          <RootLayoutNav />
        </QueryProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}