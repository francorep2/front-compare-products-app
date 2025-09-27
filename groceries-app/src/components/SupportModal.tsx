import { Ionicons } from "@expo/vector-icons";
import { useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { submitSupportTicket } from '../api/endpoints'; // Asumimos que esta función ya existe
import { useTheme } from "../providers/theme";
import { Button } from './ui/Button'; // Usaremos tu componente Button

interface SupportModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function SupportModal({ visible, onClose }: SupportModalProps) {
  const { colors } = useTheme();
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

 const handleSubmit = async () => {
  const text = message.trim();
  if (text.length < 3) {
    Alert.alert("Mensaje muy corto", "Contanos un poco más del problema (mín. 3 caracteres).");
    return;
  }
  setIsSubmitting(true);
  try {
    const response = await submitSupportTicket({ message: text });
    Alert.alert("Reporte Enviado", response.detail ?? "¡Gracias por tu comentario!");
    setMessage("");
    onClose();
  } catch (e: any) {
    Alert.alert("Error", e.message || "No se pudo enviar el reporte.");
  } finally {
    setIsSubmitting(false);
  }
};

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.centeredView}>
        <View style={[styles.modalView, { backgroundColor: colors.white }]}>
          <Pressable style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close-circle" size={30} color={colors.gray200} />
          </Pressable>

          <Ionicons
            name="chatbubble-ellipses-outline"
            size={50}
            color={colors.primary}
            style={styles.icon}
          />
          <Text style={[styles.modalTitle, { color: colors.text }]}>Envíanos tu comentario</Text>
          <Text style={[styles.modalText, { color: colors.secondary }]}>
            ¿Viste un error o tienes una sugerencia? Tu feedback nos ayuda a mejorar.
          </Text>
          
          <TextInput
            style={[styles.input, { borderColor: colors.border, color: colors.text }]}
            placeholder="Describe tu reporte aquí..."
            placeholderTextColor={colors.gray400}
            value={message}
            onChangeText={setMessage}
            multiline
          />

          <Button 
            title={isSubmitting ? "Enviando..." : "Enviar Comentario"}
            onPress={handleSubmit} 
            disabled={isSubmitting}
            loading={isSubmitting}
            style={{ backgroundColor: colors.primary, width: '100%' }}
          />
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
    borderRadius: 20,
    padding: 30,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '90%',
  },
  closeButton: {
    position: 'absolute',
    top: 15,
    right: 15,
  },
  icon: {
    marginBottom: 15,
  },
  modalTitle: {
    marginBottom: 8,
    textAlign: "center",
    fontSize: 20,
    fontWeight: "bold",
  },
  modalText: {
    marginBottom: 20,
    textAlign: "center",
    fontSize: 16,
    lineHeight: 24,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 120,
    textAlignVertical: 'top',
    marginBottom: 20,
    width: '100%',
  },
});