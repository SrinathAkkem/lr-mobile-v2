import type { ReactNode } from "react";
import { StyleSheet, type ViewStyle } from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

type ScreenProps = {
  children: ReactNode;
  edges?: Edge[];
  style?: ViewStyle;
  statusBar?: "light" | "dark" | "auto";
};

/**
 * Root screen wrapper with consistent safe-area handling.
 * Pair with `useContentBottomPadding()` on ScrollView content when the tab bar is visible.
 */
export function Screen({
  children,
  edges = ["top"],
  style,
  statusBar,
}: ScreenProps) {
  return (
    <SafeAreaView style={[styles.root, style]} edges={edges}>
      {statusBar ? <StatusBar style={statusBar} /> : null}
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
