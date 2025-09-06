// app/(main)/list/[id].tsx
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Pressable,
    RefreshControl,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import {
    deleteItem as apiDeleteItem,
    deleteList as apiDeleteList,
    renameList as apiRenameList,
    updateItem as apiUpdateItem,
    getListDetail,
} from "../../../api/endpoints";
import type { ShoppingItemOut } from "../../../api/types";
import { Text } from "../../../components/ui/Text";
import { useTheme } from "../../../providers/theme";

type Row = ShoppingItemOut & {
  _checked: boolean;       // checklist local
  _nombre: string;         // edición local
  _cantidad: string;       // edición local
  _saving?: boolean;       // guardando
  _deleting?: boolean;     // borrando
};

export default function ListDetailScreen() {
  const { colors, spacing, radii } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [listName, setListName] = React.useState<string>("Lista");
  const [editingName, setEditingName] = React.useState(false);
  const [createdAt, setCreatedAt] = React.useState<string | undefined>(undefined);

  const [rows, setRows] = React.useState<Row[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const listId = Number(id);

  const load = async () => {
    if (!listId) return;
    try {
      setError(null);
      const detail = await getListDetail(listId);
      setListName(detail.nombre);
      setCreatedAt(detail.created_at);
      setRows(
        detail.items.map((i) => ({
          ...i,
          _checked: i.done,
          _nombre: i.nombre,
          _cantidad: i.cantidad,
        }))
      );
    } catch (e: any) {
      setError(e?.data?.detail || e?.message || "No se pudo cargar la lista.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      setLoading(true);
      load();
    }, [listId])
  );

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  // ----- List header actions -----
  const confirmDeleteList = () => {
    Alert.alert("Eliminar lista", "¿Querés borrar esta lista y todos sus productos?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          try {
            await apiDeleteList(listId);
            router.back(); // volver a purchases
          } catch (e: any) {
            Alert.alert("Error", e?.data?.detail || e?.message || "No se pudo eliminar la lista.");
          }
        },
      },
    ]);
  };

  const onEndEditListName = async () => {
    setEditingName(false);
    const nombre = listName.trim();
    if (!nombre) {
      Alert.alert("Nombre inválido", "La lista debe tener un nombre.");
      return;
    }
    try {
      const out = await apiRenameList(listId, { nombre });
      setListName(out.nombre);
    } catch (e: any) {
      Alert.alert("Error", e?.data?.detail || e?.message || "No se pudo renombrar la lista.");
    }
  };

  // ----- Row helpers -----
  const setRow = (idx: number, patch: Partial<Row>) =>
    setRows((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...patch };
      return next;
    });

    const toggleChecked = async (idx: number) => {
        const r = rows[idx];
        const next = !r._checked;
      
        // Optimista
        setRow(idx, { _checked: next, done: next, _saving: true });
      
        try {
          const updated = await apiUpdateItem(r.id, { done: next }); // <- manda false también
          setRow(idx, { done: updated.done, _checked: updated.done, _saving: false });
        } catch (e: any) {
          setRow(idx, { _checked: !next, done: !next, _saving: false });
          Alert.alert("Error", e?.data?.detail || e?.message || "No se pudo actualizar el estado.");
        }
      };
      

  const onChangeNombre = (idx: number, v: string) => setRow(idx, { _nombre: v });
  const onChangeCantidad = (idx: number, v: string) => setRow(idx, { _cantidad: v });

  const saveRowIfChanged = async (idx: number) => {
    const r = rows[idx];
    const patch: { nombre?: string; cantidad?: string | null } = {};
    if (r._nombre.trim() !== r.nombre) patch.nombre = r._nombre.trim();
    if (r._cantidad.trim() !== r.cantidad) patch.cantidad = r._cantidad.trim() || "1"; // default 1
  
    if (!patch.nombre && !patch.cantidad) return;
  
    try {
      setRow(idx, { _saving: true });
      const updated = await apiUpdateItem(r.id, patch);
      setRow(idx, {
        nombre: updated.nombre,
        cantidad: updated.cantidad,
        done: updated.done,          
        _nombre: updated.nombre,
        _cantidad: updated.cantidad,
        _checked: updated.done,      
        _saving: false,
      });
    } catch (e: any) {
      setRow(idx, { _saving: false });
      Alert.alert("Error", e?.data?.detail || e?.message || "No se pudo guardar el producto.");
    }
  };

  const confirmDeleteRow = (idx: number) => {
    const r = rows[idx];
    Alert.alert("Eliminar producto", `¿Querés borrar "${r.nombre}"?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          try {
            setRow(idx, { _deleting: true });
            await apiDeleteItem(r.id);
            setRows((prev) => prev.filter((x) => x.id !== r.id));
          } catch (e: any) {
            setRow(idx, { _deleting: false });
            Alert.alert("Error", e?.data?.detail || e?.message || "No se pudo eliminar el producto.");
          }
        },
      },
    ]);
  };

  const renderItem = ({ item, index }: { item: Row; index: number }) => (
    <View
      style={{
        paddingVertical: 8,
        paddingHorizontal: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: "#E9EEF5",
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
      }}
    >
      {/* Checklist local */}
      <Pressable onPress={() => toggleChecked(index)} hitSlop={10}>
        <Ionicons
          name={item._checked ? "checkbox-outline" : "square-outline"}
          size={22}
          color={item._checked ? colors.primary : colors.gray500}
        />
      </Pressable>

      {/* Nombre (editable) */}
      <View style={{ flex: 1, opacity: item._deleting ? 0.5 : 1 }}>
        <TextInput
          value={item._nombre}
          onChangeText={(t) => onChangeNombre(index, t)}
          onEndEditing={() => saveRowIfChanged(index)}
          placeholder="Producto"
          style={{
            paddingVertical: 6,
            paddingHorizontal: 10,
            backgroundColor: "#FAFBFC",
            borderWidth: 1,
            borderColor: "#E9EEF5",
            borderRadius: 10,
          }}
        />
      </View>

      {/* Cantidad (editable, centrada) */}
      <View style={{ width: 90, opacity: item._deleting ? 0.5 : 1 }}>
        <TextInput
          value={item._cantidad}
          onChangeText={(t) => onChangeCantidad(index, t)}
          onEndEditing={() => saveRowIfChanged(index)}
          placeholder="Cant."
          keyboardType="numeric"
          style={{
            paddingVertical: 6,
            textAlign: "center",
            backgroundColor: "#FAFBFC",
            borderWidth: 1,
            borderColor: "#E9EEF5",
            borderRadius: 10,
          }}
        />
      </View>

      {/* Guardando… */}
      {item._saving ? <ActivityIndicator /> : null}

      {/* Eliminar ítem */}
      <Pressable onPress={() => confirmDeleteRow(index)} hitSlop={10} disabled={item._deleting}>
        <Ionicons name="trash-outline" size={20} color={item._deleting ? colors.gray400 : colors.tertiary ?? "#ef4444"} />
      </Pressable>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.white }} edges={["top", "bottom"]}>
      {/* Header simple con renombrar + borrar */}
      <View
        style={{
          paddingHorizontal: spacing.md,
          paddingTop: spacing.md,
          paddingBottom: spacing.sm,
          borderBottomWidth: 1,
          borderBottomColor: "#E9EEF5",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          {/* Nombre lista: editable con lápiz */}
          <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 8 }}>
            {editingName ? (
              <TextInput
                value={listName}
                onChangeText={setListName}
                onEndEditing={onEndEditListName}
                autoFocus
                style={{ fontSize: 20, fontWeight: "800", color: colors.secondary, paddingVertical: 2 }}
              />
            ) : (
              <Text style={{ fontSize: 20, fontWeight: "800", color: colors.secondary }}>{listName}</Text>
            )}
            <Pressable onPress={() => setEditingName((s) => !s)} hitSlop={10}>
              <Ionicons name="create-outline" size={18} color={colors.secondary} />
            </Pressable>
          </View>

          {/* Borrar lista */}
          <Pressable onPress={confirmDeleteList} hitSlop={10}>
            <Ionicons name="trash-outline" size={20} color={colors.tertiary ?? "#ef4444"} />
          </Pressable>
        </View>

        {!!createdAt && (
          <Text style={{ color: colors.gray600, marginTop: 4, fontSize: 12 }}>Creada: {createdAt}</Text>
        )}
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator />
        </View>
      ) : error ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.md }}>
          <Text style={{ color: colors.error, textAlign: "center" }}>{error}</Text>
        </View>
      ) : rows.length === 0 ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.md }}>
          <Text style={{ color: colors.gray600, textAlign: "center" }}>Esta lista no tiene productos.</Text>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(it) => String(it.id)}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
        />
      )}
    </SafeAreaView>
  );
}
