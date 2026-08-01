import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { router, useFocusEffect } from "expo-router";
import { useAuth } from "../../lib/auth";
import { api, getToken } from "../../lib/api";
import { apiCache } from "../../lib/cache";
import type { LRRequest } from "../../types";
import { COLORS, SPACING, FONT_SIZES } from "../../constants/theme";
import { FONTS } from "../../constants/fonts";
import { EmptyState } from "../../components/EmptyState";
import { ActionButton } from "../../components/ActionButton";
import { DateRangePicker, type DateRange } from "../../components/DateRangePicker";
import { AdminFilterChips } from "../../components/dashboard/AdminFilterChips";
import {
  CloseIcon,
  FilterIcon,
  LRIcon,
  SearchIcon,
} from "../../components/icons";
import {
  countByStatus,
  matchesStatusFilter,
  toIsoDate,
  type LRStatusKey,
} from "../../lib/dashboard-utils";
import { ExecutiveLRCard } from "../../components/ExecutiveLRCard";
import { getLRDisplayId, matchesLRSearch } from "../../lib/lr-utils";
import { useContentBottomPadding } from "../../hooks/useScreenInsets";

const ADMIN_STATUS_FILTERS = [
  {
    status: "pending",
    label: "Pending",
    color: "#92400E",
    bg: "#FEF3C7",
    border: "#F59E0B",
  },
  {
    status: "rejected",
    label: "Rejected",
    color: "#991B1B",
    bg: "#FECACA",
    border: "#F87171",
  },
  {
    status: "approved",
    label: "Approved",
    color: "#065F46",
    bg: "#D1FAE5",
    border: "#34D399",
  },
  {
    status: "delivered",
    label: "Delivered",
    color: "#1E40AF",
    bg: "#DBEAFE",
    border: "#60A5FA",
  },
] as const;

function getAdminStatusStyle(status: string) {
  const match = ADMIN_STATUS_FILTERS.find((item) => item.status === status);
  if (match) {
    return { bg: match.bg, text: match.color };
  }
  return { bg: "#FEF3C7", text: "#92400E" };
}

function AdminLRItem({ lr, showActions }: { lr: LRRequest; showActions: boolean }) {
  const statusStyle = getAdminStatusStyle(lr.status);
  const createdDate = new Date(lr.createdAt);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const isToday = createdDate >= today;
  const isYesterday = createdDate >= yesterday && createdDate < today;

  const timeLabel = isToday
    ? createdDate.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "";

  const dateLabel = isToday
    ? "Today"
    : isYesterday
      ? "Yesterday"
      : createdDate.toLocaleDateString("en-GB", {
          day: "numeric",
          month: "long",
          year: "numeric",
        });

  return (
    <TouchableOpacity
      style={adminStyles.lrItem}
      onPress={() => router.push(`/(tabs)/lrs/${lr.id}`)}
    >
      <View style={adminStyles.lrContent}>
        <LRIcon size={24} />
        <View style={adminStyles.lrInfo}>
          <Text style={adminStyles.lrCreatedDate}>
            Created on{" "}
            {createdDate.toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </Text>
          <Text style={adminStyles.lrNumber}>{getLRDisplayId(lr)}</Text>
          <View style={adminStyles.lrRoute}>
            <Text style={adminStyles.lrRouteText}>{lr.originCity}</Text>
            <Text style={adminStyles.lrArrow}> → </Text>
            <Text style={adminStyles.lrRouteText}>{lr.destinationCity}</Text>
          </View>
          {showActions ? <ActionButton lr={lr} /> : null}
        </View>
      </View>

      <View style={adminStyles.lrStatus}>
        <View style={[adminStyles.statusBadge, { backgroundColor: statusStyle.bg }]}>
          <Text style={[adminStyles.statusText, { color: statusStyle.text }]}>
            {lr.status.charAt(0).toUpperCase() + lr.status.slice(1)}
          </Text>
        </View>
        {timeLabel ? <Text style={adminStyles.lrTime}>{timeLabel}</Text> : null}
        <Text style={adminStyles.lrDate}>{dateLabel}</Text>
      </View>
    </TouchableOpacity>
  );
}

function computeStats(lrs: LRRequest[]) {
  return countByStatus(lrs);
}

function ExecutiveLRsScreen() {
  const [lrs, setLrs] = useState<LRRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const contentBottom = useContentBottomPadding();
  const initialLoadDone = useRef(false);

  const load = useCallback(async (forceClear = false) => {
    const token = await getToken();
    if (!token) return;

    // Only clear cache on explicit refresh
    if (forceClear) {
      apiCache.clear("/api/lr");
    }

    const res = await api.getLRs();
    if (res.success && res.data) {
      setLrs(res.data);
    } else if (res.error) {
      Alert.alert("Error", res.error);
    }
  }, []);

  // Use only useFocusEffect to handle both mount and focus
  useFocusEffect(
    useCallback(() => {
      if (!initialLoadDone.current) {
        initialLoadDone.current = true;
        (async () => {
          setLoading(true);
          await load(false);
          setLoading(false);
        })();
      } else {
        void load(false);
      }
    }, [load]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load(true);
    setRefreshing(false);
  };

  const stats = useMemo(() => computeStats(lrs), [lrs]);

  const filteredLrs = useMemo(() => {
    return lrs.filter((lr) => {
      const matchesSearch = matchesLRSearch(lr, search);
      const matchesStatus =
        statusFilters.length === 0 || matchesStatusFilter(lr, statusFilters);
      return matchesSearch && matchesStatus;
    });
  }, [lrs, search, statusFilters]);

  const toggleStatusFilter = (status: LRStatusKey) => {
    setStatusFilters((prev) =>
      prev.includes(status)
        ? prev.filter((item) => item !== status)
        : [...prev, status],
    );
  };

  return (
    <View style={execStyles.container}>
      <StatusBar style="light" />
      <View style={execStyles.statusBarFill}>
        <SafeAreaView edges={["top"]} />
      </View>

      <View style={execStyles.body}>
        <View style={execStyles.headerRow}>
          <Text style={execStyles.title}>LRs</Text>
          <TouchableOpacity
            style={execStyles.createButton}
            onPress={() => router.push("/(tabs)/lrs/create")}
          >
            <Text style={execStyles.createButtonText}>+ Create LR</Text>
          </TouchableOpacity>
        </View>

        <View style={execStyles.searchContainer}>
          <SearchIcon size={16} color="#999999" />
          <TextInput
            style={execStyles.searchText}
            placeholder="Search by LR number"
            placeholderTextColor="#999999"
            value={search}
            onChangeText={setSearch}
          />
        </View>

        <View style={execStyles.filterChipsWrap}>
          <AdminFilterChips
            counts={stats}
            activeStatuses={statusFilters}
            onToggle={toggleStatusFilter}
          />
        </View>

        <Text style={execStyles.sectionTitle}>Latest LR</Text>

        {loading ? (
          <ActivityIndicator
            size="large"
            color={COLORS.primary}
            style={execStyles.loader}
          />
        ) : filteredLrs.length === 0 ? (
          <EmptyState
            imageSource={require("../../assets/images/empty_state.png")}
            title="No LRs Found."
            actionLabel="Create LR"
            onAction={() => router.push("/(tabs)/lrs/create")}
          />
        ) : (
          <ScrollView
            style={execStyles.scrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              execStyles.listContent,
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
  );
}

function AdminLRsScreen() {
  const { user } = useAuth();
  const isExecutive = user?.role === "executive";

  const [lrs, setLrs] = useState<LRRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | null>(null);
  const contentBottom = useContentBottomPadding();
  const initialLoadDone = useRef(false);

  const activeFilterCount =
    statusFilters.length + (dateRange ? 1 : 0) + (search.trim() ? 1 : 0);

  const load = useCallback(async (forceClear = false) => {
    const token = await getToken();
    if (!token) return;

    // Only clear cache on explicit refresh
    if (forceClear) {
      apiCache.clear("/api/lr");
    }

    const res = await api.getLRs({
      search: search.trim() || undefined,
      from: dateRange ? toIsoDate(dateRange.start) : undefined,
      to: dateRange ? toIsoDate(dateRange.end) : undefined,
    });
    if (res.success && res.data) {
      setLrs(res.data);
    } else if (res.error) {
      Alert.alert("Error", res.error);
    }
  }, [dateRange, search]);

  // Use only useFocusEffect - handles both mount and focus
  useFocusEffect(
    useCallback(() => {
      if (!initialLoadDone.current) {
        initialLoadDone.current = true;
        (async () => {
          setLoading(true);
          await load(false);
          setLoading(false);
        })();
      } else {
        void load(false);
      }
    }, [load]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load(true);
    setRefreshing(false);
  };

  const statusCounts = useMemo(() => countByStatus(lrs), [lrs]);

  const filteredLrs = useMemo(() => {
    if (statusFilters.length === 0) return lrs;
    return lrs.filter((lr) => matchesStatusFilter(lr, statusFilters));
  }, [lrs, statusFilters]);

  const toggleStatusFilter = (status: LRStatusKey) => {
    setStatusFilters((prev) =>
      prev.includes(status)
        ? prev.filter((item) => item !== status)
        : [...prev, status],
    );
  };

  const clearFilters = () => {
    setStatusFilters([]);
    setDateRange(null);
    setSearch("");
    setShowFilterPanel(false);
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const todayLrs = filteredLrs.filter((lr) => new Date(lr.createdAt) >= today);
  const yesterdayLrs = filteredLrs.filter(
    (lr) =>
      new Date(lr.createdAt) >= yesterday && new Date(lr.createdAt) < today
  );
  const historicalLrs = filteredLrs.filter(
    (lr) => new Date(lr.createdAt) < yesterday
  );

  const renderSection = (title: string, items: LRRequest[]) => {
    if (items.length === 0) return null;

    return (
      <View style={adminStyles.dateSection}>
        <Text style={adminStyles.dateSectionTitle}>{title}</Text>
        {items.map((lr, index) => (
          <View key={lr.id}>
            <AdminLRItem lr={lr} showActions={isExecutive} />
            {index < items.length - 1 ? <View style={adminStyles.separator} /> : null}
          </View>
        ))}
      </View>
    );
  };

  return (
    <View style={adminStyles.container}>
      <StatusBar style="dark" />

      <SafeAreaView edges={["top"]} style={adminStyles.header}>
        <Text style={adminStyles.headerTitle}>LRs History</Text>
      </SafeAreaView>

      <View style={adminStyles.content}>
        {showFilterPanel ? (
          <View style={adminStyles.datePickerRow}>
            <DateRangePicker
              variant="figma"
              value={dateRange}
              onChange={setDateRange}
            />
          </View>
        ) : null}

        <View style={adminStyles.searchRow}>
          <View
            style={[
              adminStyles.searchContainer,
              showFilterPanel && adminStyles.searchContainerFull,
            ]}
          >
            <SearchIcon size={18} color={COLORS.textDark} />
            <TextInput
              style={adminStyles.searchText}
              placeholder="Search by LR number or executive name"
              placeholderTextColor={COLORS.textMuted}
              value={search}
              onChangeText={setSearch}
            />
          </View>

          {!showFilterPanel ? (
            <TouchableOpacity
              style={adminStyles.filterButton}
              onPress={() => {
                if (activeFilterCount > 0) {
                  clearFilters();
                  return;
                }
                setShowFilterPanel(true);
              }}
            >
              <Text style={adminStyles.filterText}>Filter</Text>
              {activeFilterCount > 0 ? (
                <CloseIcon size={10} color="#000000" />
              ) : (
                <FilterIcon size={10} color="#000000" />
              )}
              {activeFilterCount > 0 ? (
                <View style={adminStyles.filterBadge}>
                  <Text style={adminStyles.filterBadgeText}>{activeFilterCount}</Text>
                </View>
              ) : null}
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={adminStyles.filterChipsWrap}>
          <AdminFilterChips
            counts={statusCounts}
            activeStatuses={statusFilters}
            onToggle={toggleStatusFilter}
          />
        </View>

        {loading ? (
          <ActivityIndicator
            size="large"
            color={COLORS.primary}
            style={adminStyles.loader}
          />
        ) : (
          <ScrollView
            style={adminStyles.scrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              adminStyles.scrollContent,
              { paddingBottom: contentBottom },
            ]}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            {filteredLrs.length === 0 ? (
              <EmptyState
                imageSource={require("../../assets/images/empty_state.png")}
                title="No LRs Found."
              />
            ) : (
              <>
                {renderSection("Today", todayLrs)}
                {renderSection("Yesterday", yesterdayLrs)}
                {renderSection("Historical", historicalLrs)}
              </>
            )}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

export default function LRsScreen() {
  const { user } = useAuth();
  if (user?.role === "executive") {
    return <ExecutiveLRsScreen />;
  }
  return <AdminLRsScreen />;
}

const execStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  statusBarFill: {
    backgroundColor: COLORS.primary,
  },
  body: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  title: {
    fontSize: FONT_SIZES.xl,
    fontFamily: FONTS.bold,
    color: COLORS.black,
  },
  createButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  createButtonText: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.semiBold,
    color: COLORS.white,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.backgroundSecondary,
    marginBottom: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 24,
    gap: 8,
    minHeight: 44,
  },
  searchText: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.regular,
    color: COLORS.black,
    padding: 0,
  },
  filterChipsWrap: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.xl,
    fontFamily: FONTS.bold,
    color: COLORS.black,
    marginBottom: 12,
  },
  loader: {
    marginTop: 40,
  },
  scrollView: {
    flex: 1,
  },
  listContent: {
    gap: 12,
    paddingBottom: 8,
  },
});

const adminStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.md,
  },
  headerTitle: {
    fontSize: FONT_SIZES.xl,
    fontFamily: FONTS.semiBold,
    color: COLORS.black,
  },
  datePickerRow: {
    paddingHorizontal: SPACING.lg,
    marginBottom: 12,
    width: "100%",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: SPACING.lg,
    marginBottom: 16,
  },
  content: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  searchContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.backgroundSecondary,
    paddingHorizontal: 10,
    paddingVertical: 11,
    borderRadius: 12,
    gap: 8,
    minHeight: 40,
  },
  searchContainerFull: {
    width: "100%",
  },
  searchText: {
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
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  loader: {
    marginTop: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
  },
  dateSection: {
    marginBottom: 24,
  },
  dateSectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000000",
    marginBottom: 12,
  },
  lrItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingVertical: 16,
  },
  lrContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    flex: 1,
  },
  lrIconImage: {
    width: 48,
    height: 48,
  },
  lrInfo: {
    flex: 1,
    gap: 2,
  },
  lrCreatedDate: {
    fontSize: 10,
    color: COLORS.primary,
    fontWeight: "400",
    marginBottom: 2,
  },
  lrNumber: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000000",
  },
  lrRoute: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  lrRouteText: {
    fontSize: 12,
    color: "#4D4D4D",
    fontWeight: "400",
  },
  lrArrow: {
    fontSize: 12,
    color: "#4D4D4D",
  },
  lrStatus: {
    alignItems: "flex-end",
    gap: 6,
    minWidth: 80,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "500",
  },
  lrTime: {
    fontSize: 12,
    color: "#000000",
    fontWeight: "600",
    textAlign: "right",
  },
  lrDate: {
    fontSize: 10,
    color: "#4D4D4D",
    fontWeight: "400",
    textAlign: "right",
  },
  separator: {
    height: 1,
    backgroundColor: "#F0F0F0",
  },
});
