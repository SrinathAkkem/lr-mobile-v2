import { View, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter, type Href } from "expo-router";
import { RonoLogo } from "../RonoLogo";
import { ChevronBackIcon } from "../icons";

type AuthHeaderProps = {
  showBack?: boolean;
  onBack?: () => void;
};

export function AuthHeader({ showBack = false, onBack }: AuthHeaderProps) {
  const router = useRouter();

  function handleBack() {
    if (onBack) {
      onBack();
      return;
    }
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(auth)/login" as Href);
    }
  }

  return (
    <View style={styles.wrap}>
      {showBack ? (
        <TouchableOpacity
          onPress={handleBack}
          style={styles.backButton}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ChevronBackIcon size={24} color="#000000" />
        </TouchableOpacity>
      ) : (
        <View style={styles.backPlaceholder} />
      )}
      <View style={styles.logoWrap}>
        <RonoLogo height={30} />
      </View>
      <View style={styles.backPlaceholder} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  backPlaceholder: {
    width: 40,
    height: 40,
  },
  logoWrap: {
    flex: 1,
    alignItems: "center",
  },
});
