import { Stack } from "expo-router";

export default function AuthStack() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="verify" />
      <Stack.Screen name="forgot" />
      <Stack.Screen name="reset-confirm" />
    </Stack>
  );
}
