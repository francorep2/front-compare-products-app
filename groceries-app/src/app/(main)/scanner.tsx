import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { Text } from "../../components/ui/Text";

export default function ScannerScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(true);
  const lastCodeRef = useRef<string | null>(null);

  useEffect(() => {
    if (!permission) {
      requestPermission();
    }
  }, [permission]);

  const onBarCodeScanned = async ({ data }: { data: string }) => {
    if (!scanning) return;
    if (lastCodeRef.current === data) return;

    lastCodeRef.current = data;
    setScanning(false);

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    router.replace({ pathname: "/(main)/search", params: { scanned: data } });
  };

  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={{ marginTop: 12 }}>Solicitando permiso de cámara…</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text>No hay permiso de cámara. Activala en ajustes.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Pressable
        onPress={() => router.back()}
        style={{ position: "absolute", top: 50, left: 20, zIndex: 2, backgroundColor: "rgba(0,0,0,0.35)", padding: 10, borderRadius: 999 }}
      >
        <Ionicons name="close" size={22} color="#fff" />
      </Pressable>

      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ["ean13", "ean8", "qr"],
        }}
        onBarcodeScanned={onBarCodeScanned}
      />

      <View style={styles.overlay}>
        <View style={styles.frame} />
        <Text style={{ color: "#fff", marginTop: 16 }}>Alineá el código dentro del marco</Text>
      </View>
    </View>
  );
}

const FRAME_SIZE = 260;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  frame: {
    width: FRAME_SIZE,
    height: FRAME_SIZE,
    borderColor: "rgba(255,255,255,0.6)",
    borderWidth: 2,
    borderRadius: 16,
  },
});
