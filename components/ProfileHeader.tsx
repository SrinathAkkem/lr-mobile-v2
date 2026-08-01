import type { ReactNode } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { COLORS, SPACING } from "../constants/theme";
import { FONTS } from "../constants/fonts";
import { ChevronBackIcon, UserIcon } from "./icons";

type ProfileHeaderProps = {
  name: string;
  subtitle: string;
  showBack?: boolean;
  onBack?: () => void;
  showEdit?: boolean;
  onEdit?: () => void;
  footer?: ReactNode;
};

export function ProfileHeader({
  name,
  subtitle,
  showBack = false,
  onBack,
  showEdit = false,
  onEdit,
  footer,
}: ProfileHeaderProps) {
  return (
    <View style={styles.header}>
      <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <LinearGradient id="profileHeaderGradient" x1="0%" y1="100%" x2="0%" y2="0%">
            <Stop offset="4.79%" stopColor={COLORS.primaryGradientEnd} />
            <Stop offset="65.55%" stopColor={COLORS.primaryGradientEnd} />
            <Stop offset="100%" stopColor={COLORS.primaryGradientStart} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#profileHeaderGradient)" />
      </Svg>

      <SafeAreaView edges={["top"]}>
        <View style={styles.topRow}>
          {showBack ? (
            <Pressable onPress={onBack} style={styles.sideButton}>
              <ChevronBackIcon size={24} color={COLORS.white} />
            </Pressable>
          ) : (
            <View style={styles.sideButton} />
          )}
          {showEdit ? (
            <Pressable onPress={onEdit} style={styles.sideButton}>
              <Text style={styles.editText}>Edit</Text>
            </Pressable>
          ) : (
            <View style={styles.sideButton} />
          )}
        </View>

        <View style={styles.profileCenter}>
          <View style={styles.avatar}>
            <UserIcon size={28} color={COLORS.white} />
          </View>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
          {footer}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingBottom: SPACING.xl,
    zIndex: 2,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
  },
  sideButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  editText: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: COLORS.white,
  },
  profileCenter: {
    alignItems: "center",
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    gap: 6,
  },
  avatar: {
    width: 66,
    height: 66,
    borderRadius: 33,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.headerAvatarBg,
    marginBottom: SPACING.xs,
  },
  name: {
    fontFamily: FONTS.semiBold,
    fontSize: 18,
    color: COLORS.white,
  },
  subtitle: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.85)",
  },
});

export const profilePdfBadgeStyles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.statCardBg,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 12,
    marginTop: SPACING.sm,
  },
  text: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.white,
  },
});
