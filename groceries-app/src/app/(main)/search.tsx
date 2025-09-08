// app/(main)/search.tsx
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useHeaderHeight } from "@react-navigation/elements";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "../../components/ui/Text";
import { useTheme } from "../../providers/theme";

export default function SearchScreen() {
  const { colors, spacing, radii } = useTheme();
  const insets = useSafeAreaInsets();
  const headerH = useHeaderHeight();
  const [q, setQ] = useState("");

  const clear = () => setQ("");

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.white }} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? headerH : 0}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: spacing.md, paddingBottom: insets.bottom + 120 }}
        >
          {/* Título */}
          <Text style={{ fontSize: 30, fontWeight: "800", color: colors.secondary, marginBottom: spacing.sm }}>
            ¿Qué producto estás buscando?
          </Text>

          {/* Input de búsqueda */}
          <View
            style={{
              height: 48,
              borderRadius: radii.md,
              backgroundColor: "#FAFBFC",
              borderWidth: 1,
              borderColor: "#E9EEF5",
              paddingHorizontal: 12,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <Ionicons name="search-outline" size={20} color={colors.secondary} style={{ marginRight: 8 }} />
            <TextInput
              value={q}
              onChangeText={(t) => setQ(t)}
              placeholder="Coca cola 500ml"
              returnKeyType="search"
              style={{ flex: 1, paddingVertical: 0, fontSize: 16 }}
            />
            {q ? (
              <Pressable onPress={clear} hitSlop={10} accessibilityLabel="Limpiar búsqueda">
                <Ionicons name="close-circle" size={18} color={colors.gray400} />
              </Pressable>
            ) : null}
          </View>

          {/* Acción: escanear código de barras */}
          <Pressable
            onPress={() => {/* TODO: navegar a scanner */}}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              paddingVertical: spacing.md,
            }}
          >
            <MaterialCommunityIcons name="barcode-scan" size={22} color={colors.tertiary} />
            <Text style={{ color: colors.tertiary, fontWeight: "700" }}>
              Escaneá el código de barras
            </Text>
          </Pressable>
          
          <View style={{ height: 1, backgroundColor: "#E9EEF5", opacity: 0.7, marginBottom: spacing.md }} />
          

          {/* (Por ahora sin resultados) */}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
