import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Pressable,
  Image,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { router } from "expo-router";
import { COLORS, SPACING } from "../../constants/theme";
import { FONTS } from "../../constants/fonts";
import { api } from "../../lib/api";
import { apiCache } from "../../lib/cache";
import { useContentBottomPadding } from "../../hooks/useScreenInsets";
import {
  ChevronDownIcon,
  ExportIcon,
  LRIcon,
} from "../icons";

type RouteReport = {
  id: string;
  route: string;
  from: string;
  to: string;
  totalLR: number;
  freightValue: number;
  activeLRCount: number;
  activeLRs?: Array<{
    id: string;
    lrNumber: string;
    from: string;
    to: string;
    time: string;
    date: string;
  }>;
};

type ReportData = {
  totalLRsThisMonth: number;
  freightTotal: number;
  monthName: string;
  year: number;
  topRoutes: RouteReport[];
};

function formatNumber(value: number) {
  return value.toLocaleString("en-IN");
}

function LrBadge({ count }: { count: number }) {
  return (
    <View style={styles.lrBadge}>
      <View style={styles.lrBadgeDot} />
      <Text style={styles.lrBadgeText}>{count} LR</Text>
    </View>
  );
}

function RouteItem({
  route,
  index,
  isExpanded,
  onToggle,
}: {
  route: RouteReport;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <View style={[styles.routeItem, isExpanded && styles.routeItemExpanded]}>
      <Pressable style={styles.routeHeader} onPress={onToggle}>
        <View style={styles.routeHeaderContent}>
          <Text style={styles.routeNumber}>{index}</Text>
          <Text style={styles.routeName}>{route.route}</Text>
        </View>
        <ChevronDownIcon
          size={20}
          color={COLORS.black}
        />
      </Pressable>

      {isExpanded ? (
        <View style={styles.routeDetails}>
          {route.activeLRCount > 0 ? (
            <View style={styles.activeLRRow}>
              <Text style={styles.activeLRLabel}>Active LR</Text>
              <LrBadge count={route.activeLRCount} />
            </View>
          ) : null}

          {route.activeLRs?.map((lr) => (
            <Pressable
              key={lr.id}
              style={styles.lrCard}
              onPress={() => router.push(`/(tabs)/lrs/${lr.id}`)}
            >
              <View style={styles.lrIconBox}>
                <LRIcon size={24} color={COLORS.black} />
              </View>
              <View style={styles.lrInfo}>
                <Text style={styles.lrNumber}>{lr.lrNumber}</Text>
                <Text style={styles.lrRouteText}>
                  {lr.from} → {lr.to}
                </Text>
              </View>
              <View style={styles.lrTime}>
                <Text style={styles.lrTimeText}>{lr.time}</Text>
                <Text style={styles.lrDateText}>{lr.date}</Text>
              </View>
            </Pressable>
          ))}

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Total LR</Text>
              <Text style={styles.statValueBlue}>{formatNumber(route.totalLR)}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Total Freight Value</Text>
              <Text style={styles.statValueGreen}>
                {formatNumber(route.freightValue)}
              </Text>
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}

export function AdminReports() {
  const [expandedRoute, setExpandedRoute] = useState<string | null>(null);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exporting, setExporting] = useState(false);
  const contentBottom = useContentBottomPadding();

  useEffect(() => {
    loadReports();
  }, []);

  async function loadReports(forceClear = false) {
    setLoading(true);
    
    // Only clear cache on explicit refresh
    if (forceClear) {
      apiCache.clear("/api/reports");
    }
    
    const res = await api.getReports();
    if (res.success && res.data) {
      setReportData(res.data);
      if (res.data.topRoutes.length > 0) {
        setExpandedRoute(res.data.topRoutes[0].id);
      }
    } else if (res.error) {
      Alert.alert("Error", res.error);
    }
    setLoading(false);
  }

  async function handleExport(format: "pdf" | "csv") {
    setShowExportMenu(false);
    setExporting(true);
    const res = await api.exportReport(format);
    setExporting(false);

    if (!res.success) {
      Alert.alert("Error", res.error || "Failed to export report");
    }
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Reports</Text>
          <Pressable
            onPress={() => setShowExportMenu(true)}
            disabled={exporting || !reportData}
            style={({ pressed }) => [
              styles.exportButton,
              pressed && styles.pressed,
              (exporting || !reportData) && styles.exportButtonDisabled,
            ]}
          >
            <ExportIcon />
            <Text style={styles.exportText}>Export as</Text>
            <ChevronDownIcon size={13} color={COLORS.white} />
          </Pressable>
        </View>

        {loading ? (
          <ActivityIndicator
            size="large"
            color={COLORS.primary}
            style={styles.loader}
          />
        ) : !reportData ? (
          <View style={styles.loader}>
            <Text style={styles.emptyText}>No report data available</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: contentBottom },
            ]}
          >
            <View style={styles.summaryCard}>
              <View style={styles.summaryIconContainer}>
                <LRIcon size={24} color={COLORS.black} />
              </View>
              <View style={styles.summaryContent}>
                <Text style={styles.summaryLabel}>Total LRs</Text>
                <Text style={styles.summaryValue}>
                  {formatNumber(reportData.totalLRsThisMonth)}
                </Text>
                <Text style={styles.summarySubtext}>All LRs on record</Text>
              </View>
            </View>

            <View style={styles.summaryCard}>
              <View style={styles.summaryIconContainer}>
                <Image
                  source={require("../../assets/images/truck_icon.png")}
                  style={styles.summaryIconImage}
                />
              </View>
              <View style={styles.summaryContent}>
                <Text style={styles.summaryLabel}>Freight Value Total</Text>
                <Text style={styles.summaryValueGreen}>
                  ₹ {formatNumber(reportData.freightTotal)}
                </Text>
                <Text style={styles.summarySubtext}>
                  Total freight across all LRs
                </Text>
              </View>
            </View>

            <View style={styles.routesCard}>
              <Text style={styles.routesHeader}>Top 5 Routes</Text>
              <View style={styles.routesList}>
                {reportData.topRoutes.map((route, index) => (
                  <RouteItem
                    key={route.id}
                    route={route}
                    index={index + 1}
                    isExpanded={expandedRoute === route.id}
                    onToggle={() =>
                      setExpandedRoute(
                        expandedRoute === route.id ? null : route.id,
                      )
                    }
                  />
                ))}
              </View>
            </View>
          </ScrollView>
        )}
      </SafeAreaView>

      <Modal
        visible={showExportMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowExportMenu(false)}
      >
        <Pressable
          style={styles.menuOverlay}
          onPress={() => setShowExportMenu(false)}
        >
          <View style={styles.exportMenu}>
            <Pressable
              style={styles.exportOption}
              onPress={() => handleExport("pdf")}
            >
              <Text style={styles.exportOptionText}>PDF</Text>
            </Pressable>
            <View style={styles.exportDivider} />
            <Pressable
              style={styles.exportOption}
              onPress={() => handleExport("csv")}
            >
              <Text style={styles.exportOptionText}>CSV</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {exporting ? (
        <View style={styles.exportingOverlay}>
          <ActivityIndicator size="large" color={COLORS.white} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: 18,
    color: COLORS.black,
  },
  exportButton: {
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  exportButtonDisabled: {
    opacity: 0.6,
  },
  exportText: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.white,
  },
  pressed: {
    opacity: 0.85,
  },
  loader: {
    marginTop: 40,
    alignItems: "center",
  },
  emptyText: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textMuted,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    gap: 12,
  },
  summaryCard: {
    backgroundColor: COLORS.backgroundSecondary,
    padding: 12,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  summaryIconContainer: {
    backgroundColor: COLORS.white,
    padding: 12,
    borderRadius: 8,
  },
  summaryIconImage: {
    width: 24,
    height: 24,
    resizeMode: "contain",
  },
  summaryContent: {
    flex: 1,
    gap: 11,
  },
  summaryLabel: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.black,
    textTransform: "uppercase",
  },
  summaryValue: {
    fontFamily: FONTS.semiBold,
    fontSize: 24,
    color: COLORS.black,
  },
  summaryValueGreen: {
    fontFamily: FONTS.semiBold,
    fontSize: 24,
    color: COLORS.success,
  },
  summarySubtext: {
    fontFamily: FONTS.regular,
    fontSize: 10,
    color: COLORS.textSecondary,
  },
  routesCard: {
    backgroundColor: COLORS.backgroundSecondary,
    padding: 12,
    borderRadius: 12,
    gap: 12,
  },
  routesHeader: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.black,
    textAlign: "center",
    textTransform: "uppercase",
  },
  routesList: {
    gap: 6,
  },
  routeItem: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "transparent",
  },
  routeItemExpanded: {
    borderColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  routeHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  routeHeaderContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    flex: 1,
  },
  routeNumber: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: COLORS.black,
    minWidth: 16,
  },
  routeName: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    color: COLORS.black,
    flex: 1,
  },
  routeDetails: {
    gap: 12,
  },
  activeLRRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.modalBg,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 8,
  },
  activeLRLabel: {
    fontFamily: FONTS.regular,
    fontSize: 10,
    color: COLORS.black,
    textTransform: "uppercase",
  },
  lrBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: COLORS.approved,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  lrBadgeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.success,
  },
  lrBadgeText: {
    fontFamily: FONTS.semiBold,
    fontSize: 10,
    color: COLORS.success,
  },
  lrCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    backgroundColor: COLORS.modalBg,
    borderRadius: 8,
    padding: 8,
  },
  lrIconBox: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: COLORS.white,
  },
  lrIconImage: {
    width: 24,
    height: 24,
    resizeMode: "contain",
  },
  lrInfo: {
    flex: 1,
    gap: 4,
  },
  lrNumber: {
    fontFamily: FONTS.semiBold,
    fontSize: 16,
    color: COLORS.black,
  },
  lrRouteText: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  lrTime: {
    alignItems: "flex-end",
    gap: 4,
  },
  lrTimeText: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    color: COLORS.black,
  },
  lrDateText: {
    fontFamily: FONTS.regular,
    fontSize: 10,
    color: COLORS.textSecondary,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.backgroundSecondary,
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  statLabel: {
    fontFamily: FONTS.regular,
    fontSize: 10,
    color: COLORS.black,
    textTransform: "uppercase",
  },
  statValueBlue: {
    fontFamily: FONTS.semiBold,
    fontSize: 24,
    color: COLORS.info,
  },
  statValueGreen: {
    fontFamily: FONTS.semiBold,
    fontSize: 24,
    color: COLORS.success,
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.15)",
  },
  exportMenu: {
    position: "absolute",
    top: 96,
    right: SPACING.lg,
    backgroundColor: COLORS.white,
    borderRadius: 8,
    padding: 8,
    minWidth: 65,
    shadowColor: "#000",
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    gap: 10,
  },
  exportOption: {
    alignItems: "center",
    paddingVertical: 4,
  },
  exportOptionText: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.black,
  },
  exportDivider: {
    height: 1,
    backgroundColor: COLORS.divider,
  },
  exportingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0, 0, 0, 0.35)",
    justifyContent: "center",
    alignItems: "center",
  },
});
