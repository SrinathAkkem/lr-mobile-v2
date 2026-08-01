import { useEffect, useState } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { Redirect, type Href } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useAuth } from "../lib/auth";
import { COLORS } from "../constants/theme";
import { hasCompletedOnboarding } from "../lib/onboarding";

export default function Index() {
  const { user, loading } = useAuth();
  const [href, setHref] = useState<Href | null>(null);

  useEffect(() => {
    if (loading) return;

    const resolveRoute = async () => {
      if (user) {
        setHref("/(tabs)");
      } else {
        const completed = await hasCompletedOnboarding();
        setHref(completed ? "/(auth)/login" : "/(auth)/onboarding");
      }
      await SplashScreen.hideAsync();
    };

    void resolveRoute();
  }, [user, loading]);

  if (loading || href === null) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return <Redirect href={href} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: "center",
    alignItems: "center",
  },
});
