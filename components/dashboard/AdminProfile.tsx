import { type ReactNode } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable } from "react-native";
import { StatusBar } from "expo-status-bar";
import { router } from "expo-router";
import { useAuth } from "../../lib/auth";
import { COLORS, SPACING } from "../../constants/theme";
import { FONTS } from "../../constants/fonts";
import { ProfileHeader, profilePdfBadgeStyles } from "../ProfileHeader";
import { AdminAccountCard } from "../AdminAccountCard";
import { useContentBottomPadding } from "../../hooks/useScreenInsets";
import {
  BarChartOutlineIcon,
  BusinessOutlineIcon,
  ChevronRightIcon,
  DocumentTextOutlineIcon,
  LogoutIcon,
  NotificationsOutlineIcon,
} from "../icons";

type MenuOptionProps = {
  icon: ReactNode;
  title: string;
  subtitle: string;
  onPress: () => void;
  showDivider?: boolean;
};

function MenuOption({
  icon,
  title,
  subtitle,
  onPress,
  showDivider = true,
}: MenuOptionProps) {
  return (
    <View>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.menuOption, pressed && styles.pressed]}
      >
        <View style={styles.menuLeft}>
          <View style={styles.menuIcon}>{icon}</View>
          <View style={styles.menuTextContainer}>
            <Text style={styles.menuTitle}>{title}</Text>
            <Text style={styles.menuSubtitle}>{subtitle}</Text>
          </View>
        </View>
        <ChevronRightIcon />
      </Pressable>
      {showDivider ? <View style={styles.menuDivider} /> : null}
    </View>
  );
}

export function AdminProfile() {
  const { user, logout } = useAuth();
  const contentBottom = useContentBottomPadding();

  const handleLogout = async () => {
    await logout();
    router.replace("/(auth)/login");
  };

  const subtitle = `${user?.company?.name || "Rono"} · ${user?.branch?.name || "ABC"}`;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <ProfileHeader
        name={user?.name || "User"}
        subtitle={subtitle}
        showBack
        onBack={() => router.back()}
        showEdit
        onEdit={() => router.push("/(tabs)/profile/edit" as any)}
        footer={
          <View style={profilePdfBadgeStyles.badge}>
            <DocumentTextOutlineIcon size={14} color="#FFFFFF" />
            <Text style={profilePdfBadgeStyles.text}>
              Details Go On Every LR Pdf
            </Text>
          </View>
        }
      />

      <View style={styles.content}>
        <ScrollView
          style={styles.contentScroll}
          contentContainerStyle={[
            styles.sheetContent,
            { paddingBottom: contentBottom },
          ]}
          showsVerticalScrollIndicator={false}
        >
        <View style={styles.menuSection}>
          <MenuOption
            icon={<BusinessOutlineIcon size={22} color={COLORS.black} />}
            title="Company Profile"
            subtitle="Logo, GST, Address, Stamp"
            onPress={() => router.push("/(tabs)/profile/company" as any)}
          />
          <MenuOption
            icon={<NotificationsOutlineIcon size={22} color={COLORS.black} />}
            title="Notification"
            subtitle="LR Approval, System Alert"
            onPress={() => router.push("/(tabs)/notifications")}
          />
          <MenuOption
            icon={<BarChartOutlineIcon size={22} color={COLORS.black} />}
            title="Report & Analytics"
            subtitle="Monthly Stats, Route Data"
            onPress={() => router.push("/(tabs)/reports")}
            showDivider={false}
          />
        </View>

        <AdminAccountCard
          name={user?.name || "User"}
          mobile={user?.mobile || ""}
          companyName={user?.company?.name || "SR Transport"}
        />

        <Pressable
          onPress={handleLogout}
          style={({ pressed }) => [styles.logoutButton, pressed && styles.pressed]}
        >
          <LogoutIcon />
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primaryGradientEnd,
  },
  content: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    overflow: "hidden",
  },
  contentScroll: {
    flex: 1,
  },
  sheetContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: 20,
    gap: 18,
  },
  menuSection: {
    gap: 18,
  },
  menuOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  menuLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    flex: 1,
  },
  menuIcon: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: COLORS.backgroundSecondary,
  },
  menuTextContainer: {
    flex: 1,
    gap: 12,
  },
  menuTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: 16,
    color: COLORS.black,
  },
  menuSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  menuDivider: {
    height: 1,
    backgroundColor: COLORS.divider,
    marginTop: 18,
  },
  pressed: {
    opacity: 0.85,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COLORS.chipRejectedBg,
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  logoutText: {
    fontFamily: FONTS.regular,
    fontSize: 16,
    color: COLORS.error,
    lineHeight: 18,
  },
});
