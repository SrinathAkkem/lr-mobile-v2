import { View, Text, StyleSheet, Pressable } from "react-native";
import { router } from "expo-router";
import type { LRRequest } from "../../types";
import { COLORS, FONT_SIZES } from "../../constants/theme";
import { FONTS } from "../../constants/fonts";
import {
  getAdminStatusStyle,
  getCreatedLabel,
  getCreatedLabelColor,
  getRelativeDateLabel,
  getRowDateLabel,
} from "../../lib/dashboard-utils";
import { getLRDisplayId } from "../../lib/lr-utils";
import { LRIcon, RouteArrowIcon } from "../icons";

type AdminLRRowProps = {
  lr: LRRequest;
  detailedDates?: boolean;
};

export function AdminLRRow({ lr, detailedDates = false }: AdminLRRowProps) {
  const statusStyle = getAdminStatusStyle(lr.status);
  const createdLabel = getCreatedLabel(lr.createdAt);
  const createdColor = detailedDates
    ? COLORS.primary
    : getCreatedLabelColor(lr.createdAt);

  return (
    <Pressable
      style={styles.row}
      onPress={() => router.push(`/(tabs)/lrs/${lr.id}`)}
    >
      <View style={styles.left}>
        <View style={styles.iconBox}>
          <LRIcon size={24} color="#000000" />
        </View>
        <View style={styles.info}>
          <Text style={[styles.createdDate, { color: createdColor }]}>
            {createdLabel}
          </Text>
          <Text style={styles.lrNumber}>{getLRDisplayId(lr)}</Text>
          <View style={styles.routeRow}>
            <Text style={styles.routeText}>{lr.originCity}</Text>
            <RouteArrowIcon />
            <Text style={styles.routeText}>{lr.destinationCity}</Text>
          </View>
        </View>
      </View>

      <View style={styles.right}>
        <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
          <Text style={[styles.statusText, { color: statusStyle.text }]}>
            {lr.status.charAt(0).toUpperCase() + lr.status.slice(1)}
          </Text>
        </View>
        {detailedDates ? (
          <>
            <Text style={styles.datePrimary}>{getRowDateLabel(lr.createdAt)}</Text>
            <Text style={styles.dateSecondary}>
              {getRelativeDateLabel(lr.createdAt)}
            </Text>
          </>
        ) : (
          <Text style={styles.dateDefault}>
            {getRelativeDateLabel(lr.createdAt)}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  left: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 16,
    flex: 1,
  },
  iconBox: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: COLORS.backgroundSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  info: {
    flex: 1,
    gap: 2,
  },
  createdDate: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.regular,
  },
  lrNumber: {
    fontSize: FONT_SIZES.lg,
    fontFamily: FONTS.semiBold,
    color: COLORS.black,
  },
  routeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexWrap: "wrap",
  },
  routeText: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
  },
  right: {
    alignItems: "flex-end",
    gap: 6,
    minWidth: 72,
  },
  statusBadge: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 2,
  },
  statusText: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.regular,
  },
  datePrimary: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.regular,
    color: COLORS.black,
    textAlign: "right",
  },
  dateSecondary: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.regular,
    color: "#666666",
    textAlign: "right",
  },
  dateDefault: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.regular,
    color: COLORS.black,
    textAlign: "right",
  },
});
