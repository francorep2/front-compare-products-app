import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons"; // Importamos MaterialCommunityIcons
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

// Colores de la aplicación (ajusta si tienes una paleta global)
const appColors = {
  primary: "#211f8fff", // Tu color primario
  secondary: "#4CAF50", // Un color secundario
  tertiary: "#2196F3", // Otro color para variar
  accent: "#ffd207ff", // Un color de acento
  cardBackground: "#FFFFFF",
  text: "#333333",
  textLight: "#666666",
  iconDark: "#1A202C", // Color oscuro para iconos
  iconLight: "#FFFFFF", // Color claro para iconos
};

// --- NUEVOS DATOS CON ICONOS Y COLORES TEMÁTICOS ---
const DUMMY_DATA = [
  {
    id: "1",
    title: "Búsqueda Rápida",
    subtitle: "Por nombre o código de barras.",
    icon: "barcode-scan", // Icono para escanear
    iconLib: MaterialCommunityIcons,
    color: appColors.primary,
  },
  {
    id: "2",
    title: "Listas Únicas",
    subtitle: "Crea tus listas de compras personalizadas.",
    icon: "list-outline", // Icono de lista
    iconLib: Ionicons,
    color: appColors.secondary,
  },
  {
    id: "3",
    title: "Ahorro Garantizado",
    subtitle: "Compara el mejor precio, de muchas tiendas.",
    icon: "piggy-bank-outline", // Icono de ahorro
    iconLib: MaterialCommunityIcons,
    color: appColors.accent,
  },
];

// Componente para cada tarjeta individual del carrusel (ahora con íconos)
const CarouselItem = ({ item }: { item: (typeof DUMMY_DATA)[0] }) => {
  const IconComponent = item.iconLib;
  return (
    <Pressable style={[styles.card, { backgroundColor: item.color }]}>
      <View style={styles.iconWrapper}>
        <IconComponent name={item.icon} size={40} color={appColors.iconLight} />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.subtitle}>{item.subtitle}</Text>
      </View>
    </Pressable>
  );
};

// Componente principal del Carrusel
export default function FeaturedCarousel() {
  return (
    <View style={styles.container}>
      <FlatList
        data={DUMMY_DATA}
        renderItem={({ item }) => <CarouselItem item={item} />}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={styles.card.width + styles.card.marginHorizontal * 2}
        decelerationRate="fast"
        contentContainerStyle={styles.listContentContainer}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 160, // Altura más pequeña para el carrusel
    marginBottom: 16, // Espacio después del carrusel
  },
  listContentContainer: {
    paddingHorizontal: 24,
  },
  card: {
    width: 180, // Ancho de la tarjeta más pequeño
    height: "100%",
    marginHorizontal: 8,
    borderRadius: 16,
    overflow: "hidden",
    justifyContent: "center", // Centrar contenido
    alignItems: "center",     // Centrar contenido
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  iconWrapper: {
    marginBottom: 8,
  },
  textContainer: {
    alignItems: "center", // Centra el texto
    paddingHorizontal: 10,
  },
  title: {
    color: appColors.iconLight, // Texto blanco para contrastar con los fondos de color
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
  },
  subtitle: {
    color: `${appColors.iconLight}B3`, // Blanco con opacidad
    fontSize: 12,
    marginTop: 4,
    textAlign: "center",
  },
});