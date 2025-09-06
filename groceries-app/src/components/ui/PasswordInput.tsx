import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable } from "react-native";
import { useTheme } from "../../providers/theme";
import { Input } from "./Input";

export function PasswordInput({
  value, onChangeText, placeholder, ...rest
}: React.ComponentProps<typeof Input>) {
  const [show, setShow] = useState(false);
  const { colors } = useTheme();
  return (
    <>
      <Input
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        secureTextEntry={!show}
        style={{ paddingRight: 44, ...(rest.style as object) }}
        {...rest}
      />
      <Pressable
        onPress={() => setShow(s => !s)}
        style={{ position: "absolute", right: 12, top: 12, padding: 4 }}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons 
          name={show ? "eye-off-outline" : "eye-outline"} 
          size={20} 
          color={colors.gray600} 
        />
      </Pressable>
    </>
  );
}
