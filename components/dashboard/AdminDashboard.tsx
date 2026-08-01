import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  SectionList,
  RefreshControl,
  Alert,
  Pressable,
  Image,
  BackHandler,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { router } from "expo-router";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { useAuth } from "../../lib/auth";
import { absUrl, api, getToken } from "../../lib/api";
import { apiCache } from "../../lib/cache";
import type { DashboardStats, LRRequest } from "../../types";
import { COLORS, FONT_SIZES } from "../../constants/theme";
import { FONTS } from "../../constants/fonts";
import { useContentBottomPadding } from "../../hooks/useScreenInsets";
import {
  countByStatus,
  getFirstName,
  groupLrsByDate,
  matchesStatusFilter,
  resolveDashboardStats,
  type LRStatusKey,
  toIsoDate,
} from "../../lib/dashboard-utils";
import { AdminStatGrid } from "./AdminStatGrid";
import { AdminLRRow } from "./AdminLRRow";
import { AdminFilterChips } from "./AdminFilterChips";
import {
  CloseIcon,
  FilterIcon,
  NotificationIcon,
  SearchIcon,
  UserIcon,
  ChevronBackIcon,
} from "../icons";
import {
  DateRangePicker,
  type DateRange,
} from "../DateRangePicker";

export function AdminDashboard() {
  const { user, loading: authLoading } = useAuth();
  const insets = useSafeAreaInsets();
  const contentBottom = useContentBottomPadding();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [companyLogoUrl, setCompanyLogoUrl] = useState<string | null>(null);
  const [lrs, setLrs] = useState<LRRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | null>(null);

  const isFilterPanelOpen = showFilterPanel;
  const activeFilterCount =
    statusFilters.length + (dateRange ? 1 : 0) + (search.trim() ? 1 : 0);

  useEffect(() => {
    if (!isFilterPanelOpen) return;

    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      setShowFilterPanel(false);
      return true;
    });

    return () => subscription.remove();
  }, [isFilterPanelOpen]);

  const load = useCallback(async (forceClear = false) => {
    const token = await getToken();
    if (!token) return;

    // Only clear cache on explicit refresh (pull-to-refresh)
    if (forceClear) {
      apiCache.clear("/api/lr");
      apiCache.clear("/api/company/dashboard");
      apiCache.clear("/api/reports");
    }

    const [dashboardRes, lrRes] = await Promise.all([
      api.getDashboard(),
      api.getLRs({
        search: search.trim() || undefined,
        from: dateRange ? toIsoDate(dateRange.start) : undefined,
        to: dateRange ? toIsoDate(dateRange.end) : undefined,
      }),
    ]);

    if (dashboardRes.success && dashboardRes.data) {
      setStats(dashboardRes.data.stats);
      setCompanyLogoUrl(dashboardRes.data.company?.logoUrl ?? null);
    } else if (dashboardRes.error) {
      Alert.alert("Error", dashboardRes.error);
    }

    if (lrRes.success && lrRes.data) {
      setLrs(lrRes.data);
      setStats(
        resolveDashboardStats(
          dashboardRes.success ? dashboardRes.data?.stats : null,
          lrRes.data,
        ),
      );
    } else if (lrRes.error) {
      Alert.alert("Error", lrRes.error);
    }
  }, [dateRange, search]);

  // Use only useFocusEffect to handle both mount and focus
  // Avoid duplicate calls by tracking if it's the initial load
  const initialLoadDone = useRef(false);

  useFocusEffect(
    useCallback(() => {
      if (authLoading || !user) return;
      
      if (!initialLoadDone.current) {
        // First load on mount
        initialLoadDone.current = true;
        (async () => {
          setLoading(true);
          await load(false);
          setLoading(false);
        })();
      } else {
        // Subsequent focus - use cache
        void load(false);
      }
    }, [authLoading, user, load]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load(true); // Force cache clear on pull-to-refresh
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
    setDateRange(null);
    setSearch("");
    setShowFilterPanel(false);
  };

  const filteredLrs = useMemo(() => {
    if (statusFilters.length === 0) return lrs;
    return lrs.filter((lr) => matchesStatusFilter(lr, statusFilters));
  }, [lrs, statusFilters]);

  const statusCounts = useMemo(() => countByStatus(lrs), [lrs]);
  const displayStats = useMemo(
    () => resolveDashboardStats(stats, lrs),
    [stats, lrs],
  );
  const sections = useMemo(() => groupLrsByDate(filteredLrs), [filteredLrs]);
  const firstName = getFirstName(user?.name);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
          <Defs>
            <LinearGradient id="adminHeaderGradient" x1="0%" y1="100%" x2="0%" y2="0%">
              <Stop offset="4.79%" stopColor={COLORS.primaryGradientEnd} />
              <Stop offset="65.55%" stopColor={COLORS.primaryGradientEnd} />
              <Stop offset="100%" stopColor={COLORS.primaryGradientStart} />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#adminHeaderGradient)" />
        </Svg>

        <View style={[styles.headerInner, { paddingTop: insets.top + 8 }]}>
          <View style={styles.headerTop}>
            <Pressable
              style={styles.userInfo}
              onPress={() => router.push("/(tabs)/profile")}
              hitSlop={8}
            >
              <View style={styles.avatar}>
                {companyLogoUrl ? (
                  <Image
                    source={{ uri: absUrl(companyLogoUrl) }}
                    style={styles.avatarLogo}
                    resizeMode="cover"
                  />
                ) : (
                  <UserIcon size={20} color="#FFFFFF" />
                )}
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
            <AdminStatGrid stats={displayStats} />
          </View>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.contentBody}>
        {isFilterPanelOpen ? (
          <View style={styles.filterHeader}>
            <View style={styles.filterTitleRow}>
              <Pressable
                onPress={() => setShowFilterPanel(false)}
                style={styles.backButton}
                hitSlop={8}
              >
                <ChevronBackIcon size={20} color={COLORS.black} />
              </Pressable>
              <Text style={styles.sectionTitleFilter} numberOfLines={1}>
                LRs History
              </Text>
            </View>
            <View style={styles.datePickerRow}>
              <DateRangePicker
                variant="figma"
                value={dateRange}
                onChange={setDateRange}
              />
            </View>
          </View>
        ) : (
          <View style={styles.contentHeader}>
            <Text style={styles.sectionTitle} numberOfLines={1}>
              {`Recent LRs (${lrs.length})`}
            </Text>
            <Pressable onPress={() => router.push("/(tabs)/lrs")}>
              <Text style={styles.viewAll}>View all</Text>
            </Pressable>
          </View>
        )}

        <View style={styles.searchRow}>
          <View
            style={[
              styles.searchContainer,
              isFilterPanelOpen && styles.searchContainerFull,
            ]}
          >
            <SearchIcon size={18} color={COLORS.textDark} />
            <TextInput
              style={styles.searchInput}
              placeholder={
                isFilterPanelOpen
                  ? "Search by LR number or executive name"
                  : "Search"
              }
              placeholderTextColor={COLORS.textDark}
              value={search}
              onChangeText={setSearch}
            />
          </View>

          {!isFilterPanelOpen ? (
          <Pressable
            style={styles.filterButton}
            onPress={() => {
              if (activeFilterCount > 0) {
                clearFilters();
                return;
              }
              setShowFilterPanel(true);
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
          ) : null}
        </View>

        {isFilterPanelOpen ? (
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
          <SectionList
            sections={sections}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <AdminLRRow lr={item} detailedDates={isFilterPanelOpen} />
            )}
            renderSectionHeader={({ section: { title } }) => (
              <Text style={styles.groupTitle}>{title}</Text>
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            SectionSeparatorComponent={() => <View style={styles.sectionGap} />}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.listContent,
              { paddingBottom: contentBottom },
            ]}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            stickySectionHeadersEnabled={false}
          />
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
    marginBottom: 0,
  },
  avatar: {
    padding: 12,
    borderRadius: 60,
    backgroundColor: COLORS.headerAvatarBg,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarLogo: {
    width: 44,
    height: 44,
    borderRadius: 22,
    margin: -12,
  },
  greeting: {
    fontSize: FONT_SIZES.xl,
    fontFamily: FONTS.semiBold,
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
  filterHeader: {
    marginBottom: 16,
    gap: 12,
  },
  filterTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  datePickerRow: {
    width: "100%",
    alignSelf: "stretch",
  },
  backButton: {
    padding: 4,
  },
  sectionTitle: {
    flex: 1,
    fontSize: FONT_SIZES.xl,
    fontFamily: FONTS.semiBold,
    color: COLORS.black,
  },
  sectionTitleFilter: {
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
  searchContainerFull: {
    flex: 1,
    width: "100%",
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
  loader: {
    marginTop: 40,
  },
  listContent: {
    flexGrow: 1,
    gap: 18,
  },
  groupTitle: {
    fontSize: FONT_SIZES.xl,
    fontFamily: FONTS.semiBold,
    color: COLORS.black,
    marginBottom: 16,
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.divider,
    marginVertical: 18,
  },
  sectionGap: {
    height: 18,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
    gap: 12,
  },
  emptyImage: {
    width: 267,
    height: 233,
  },
  emptyTitle: {
    fontSize: FONT_SIZES.xl,
    fontFamily: FONTS.semiBold,
    color: COLORS.text,
    textAlign: "center",
  },
});
