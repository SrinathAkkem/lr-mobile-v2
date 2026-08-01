import { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Alert,
  Pressable,
  Image,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { router } from "expo-router";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { useAuth } from "../../lib/auth";
import { api, getToken } from "../../lib/api";
import { matchesLRSearch } from "../../lib/lr-utils";
import type { ExecutiveDashboardStats, LRRequest } from "../../types";
import { COLORS, FONT_SIZES } from "../../constants/theme";
import { FONTS } from "../../constants/fonts";
import { useContentBottomPadding } from "../../hooks/useScreenInsets";
import {
  countByStatus,
  getFirstName,
  matchesStatusFilter,
  resolveDashboardStats,
  type LRStatusKey,
} from "../../lib/dashboard-utils";
import { ExecutiveStatGrid } from "./ExecutiveStatGrid";
import { AdminFilterChips } from "./AdminFilterChips";
import { ExecutiveLRCard } from "../ExecutiveLRCard";
import {
  CloseIcon,
  FilterIcon,
  NotificationIcon,
  PlusIcon,
  SearchIcon,
  ToastErrorIcon,
  UserIcon,
} from "../icons";

function formatCountPadded(value: number) {
  return String(value).padStart(2, "0");
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

export function ExecutiveDashboard() {
  const { user, loading: authLoading } = useAuth();
  const insets = useSafeAreaInsets();
  const contentBottom = useContentBottomPadding();
  const [stats, setStats] = useState<ExecutiveDashboardStats | null>(null);
  const [lrs, setLrs] = useState<LRRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  const activeFilterCount =
    statusFilters.length + (search.trim() ? 1 : 0);

  const load = useCallback(async () => {
    const token = await getToken();
    if (!token) return;

    const execRes = await api.getExecutiveDashboard();
    if (execRes.success && execRes.data) {
      setStats(execRes.data.stats);
      const combined = [
        ...(execRes.data.latestLr ? [execRes.data.latestLr] : []),
        ...execRes.data.history.filter(
          (lr) => lr.id !== execRes.data?.latestLr?.id,
        ),
      ].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      setLrs(combined);
      return;
    }

    if (execRes.error) {
      Alert.alert("Error", execRes.error);
    }

    const lrRes = await api.getLRs();
    if (lrRes.success && lrRes.data) {
      const sorted = [...lrRes.data].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      setLrs(sorted);
    } else if (lrRes.error) {
      Alert.alert("Error", lrRes.error);
    }
  }, []);

  useEffect(() => {
    if (authLoading || !user) return;

    const timer = setTimeout(() => {
      (async () => {
        setLoading(true);
        await load();
        setLoading(false);
      })();
    }, search.trim() ? 300 : 0);

    return () => clearTimeout(timer);
  }, [authLoading, user, load, search]);

  useFocusEffect(
    useCallback(() => {
      if (authLoading || !user) return;
      void load();
    }, [authLoading, user, load]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const toggleStatusFilter = (status: LRStatusKey) => {
    setStatusFilters((prev) =>
      prev.includes(status)
        ? prev.filter((item) => item !== status)
        : [...prev, status],
    );
    setShowFilterPanel(true);
  };

  const clearFilters = () => {
    setStatusFilters([]);
    setSearch("");
    setShowFilterPanel(false);
  };

  const filteredLrs = useMemo(() => {
    return lrs.filter((lr) => {
      const matchesSearch = matchesLRSearch(lr, search);
      const matchesStatus =
        statusFilters.length === 0 || matchesStatusFilter(lr, statusFilters);
      return matchesSearch && matchesStatus;
    });
  }, [lrs, search, statusFilters]);

  const statusCounts = useMemo(() => countByStatus(lrs), [lrs]);
  const displayStats = useMemo(
    () => resolveDashboardStats(stats, lrs),
    [stats, lrs],
  );
  const rejectedCount = displayStats?.rejected ?? statusCounts.rejected;
  const totalLrs = displayStats?.totalLrs ?? lrs.length;
  const deliveredCount = displayStats?.delivered ?? statusCounts.delivered;
  const thisMonthCount = countLrsThisMonth(lrs);
  const firstName = getFirstName(user?.name);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
          <Defs>
            <LinearGradient id="execHeaderGradient" x1="0%" y1="100%" x2="0%" y2="0%">
              <Stop offset="4.79%" stopColor={COLORS.primaryGradientEnd} />
              <Stop offset="65.55%" stopColor={COLORS.primaryGradientEnd} />
              <Stop offset="100%" stopColor={COLORS.primaryGradientStart} />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#execHeaderGradient)" />
        </Svg>

        <View style={[styles.headerInner, { paddingTop: insets.top + 8 }]}>
          <View style={styles.headerTop}>
            <Pressable
              style={styles.userInfo}
              onPress={() => router.push("/(tabs)/profile")}
              hitSlop={8}
            >
              <View style={styles.avatar}>
                <UserIcon size={20} color="#FFFFFF" />
              </View>
              <Text style={styles.greeting}>Hello {firstName}!</Text>
            </Pressable>
            <Pressable
              onPress={() => router.push("/(tabs)/notifications")}
              style={styles.headerIconButton}
            >
              <NotificationIcon size={18} color="#FFFFFF" />
            </Pressable>
          </View>

          <View style={styles.statGridWrap}>
            <ExecutiveStatGrid
              totalLrs={totalLrs}
              delivered={deliveredCount}
              thisMonth={thisMonthCount}
            />
          </View>

          <View style={styles.actionRow}>
            {rejectedCount > 0 ? (
              <Pressable
                style={styles.rejectedBanner}
                onPress={() => {
                  setStatusFilters(["rejected"]);
                  setShowFilterPanel(true);
                }}
              >
                <View style={styles.rejectedIconWrap}>
                  <ToastErrorIcon size={11} color="#FFFFFF" />
                </View>
                <Text style={styles.rejectedBannerText} numberOfLines={1}>
                  {rejectedCount} LR Rejected Take Action...
                </Text>
              </Pressable>
            ) : (
              <View style={styles.rejectedBannerPlaceholder} />
            )}
            <Pressable
              style={styles.createButton}
              onPress={() => router.push("/(tabs)/lrs/create")}
            >
              <PlusIcon size={8} color="#FFFFFF" />
              <Text style={styles.createButtonText}>Create LR</Text>
            </Pressable>
          </View>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.contentBody}>
          <View style={styles.contentHeader}>
            <Text style={styles.sectionTitle}>
              Recent LRs ({formatCountPadded(totalLrs)})
            </Text>
            <Pressable onPress={() => router.push("/(tabs)/lrs")}>
              <Text style={styles.viewAll}>View all</Text>
            </Pressable>
          </View>

          <View style={styles.searchRow}>
            <View style={styles.searchContainer}>
              <SearchIcon size={18} color={COLORS.textDark} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search"
                placeholderTextColor={COLORS.textDark}
                value={search}
                onChangeText={setSearch}
              />
            </View>

            <Pressable
              style={styles.filterButton}
              onPress={() => {
                if (activeFilterCount > 0) {
                  clearFilters();
                  return;
                }
                setShowFilterPanel((prev) => !prev);
              }}
            >
              <Text style={styles.filterText}>Filter</Text>
              {activeFilterCount > 0 ? (
                <CloseIcon size={10} color="#000000" />
              ) : (
                <FilterIcon size={10} color="#000000" />
              )}
              {activeFilterCount > 0 ? (
                <View style={styles.filterBadge}>
                  <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
                </View>
              ) : null}
            </Pressable>
          </View>

          {showFilterPanel ? (
            <View style={styles.filterChipsWrap}>
              <AdminFilterChips
                counts={statusCounts}
                activeStatuses={statusFilters}
                onToggle={toggleStatusFilter}
              />
            </View>
          ) : null}

          <View style={styles.listArea}>
            {loading ? (
              <ActivityIndicator
                size="large"
                color={COLORS.primary}
                style={styles.loader}
              />
            ) : filteredLrs.length === 0 ? (
              <View style={[styles.emptyState, { paddingBottom: contentBottom }]}>
                <Image
                  source={require("../../assets/images/empty_state.png")}
                  style={styles.emptyImage}
                  resizeMode="contain"
                />
                <Text style={styles.emptyTitle}>No LRs Found.</Text>
              </View>
            ) : (
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[
                  styles.listContent,
                  { paddingBottom: contentBottom },
                ]}
                refreshControl={
                  <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
              >
                {filteredLrs.map((lr) => (
                  <ExecutiveLRCard key={lr.id} lr={lr} />
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primaryGradientEnd,
  },
  header: {
    zIndex: 2,
  },
  headerInner: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flexShrink: 1,
    alignSelf: "flex-start",
  },
  headerIconButton: {
    padding: 4,
    borderRadius: 60,
  },
  statGridWrap: {
    marginBottom: 16,
  },
  avatar: {
    padding: 12,
    borderRadius: 60,
    backgroundColor: COLORS.headerAvatarBg,
    alignItems: "center",
    justifyContent: "center",
  },
  greeting: {
    fontSize: FONT_SIZES.xl,
    fontFamily: FONTS.semiBold,
    color: COLORS.white,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 12,
  },
  rejectedBanner: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.white,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: "rgba(255, 255, 255, 0.07)",
  },
  rejectedIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 0.6,
    borderColor: "rgba(255, 255, 255, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  rejectedBannerText: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.regular,
    color: COLORS.white,
  },
  rejectedBannerPlaceholder: {
    flex: 1,
  },
  createButton: {
    width: 107,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "rgba(255, 255, 255, 0.11)",
  },
  createButtonText: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.regular,
    color: COLORS.white,
  },
  content: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    overflow: "hidden",
  },
  contentBody: {
    flex: 1,
    paddingTop: 20,
    paddingHorizontal: 24,
  },
  contentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    flex: 1,
    fontSize: FONT_SIZES.xl,
    fontFamily: FONTS.semiBold,
    color: COLORS.black,
  },
  viewAll: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.regular,
    color: COLORS.black,
    flexShrink: 0,
  },
  searchRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 16,
    paddingTop: 4,
  },
  searchContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 11,
    gap: 8,
    minHeight: 40,
  },
  searchInput: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.regular,
    color: COLORS.textDark,
    padding: 0,
  },
  filterButton: {
    width: 74,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.backgroundSecondary,
    borderWidth: 1,
    borderColor: "#929292",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 10,
    minHeight: 40,
    position: "relative",
  },
  filterText: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.regular,
    color: COLORS.textDark,
  },
  filterBadge: {
    position: "absolute",
    top: -8,
    right: -8,
    minWidth: 19,
    height: 19,
    borderRadius: 50,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  filterBadgeText: {
    fontSize: 10,
    fontFamily: FONTS.regular,
    color: COLORS.white,
    lineHeight: 12,
  },
  filterChipsWrap: {
    marginBottom: 16,
  },
  listArea: {
    flex: 1,
  },
  listContent: {
    gap: 12,
    paddingTop: 4,
  },
  loader: {
    marginTop: 40,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 40,
  },
  emptyImage: {
    width: 160,
    height: 160,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: FONT_SIZES.lg,
    fontFamily: FONTS.semiBold,
    color: COLORS.black,
  },
});
