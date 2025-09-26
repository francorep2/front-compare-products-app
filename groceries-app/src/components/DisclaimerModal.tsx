import { Ionicons } from "@expo/vector-icons";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

// Asegúrate de que la ruta a tus colores sea correcta
import { colors } from "../theme/colors";

interface DisclaimerModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function DisclaimerModal({ visible, onClose }: DisclaimerModalProps) {
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <Ionicons
            name="shield-checkmark-outline"
            size={50}
            color={colors.primary}
            style={styles.icon}
          />
          <Text style={styles.modalTitle}>Aviso Importante</Text>
          <Text style={styles.modalText}>
            Actualmente, las búsquedas pueden tardar unos segundos. ¡Ya estamos trabajando para optimizar la velocidad!
          </Text>
          
          {/* --- 1. DIVISOR VISUAL --- */}
          <View style={styles.divider} />

          {/* --- 2. TEXTO DEL DESCARGO DE RESPONSABILIDAD --- */}
          <Text style={styles.disclaimerText}>
            La información y los precios mostrados se obtienen de forma automática y son solo de referencia. Siempre verifica el precio y stock final en la tienda antes de comprar. No nos responsabilizamos por diferencias o decisiones de compra.
          </Text>
          
          <Pressable style={styles.button} onPress={onClose}>
            <Text style={styles.textStyle}>Aceptar y continuar</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  modalView: {
    margin: 20,
    backgroundColor: "white",
    borderRadius: 20,
    padding: 30, // Un poco más de padding
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    maxWidth: '90%',
  },
  icon: {
    marginBottom: 15,
  },
  modalTitle: {
    marginBottom: 15,
    textAlign: "center",
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  modalText: {
    marginBottom: 20, // Más espacio antes del divisor
    textAlign: "center",
    fontSize: 16,
    color: "#666",
    lineHeight: 24,
  },
  // --- 3. NUEVOS ESTILOS ---
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    width: '100%',
    marginBottom: 20,
  },
  disclaimerText: {
    marginBottom: 20,
    textAlign: "center",
    fontSize: 12, // Letra más pequeña
    color: "#888", // Color más suave
    lineHeight: 18,
  },
  button: {
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 30,
    elevation: 2,
    backgroundColor: colors.primary,
    marginTop: 10,
  },
  textStyle: {
    color: "white",
    fontWeight: "bold",
    textAlign: "center",
    fontSize: 16,
  },
});