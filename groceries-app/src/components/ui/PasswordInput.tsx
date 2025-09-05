import { useState } from "react";
import { Pressable, Text } from "react-native";
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
        style={{ position: "absolute", right: 10, top: 12, padding: 6 }}
      >
        <Text style={{ color: colors.gray600 }}>{show ? "🙈" : "👁️"}</Text>
      </Pressable>
    </>
  );
}
