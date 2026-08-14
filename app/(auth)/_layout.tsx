import { Redirect, Stack } from "expo-router";
import { useAuth } from "../../lib/auth";

export default function AuthLayout() {
  const { user, loading } = useAuth();

  if (user) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
    </Stack>
  );
}
