import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

import { getToken, setToken } from "../../api/clients";
import { me } from "../../api/endpoints";
import type { MeOut } from "../../api/types";
import { Button } from "../../components/ui/Button";
import { Text } from "../../components/ui/Text";
import { styles } from "../../styles/home";


export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<MeOut | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken(); 
        if (!token) {
          router.replace("/login");
          return;
        }
        const data = await me(); 
        setUser(data);
      } catch (e: any) {
        setError("No se pudo cargar el usuario");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <Button title="Volver a login" onPress={() => router.replace("/login")} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bienvenido 👋</Text>
      <Text style={styles.email}>{user?.email}</Text>

      <View style={{ height: 16 }} />
      <Button
        title="Cerrar sesión"
        onPress={async () => {
          await setToken(null);           // 👈 borra "access_token" de forma consistente
          router.replace("/login");
        }}
      />
    </View>
  );
}