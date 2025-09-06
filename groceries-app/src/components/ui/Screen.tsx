import { useHeaderHeight } from "@react-navigation/elements";
import { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View, ViewStyle } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
  children: ReactNode;
  /** Si tu pantalla es de formulario o tiene inputs, dejá scroll=true (default) */
  scroll?: boolean;
  /** Estilos del contenido (lo que hoy ponés en styles.container) */
  contentStyle?: ViewStyle;
  /** Margen extra abajo además del safe-area (px) */
  extraBottom?: number;
};

export default function Screen({ children, scroll = true, contentStyle, extraBottom = 16 }: Props) {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight(); // evita que el header tape contenido en iOS

  const Container = scroll ? ScrollView : View;
  const containerProps = scroll
    ? { 
        keyboardShouldPersistTaps: "handled", 
        keyboardDismissMode: "on-drag",
        showsVerticalScrollIndicator: false,
        bounces: true,
        contentContainerStyle: [{ flexGrow: 1 }, contentStyle, { paddingBottom: insets.bottom + extraBottom }] 
      }
    : { style: [contentStyle, { paddingBottom: insets.bottom + extraBottom, flex: 1 }] };

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? headerHeight : 0}
      >
        {/* @ts-ignore */}
        <Container {...containerProps}>{children}</Container>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
