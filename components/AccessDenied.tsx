import { View, Text, StyleSheet } from "react-native";
import { COLORS } from "../constants/theme";
import { router } from "expo-router";

interface AccessDeniedProps {
  message?: string;
}

export function AccessDenied({ message = "Access Denied" }: AccessDeniedProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>🚫</Text>
      <Text style={styles.title}>Access Denied</Text>
      <Text style={styles.message}>{message}</Text>
      <Text
        style={styles.link}
        onPress={() => router.replace("/(tabs)")}
      >
        Go to Dashboard
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: COLORS.background,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 8,
  },
  message: {
    fontSize: 16,
    color: COLORS.textMuted,
    textAlign: "center",
    marginBottom: 24,
  },
  link: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: "600",
  },
});
