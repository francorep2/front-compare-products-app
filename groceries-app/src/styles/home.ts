import { StyleSheet } from "react-native";

// Colores que me diste (hex):
// Primario: #FD1648  | Secundario: #FF1058 | Terciario: #4A5899
// Correcto: #75E809  | Advertencia: #FFDD61 | Error: #FF1010

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
    padding: 20,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FD1648",
    marginBottom: 8,
  },
  email: {
    fontSize: 18,
    color: "#4A5899",
  },
  errorText: {
    color: "#FF1010",
    marginBottom: 12,
  },
});
