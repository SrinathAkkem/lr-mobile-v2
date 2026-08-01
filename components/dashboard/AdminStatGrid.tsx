import { View, Text, StyleSheet, Dimensions } from "react-native";
import type { DashboardStats } from "../../types";
import { COLORS, FONT_SIZES } from "../../constants/theme";
import { FONTS } from "../../constants/fonts";
import { formatStatValue } from "../../lib/dashboard-utils";
import {
  ApprovedStatIcon,
  DeliveredStatIcon,
  PendingStatIcon,
  RejectedStatIcon,
} from "../icons";

const SCREEN_WIDTH = Dimensions.get("window").width;
const STAT_CARD_WIDTH = (SCREEN_WIDTH - 48 - 16) / 2;

type AdminStatGridProps = {
  stats: DashboardStats | null;
};

const STAT_ITEMS = [
  {
    key: "pending" as const,
    label: "Pending",
    icon: PendingStatIcon,
    showBadge: true,
  },
  {
    key: "rejected" as const,
    label: "Rejected",
    icon: RejectedStatIcon,
  },
  {
    key: "approved" as const,
    label: "Approved",
    icon: ApprovedStatIcon,
  },
  {
    key: "delivered" as const,
    label: "Delivered",
    icon: DeliveredStatIcon,
  },
];

export function AdminStatGrid({ stats }: AdminStatGridProps) {
  return (
    <View style={styles.grid}>
      {STAT_ITEMS.map((item) => {
        const value = stats?.[item.key] ?? 0;
        const Icon = item.icon;

        return (
          <View key={item.key} style={styles.card}>
            <View style={styles.iconWrap}>
              <Icon size={24} />
            </View>
            <View style={styles.info}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>{item.label}</Text>
                {item.showBadge && value > 0 ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{value}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.value}>{formatStatValue(value)}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    rowGap: 14,
  },
  card: {
    width: STAT_CARD_WIDTH,
    minHeight: 59,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    padding: 8,
    borderRadius: 12,
    backgroundColor: COLORS.statCardBg,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.statIconBorder,
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  label: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.regular,
    color: "rgba(255,255,255,0.70)",
  },
  badge: {
    minWidth: 21,
    height: 11,
    borderRadius: 50,
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  badgeText: {
    fontSize: 8,
    fontFamily: FONTS.regular,
    color: COLORS.black,
  },
  value: {
    fontSize: FONT_SIZES.xxl,
    fontFamily: FONTS.semiBold,
    color: COLORS.white,
  },
});
