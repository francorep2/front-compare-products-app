import { Ionicons } from "@expo/vector-icons";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors"; // Asegúrate de que la ruta a tus colores sea correcta

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
      onRequestClose={onClose} // Para el botón de "atrás" en Android
    >
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <Ionicons
            name="information-circle-outline"
            size={50}
            color={colors.primary}
            style={styles.icon}
          />
          <Text style={styles.modalTitle}>Antes de empezar</Text>
          <Text style={styles.modalText}>
            Esta es una **versión de demostración**. Las búsquedas de precios se realizan en tiempo real y **pueden demorar unos segundos**.
          </Text>
          <Text style={styles.modalText}>
            La información y los precios son referenciales. No nos responsabilizamos por diferencias, errores o falta de stock en las tiendas.
          </Text>
          <Pressable style={styles.button} onPress={onClose}>
            <Text style={styles.textStyle}>Entendido</Text>
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
    backgroundColor: "rgba(0, 0, 0, 0.6)", // Fondo oscuro semitransparente
  },
  modalView: {
    margin: 20,
    backgroundColor: "white",
    borderRadius: 20,
    padding: 35,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
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
    marginBottom: 15,
    textAlign: "center",
    fontSize: 16,
    color: "#666",
    lineHeight: 24,
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