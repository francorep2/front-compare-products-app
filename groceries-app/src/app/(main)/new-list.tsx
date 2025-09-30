import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { FadeInUp } from "react-native-reanimated";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Defs, Path, Stop, LinearGradient as SvgGradient } from "react-native-svg";

import { addItem, createShoppingList } from "../../api/endpoints";
import { useTheme } from "../../providers/theme";

type Item = { id: string; product: string; qty: string };

const WaveBackground = () => {
  const { colors } = useTheme();
  const { width } = Dimensions.get('window');
  const height = 250;

  return (
    <View style={styles.waveContainer}>
      <Svg height="100%" width="100%" viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          <SvgGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={colors.primary} stopOpacity="1" />
            <Stop offset="100%" stopColor={colors.secondary} stopOpacity="1" />
          </SvgGradient>
        </Defs>
        <Path fill="url(#grad)" d={`M0,0 L0,${height * 0.7} Q${width / 2},${height} ${width},${height * 0.7} L${width},0 Z`} />
      </Svg>
    </View>
  );
};

const ListItem = React.memo(({ item, onUpdate, onDelete, isEditing, onSetEditingId }: any) => {
    const { colors, spacing } = useTheme();
    const [editedProduct, setEditedProduct] = useState(item.product);
    const [editedQty, setEditedQty] = useState(parseInt(item.qty, 10));

    useEffect(() => {
        if (isEditing) {
            setEditedProduct(item.product);
            setEditedQty(parseInt(item.qty, 10));
        }
    }, [isEditing, item.product, item.qty]);

    const handleSave = () => {
        onUpdate(item.id, editedProduct.trim(), String(editedQty));
        onSetEditingId(null);
    };
    const handleCancel = () => { onSetEditingId(null); };
    const changeQty = (amount: number) => { setEditedQty(prev => Math.max(1, prev + amount)); }

    if (isEditing) {
        return (
            <Animated.View entering={FadeInUp.duration(300)} style={[styles.itemCardEditing, { backgroundColor: colors.white, borderColor: colors.primary }]}>
                <TextInput
                    value={editedProduct} onChangeText={setEditedProduct}
                    style={[styles.itemProductInput, { color: colors.text }]} autoFocus
                />
                <View style={styles.quantityEditor}>
                    <Pressable onPress={() => changeQty(-1)} style={[styles.stepperButton, { backgroundColor: colors.background }]}><Ionicons name="remove" size={20} color={colors.tertiary} /></Pressable>
                    <Text style={[styles.itemQtyTextEditing, { color: colors.text }]}>{editedQty}</Text>
                    <Pressable onPress={() => changeQty(1)} style={[styles.stepperButton, { backgroundColor: colors.background }]}><Ionicons name="add" size={20} color={colors.tertiary} /></Pressable>
                </View>
                <Pressable onPress={handleSave} style={styles.editActionButton}><Ionicons name="checkmark-circle" size={28} color={colors.success} /></Pressable>
                <Pressable onPress={handleCancel} style={styles.editActionButton}><Ionicons name="close-circle" size={28} color={colors.gray400} /></Pressable>
            </Animated.View>
        );
    }

    return (
        // --- ANIMACIÓN AÑADIDA AQUÍ ---
        <Animated.View entering={FadeInUp.duration(300)}>
            <Pressable 
                onPress={() => onSetEditingId(item.id)}
                style={[styles.itemCard, { backgroundColor: colors.white, borderColor: colors.border }]}
            >
                <Ionicons name="ellipse-outline" size={24} color={colors.primary} style={{ marginRight: spacing.sm }}/>
                <Text style={[styles.itemProduct, { color: colors.text }]}>{item.product}</Text>
                <View style={[styles.itemQtyBadge, { backgroundColor: colors.background }]}><Text style={[styles.itemQtyText, { color: colors.tertiary }]}>x{item.qty}</Text></View>
                <Pressable onPress={() => onSetEditingId(item.id)} style={styles.actionIcon}><Ionicons name="create-outline" size={22} color={colors.tertiary} /></Pressable>
                <Pressable onPress={onDelete} style={styles.actionIcon}><Ionicons name="trash-outline" size={22} color={colors.error} /></Pressable>
            </Pressable>
        </Animated.View>
    );
});

export default function NewListScreen() {
  const { colors, spacing } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [title, setTitle] = useState("Nueva Lista");
  const [items, setItems] = useState<Item[]>([]);
  const [newItem, setNewItem] = useState("");
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const newItemInputRef = useRef<TextInput>(null);

  const canSave = items.length > 0;
  const dateText = useMemo(() => new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long' }), []);

  const resetForm = useCallback(() => { setTitle("Nueva Lista"); setItems([]); setNewItem(""); setEditingItemId(null); }, []);
  useFocusEffect(resetForm);

  const handleAddItem = () => {
    const productName = newItem.trim();
    if (!productName) return;
    const newItemObject: Item = { id: Date.now().toString(), product: productName, qty: "1" };
    setItems((prev) => [newItemObject, ...prev]);
    setNewItem("");
  };

  const removeItem = (id: string) => { setItems((prev) => prev.filter((item) => item.id !== id)); setEditingItemId(null); };
  
  const updateItem = (id: string, newProduct: string, newQty: string) => {
      setItems(prevItems => prevItems.map(item => item.id === id ? { ...item, product: newProduct, qty: newQty } : item));
  };

  const onSave = async () => {
    if (!canSave) return;
    try {
      const list = await createShoppingList({ nombre: title.trim() });
      await Promise.all(items.map(it => addItem(list.id, { nombre: it.product, cantidad: it.qty })));
      Alert.alert("Éxito", `La lista "${title.trim()}" se guardó.`, [
        { text: "OK", onPress: () => router.push('/purchases') },
      ]);
    } catch (e: any) {
      Alert.alert("Error", e?.message || "No se pudo guardar la lista.");
    }
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <WaveBackground />
        <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
            <Animated.View entering={FadeInUp.duration(600)} style={[styles.headerContainer, {paddingTop: insets.top}]}>
              <View style={[styles.contentCard, { backgroundColor: colors.white }]}>
                <View style={styles.header}>
                  <View style={styles.titleContainer}>
                    <Ionicons name="document-text-outline" size={24} color={colors.primary} />
                    <TextInput value={title} onChangeText={setTitle} style={[styles.listTitleInput, { color: colors.primary }]} />
                  </View>
                  <Pressable
                    onPress={onSave} disabled={!canSave}
                    style={[styles.saveButton, { backgroundColor: colors.success, opacity: canSave ? 1 : 0.5 }]}
                  >
                    <MaterialCommunityIcons name="content-save-outline" size={22} color={colors.white} />
                  </Pressable>
                </View>
                <Text style={[styles.dateTextInCard, { color: colors.textSecondary }]}>{dateText}</Text>
                <View style={styles.inputBar}>
                  <TextInput
                    ref={newItemInputRef}
                    style={[styles.textInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                    placeholder="Agregar un producto..."
                    placeholderTextColor={colors.gray400}
                    value={newItem}
                    onChangeText={setNewItem}
                    onSubmitEditing={handleAddItem}
                    blurOnSubmit={false}
                  />
                  <Pressable 
                    onPress={handleAddItem} disabled={!newItem.trim()}
                    style={[styles.submitButton, { backgroundColor: newItem.trim() ? colors.primary : colors.gray100 }]}
                  >
                    <Ionicons name="add" size={28} color={colors.white} />
                  </Pressable>
                </View>
              </View>
            </Animated.View>
            
            <FlatList
              style={{ flex: 1 }}
              data={items}
              keyExtractor={(item) => item.id}
              extraData={editingItemId}
              contentContainerStyle={styles.listContentContainer}
              renderItem={({ item }) => (
                <ListItem 
                    item={item}
                    isEditing={editingItemId === item.id}
                    onSetEditingId={setEditingItemId}
                    onDelete={() => removeItem(item.id)}
                    onUpdate={updateItem}
                />
              )}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="file-tray-stacked-outline" size={60} color={colors.gray200} />
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Tu lista está vacía</Text>
                  <Text style={[styles.emptySubText, { color: colors.gray400 }]}>Agrega productos usando el formulario superior.</Text>
                </View>
              }
              keyboardShouldPersistTaps="handled"
            />
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1 },
  waveContainer: { 
    position: 'absolute', top: 0, left: 0, right: 0, 
    height: 250, zIndex: 0,
  },
  headerContainer: {
    paddingHorizontal: 16,
    zIndex: 1, 
    marginTop: 10,
  },
  contentCard: {
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  listTitleInput: {
    fontSize: 24,
    fontWeight: 'bold',
    flex: 1,
  },
  titleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  saveButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 16,
  },
  dateTextInCard: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
    marginTop: 8,
    marginBottom: 16,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  textInput: {
    flex: 1,
    height: 50,
    fontSize: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
  },
  submitButton: {
    width: 50,
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContentContainer: {
    padding: 16,
  },
  emptyContainer: { paddingTop: 48, alignItems: 'center', opacity: 0.8 },
  emptyText: { fontSize: 18, fontWeight: '600', marginTop: 16 },
  emptySubText: { fontSize: 14, marginTop: 8, textAlign: 'center' },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  itemProduct: { flex: 1, fontSize: 16, fontWeight: '500' },
  itemQtyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 8,
  },
  itemQtyText: { fontWeight: '600', fontSize: 14 },
  actionIcon: { padding: 4, marginLeft: 8 },
  itemCardEditing: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 12,
  },
  itemProductInput: { flex: 1, fontSize: 16, fontWeight: '500', paddingVertical: 8 },
  quantityEditor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 8,
  },
  stepperButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemQtyTextEditing: {
      fontWeight: 'bold',
      fontSize: 16,
      minWidth: 20,
      textAlign: 'center',
  },
  editActionButton: { padding: 4, marginLeft: 4 },
});