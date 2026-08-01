import { useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import { useFocusEffect } from "expo-router";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { router } from "expo-router";
import { useAuth } from "../../lib/auth";
import { api } from "../../lib/api";
import type { LRRequest } from "../../types";
import { COLORS, FONT_SIZES } from "../../constants/theme";
import { FONTS } from "../../constants/fonts";
import { ExecutiveProfileHeader } from "../ExecutiveProfileHeader";
import { useContentBottomPadding } from "../../hooks/useScreenInsets";
import {
  BookOutlineIcon,
  BusinessOutlineIcon,
  CallOutlineIcon,
  ChevronRightIcon,
  LocationOutlineIcon,
  LogoutIcon,
  ShieldCheckmarkOutlineIcon,
  TimeOutlineIcon,
} from "../icons";
import { resolveDashboardStats } from "../../lib/dashboard-utils";

function formatMobile(mobile: string) {
  const digits = mobile.replace(/\D/g, "");
  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  }
  if (digits.length === 12 && digits.startsWith("91")) {
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  }
  return mobile;
}

function getExecutiveId(name?: string) {
  const first = name?.trim().split(/\s+/)[0]?.toUpperCase() ?? "USER";
  return `EXE-${first}`;
}

function formatBranch(name?: string, city?: string) {
  if (name && city && !name.toLowerCase().includes(city.toLowerCase())) {
    return `${city} ${name}`;
  }
  if (name) return name;
  if (city) return city;
  return "—";
}

function formatAccountStatus(status?: string) {
  switch (status) {
    case "inactive":
      return { label: "Inactive", color: COLORS.error };
    case "invited":
      return { label: "Invited", color: COLORS.warning };
    default:
      return { label: "Active", color: "#34C759" };
  }
}

function countLrsThisMonth(lrs: LRRequest[]) {
  const now = new Date();
  return lrs.filter((lr) => {
    const created = new Date(lr.createdAt);
    return (
      created.getMonth() === now.getMonth() &&
      created.getFullYear() === now.getFullYear()
    );
  }).length;
}

type InfoRowProps = {
  icon: ReactNode;
  label: string;
  value: string;
  valueColor?: string;
  onPress?: () => void;
  showChevron?: boolean;
};

function ProfileInfoRow({
  icon,
  label,
  value,
  valueColor = COLORS.black,
  onPress,
  showChevron,
}: InfoRowProps) {
  const content = (
    <View style={styles.infoRow}>
      <View style={styles.infoIconBox}>{icon}</View>
      <View style={styles.infoText}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={[styles.infoValue, { color: valueColor }]}>{value}</Text>
      </View>
      {showChevron ? <ChevronRightIcon size={10} color="#4D4D4D" /> : null}
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
        {content}
      </Pressable>
    );
  }

  return content;
}

function ProfileSection({
  children,
  showDivider = true,
}: {
  children: ReactNode;
  showDivider?: boolean;
}) {
  return (
    <View style={styles.section}>
      {children}
      {showDivider ? <View style={styles.divider} /> : null}
    </View>
  );
}

export default function ExecutiveProfileScreen() {
  const { user, refreshUser, reloadProfile, logout } = useAuth();
  const contentBottom = useContentBottomPadding();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(user?.name || "");
  const [saving, setSaving] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [stats, setStats] = useState({ totalLr: 0, delivered: 0, thisMonth: 0 });
  const hasLoadedRef = useRef(false);

  const loadStats = useCallback(async () => {
    const execRes = await api.getExecutiveDashboard();
    if (execRes.success && execRes.data) {
      const combined = [
        ...(execRes.data.latestLr ? [execRes.data.latestLr] : []),
        ...execRes.data.history.filter(
          (lr) => lr.id !== execRes.data?.latestLr?.id,
        ),
      ];
      const resolved = resolveDashboardStats(execRes.data.stats, combined);
      setStats({
        totalLr: resolved?.totalLrs ?? combined.length,
        delivered: resolved?.delivered ?? 0,
        thisMonth: countLrsThisMonth(combined),
      });
      return;
    }

    const res = await api.getLRs();
    if (res.success && res.data) {
      const lrs = res.data;
      const resolved = resolveDashboardStats(null, lrs);
      setStats({
        totalLr: resolved?.totalLrs ?? lrs.length,
        delivered: resolved?.delivered ?? 0,
        thisMonth: countLrsThisMonth(lrs),
      });
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      setProfileLoading(true);
      await reloadProfile();
      if (cancelled) return;
      await loadStats();
      if (cancelled) return;
      setProfileLoading(false);
      hasLoadedRef.current = true;
    };

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [loadStats, reloadProfile]);

  useFocusEffect(
    useCallback(() => {
      if (!hasLoadedRef.current) return;
      void loadStats();
    }, [loadStats]),
  );

  useEffect(() => {
    setEditName(user?.name || "");
  }, [user?.name]);

  const accountStatus = formatAccountStatus(user?.status);

  async function handleSave() {
    if (!editName.trim()) {
      Alert.alert("Validation Error", "Name is required");
      return;
    }

    setSaving(true);
    const res = await api.updateProfile({ name: editName.trim() });
    setSaving(false);

    if (res.success && res.data) {
      await refreshUser(res.data);
      setIsEditing(false);
    } else {
      Alert.alert("Error", res.error || "Failed to update profile");
    }
  }

  function handleCancel() {
    setEditName(user?.name || "");
    setIsEditing(false);
  }

  async function handleLogout() {
    await logout();
    router.replace("/(auth)/login");
  }

  const appVersion = "2.0.0";

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <ExecutiveProfileHeader
        name={user?.name || "User"}
        executiveId={getExecutiveId(user?.name)}
        isEditing={isEditing}
        editName={editName}
        onEditNameChange={setEditName}
        onEdit={() => setIsEditing(true)}
        onSave={handleSave}
        onCancel={handleCancel}
        stats={stats}
      />

      <View style={styles.content}>
        {profileLoading || saving ? (
          <ActivityIndicator
            size="large"
            color={COLORS.primary}
            style={styles.loader}
          />
        ) : (
          <ScrollView
            style={styles.contentScroll}
            contentContainerStyle={[
              styles.sheetContent,
              { paddingBottom: contentBottom },
            ]}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.infoList}>
              <ProfileSection>
                <ProfileInfoRow
                  icon={<CallOutlineIcon size={24} color={COLORS.black} />}
                  label="Mobile Number"
                  value={formatMobile(user?.mobile || "")}
                />
              </ProfileSection>

              <ProfileSection>
                <ProfileInfoRow
                  icon={<BusinessOutlineIcon size={24} color={COLORS.black} />}
                  label="Company Name"
                  value={user?.company?.name || "—"}
                />
              </ProfileSection>

              <ProfileSection>
                <ProfileInfoRow
                  icon={<LocationOutlineIcon size={24} color={COLORS.black} />}
                  label="Branch"
                  value={formatBranch(user?.branch?.name, user?.branch?.city)}
                />
              </ProfileSection>

              <ProfileSection>
                <ProfileInfoRow
                  icon={<ShieldCheckmarkOutlineIcon size={24} color={COLORS.black} />}
                  label="Account Status"
                  value={accountStatus.label}
                  valueColor={accountStatus.color}
                />
              </ProfileSection>

              <ProfileSection showDivider={false}>
                <ProfileInfoRow
                  icon={<BookOutlineIcon size={24} color={COLORS.black} />}
                  label="Address Book"
                  value="Saved Addresses"
                  onPress={() => router.push("/(tabs)/address-book")}
                  showChevron
                />
              </ProfileSection>
            </View>

            <View style={styles.versionCard}>
              <View style={styles.infoRow}>
                <View style={[styles.infoIconBox, styles.versionIconBox]}>
                  <TimeOutlineIcon size={24} color={COLORS.black} />
                </View>
                <View style={styles.infoText}>
                  <Text style={styles.infoLabel}>App Version</Text>
                  <Text style={styles.infoValue}>
                    Rono Executive v{appVersion}
                  </Text>
                </View>
              </View>
            </View>

            <Pressable
              onPress={handleLogout}
              style={({ pressed }) => [
                styles.logoutButton,
                pressed && styles.pressed,
              ]}
            >
              <LogoutIcon size={16} color={COLORS.error} />
              <Text style={styles.logoutText}>Logout</Text>
            </Pressable>
          </ScrollView>
        )}
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
  loader: {
    marginTop: 40,
  },
  contentScroll: {
    flex: 1,
  },
  sheetContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    gap: 18,
  },
  infoList: {
    gap: 18,
  },
  section: {
    gap: 18,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  infoIconBox: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: COLORS.backgroundSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  versionIconBox: {
    backgroundColor: COLORS.white,
  },
  infoText: {
    flex: 1,
    gap: 12,
  },
  infoLabel: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
  },
  infoValue: {
    fontSize: FONT_SIZES.lg,
    fontFamily: FONTS.semiBold,
    color: COLORS.black,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.divider,
  },
  versionCard: {
    borderRadius: 12,
    backgroundColor: COLORS.backgroundSecondary,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COLORS.chipRejectedBg,
    borderRadius: 25,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  logoutText: {
    fontSize: FONT_SIZES.lg,
    fontFamily: FONTS.regular,
    color: COLORS.error,
    lineHeight: 18,
  },
  pressed: {
    opacity: 0.85,
  },
});
