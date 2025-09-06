// app/(main)/new-list.tsx
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useHeaderHeight } from "@react-navigation/elements";
import { useFocusEffect } from "@react-navigation/native";
import React, { useMemo, useRef, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { addItem, createShoppingList } from "../../api/endpoints";
import { useTheme } from "../../providers/theme";

type Item = { product: string; qty: string };

function formatToday() {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = d.getFullYear();
  return `${dd}-${mm}-${yy}`;
}

// —— tamaños compactos
const UI = {
  inputH: 36,
  pillRadius: 999,
  gap: 8,
  font: 14,
  title: 20,
  plusSize: 44,
};

export default function NewListScreen() {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const headerH = useHeaderHeight();

  const [title, setTitle] = useState("Mi lista!");
  const [editingTitle, setEditingTitle] = useState(false);
  const [items, setItems] = useState<Item[]>([]);

  const productRefs = useRef<Array<TextInput | null>>([]);
  const qtyRefs = useRef<Array<TextInput | null>>([]);

  const dateText = useMemo(() => formatToday(), []);
  const canSave = items.some((it) => it.product.trim().length > 0); // ✅ al menos 1 producto

  const resetForm = () => {
    setTitle("Mi lista!");
    setEditingTitle(false);
    setItems([]);
    productRefs.current = [];
    qtyRefs.current = [];
  };

  // siempre empieza vacío al entrar
  useFocusEffect(
    React.useCallback(() => {
      resetForm();
      return () => {};
    }, [])
  );

  const addRow = () => {
    setItems((prev) => {
      const next = [...prev, { product: "", qty: "" }];
      requestAnimationFrame(() => productRefs.current[next.length - 1]?.focus());
      return next;
    });
  };

  const updateItem = (idx: number, patch: Partial<Item>) => {
    setItems((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...patch };
      return next;
    });
  };

  const clearField = (idx: number, field: keyof Item) => {
    updateItem(idx, { [field]: "" } as Partial<Item>);
    if (field === "product") productRefs.current[idx]?.focus();
    if (field === "qty") qtyRefs.current[idx]?.focus();
  };

  const removeRow = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx));

  const onSave = async () => {
    // doble guardia por si acaso
    if (!canSave) return;

    const nombre = title.trim() || "Mi lista!";

    // Solo productos no vacíos; cantidad por defecto = "1"
    const clean = items
      .map((it) => ({
        nombre: it.product.trim(),
        cantidad: (it.qty.trim() || "1"),
      }))
      .filter((it) => it.nombre.length > 0);

    if (clean.length === 0) {
      Alert.alert("Sin productos", "Agregá al menos un producto.");
      return;
    }

    try {
      const list = await createShoppingList({ nombre });
      for (const it of clean) await addItem(list.id, it);

      resetForm();
      Alert.alert("Guardado", "La lista se guardó correctamente.");
    } catch (e: any) {
      const msg = e?.data?.detail || e?.data?.message || e?.message || "No se pudo guardar la lista.";
      Alert.alert("Error", String(msg));
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.white }} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.select({ ios: "padding", android: "height" })}
        keyboardVerticalOffset={Platform.OS === "ios" ? headerH : 0}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: spacing.md, paddingBottom: insets.bottom + 140 }}
        >
          {/* Header: botón guardar (derecha) + título centrado + editor */}
          <View style={{ position: "relative", minHeight: 34, marginBottom: spacing.xs }}>
            {/* botón guardar arriba a la derecha */}
            <Pressable
              onPress={onSave}
              disabled={!canSave}
              style={{
                position: "absolute",
                right: 0,
                top: 0,
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: "#22C55E",
                alignItems: "center",
                justifyContent: "center",
                opacity: canSave ? 1 : 0.5, // opaco si no se puede guardar
              }}
              android_ripple={{ color: "#ffffff30", radius: 20 }}
            >
              <MaterialCommunityIcons name="content-save" size={18} color="#fff" />
            </Pressable>

            {/* Título centrado + lápiz */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
              {editingTitle ? (
                <TextInput
                  value={title}
                  onChangeText={setTitle}
                  onBlur={() => setEditingTitle(false)}
                  autoFocus
                  style={{
                    fontSize: UI.title,
                    fontWeight: "800",
                    color: colors.secondary,
                    textAlign: "center",
                    paddingVertical: 2,
                  }}
                />
              ) : (
                <Text style={{ fontSize: UI.title, fontWeight: "800", color: colors.secondary, textAlign: "center" }}>
                  {title}
                </Text>
              )}
              <Pressable onPress={() => setEditingTitle((s) => !s)} hitSlop={12} style={{ marginLeft: 6 }}>
                <Ionicons name="create-outline" size={18} color={colors.secondary} />
              </Pressable>
            </View>
          </View>

          {/* Fecha */}
          <Text style={{ textAlign: "center", color: colors.secondary, marginTop: 2, marginBottom: spacing.sm, fontSize: 12 }}>
            Fecha ({dateText})
          </Text>

          <View style={{ height: 1, backgroundColor: "#E9EEF5", marginBottom: UI.gap }} />

          {/* Ítems (compactos) */}
            <View style={{ gap: UI.gap }}>
            {items.map((it, i) => (
                <View key={i} style={{ gap: 6 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    {/* Producto */}
                    <View
                    style={{
                        flex: 1,
                        height: UI.inputH,
                        backgroundColor: "#FAFBFC",
                        borderWidth: 1,
                        borderColor: "#E9EEF5",
                        borderRadius: UI.pillRadius,
                        paddingHorizontal: 10,
                        flexDirection: "row",
                        alignItems: "center",
                    }}
                    >
                    <TextInput
                        ref={(r) => (productRefs.current[i] = r)}
                        placeholder="Producto"
                        value={it.product}
                        onChangeText={(v) => updateItem(i, { product: v })}
                        style={{ flex: 1, paddingVertical: 0, fontSize: UI.font }}
                    />
                    {/* x solo para limpiar el producto */}
                    {it.product ? (
                        <Pressable onPress={() => clearField(i, "product")} hitSlop={8}>
                        <Ionicons name="close" size={14} color="#9AA3AF" />
                        </Pressable>
                    ) : null}
                    </View>

                    {/* Cantidad (sin x interna; por defecto 1 al guardar) */}
                    <View
                    style={{
                        width: 96,
                        height: UI.inputH,
                        backgroundColor: "#FAFBFC",
                        borderWidth: 1,
                        borderColor: "#E9EEF5",
                        borderRadius: UI.pillRadius,
                        paddingHorizontal: 10,
                        flexDirection: "row",
                        alignItems: "center",
                    }}
                    >
                    <TextInput
                        ref={(r) => (qtyRefs.current[i] = r)}
                        placeholder="Cant."
                        value={it.qty}
                        onChangeText={(v) => updateItem(i, { qty: v })}
                        keyboardType="numeric"
                        style={{ flex: 1, paddingVertical: 0, textAlign: "center", fontSize: UI.font }}
                    />
                    </View>

                    {/* ❌ Eliminar fila (cruz a la derecha del input de cantidad) */}
                    <Pressable
                    onPress={() => removeRow(i)}
                    hitSlop={8}
                    style={{ width: 36, height: 36, alignItems: "center", justifyContent: "center" }}
                    >
                    <Ionicons name="close" size={20} color={colors.tertiary} />
                    {/* Si preferís un círculo: <Ionicons name="close-circle-outline" size={22} color="#9AA3AF" /> */}
                    </Pressable>
                </View>

                {/* Divider */}
                <View style={{ height: 1, backgroundColor: "#E9EEF5" }} />
                </View>
                ))}
            </View>


          {/* Botón + (agregar ítem) */}
          <View style={{ alignItems: "center", marginVertical: spacing.md }}>
            <Pressable
              onPress={addRow}
              style={{
                width: UI.plusSize,
                height: UI.plusSize,
                borderRadius: UI.plusSize / 2,
                backgroundColor: colors.primary,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="add" size={24} color="#fff" />
            </Pressable>
          </View>

          {/* Se quitó el botón Guardar inferior (ahora es icono arriba a la derecha) */}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
