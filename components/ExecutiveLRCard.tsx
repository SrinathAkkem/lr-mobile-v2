import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { router } from "expo-router";
import { api } from "../lib/api";
import { getLRDisplayId } from "../lib/lr-utils";
import type { LRRequest } from "../types";
import { COLORS, FONT_SIZES } from "../constants/theme";
import { FONTS } from "../constants/fonts";
import { LRIcon } from "./icons";
import { getExecutiveStatusStyle, formatStatusLabel } from "../lib/dashboard-utils";

// Re-export for backward compatibility
export { EXEC_STATUS_FILTERS, getExecutiveStatusStyle } from "../lib/dashboard-utils";

export function getExecutiveLrNumberColor(status: string) {
  switch (status) {
    case "pending":
      return "#CA8A04";
    case "approved":
    case "in_transit":
    case "delivered":
      return "#065F46";
    case "rejected":
      return "#961C1C";
    default:
      return "#000000";
  }
}

export function getExecutiveFooterDate(lr: LRRequest) {
  const created = new Date(lr.createdAt);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (created >= today) {
    return "Created Today";
  }

  if (lr.status === "approved" || lr.status === "delivered") {
    return created.toISOString().slice(0, 10);
  }

  return created.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function getExecutiveAction(lr: LRRequest) {
  switch (lr.status) {
    case "rejected":
      return { label: "Edit & Resubmit", color: "#961C1C" };
    case "pending":
      return { label: "View", color: "#92400E" };
    case "approved":
    case "in_transit":
      return { label: "Download Pdf", color: "#065F46" };
    case "delivered":
      return { label: "Delivered", color: "#1E40AF" };
    default:
      return { label: "View", color: "#000000" };
  }
}

export async function handleExecutiveLrAction(lr: LRRequest) {
  if (lr.status === "rejected") {
    router.push(`/(tabs)/lrs/${lr.id}?edit=1`);
    return;
  }

  if (lr.status === "approved" || lr.status === "in_transit") {
    // Always go through the authenticated download flow — Linking.openURL()
    // hits the raw pdfUrl without the auth token and gets rejected as
    // Unauthorized.
    const res = await api.downloadLRPdf(lr.id);
    if (!res.success) {
      Alert.alert("Error", res.error || "PDF not available yet.");
    }
    return;
  }

  if (lr.status === "delivered") {
    router.push(`/(tabs)/lrs/${lr.id}`);
    return;
  }

  router.push(`/(tabs)/lrs/${lr.id}`);
}

export function ExecutiveLRCard({ lr }: { lr: LRRequest }) {
  const statusStyle = getExecutiveStatusStyle(lr.status);
  const action = getExecutiveAction(lr);
  const isRejected = lr.status === "rejected";

  return (
    <View style={[styles.card, isRejected && styles.cardRejected]}>
      <TouchableOpacity
        style={styles.cardTop}
        onPress={() => router.push(`/(tabs)/lrs/${lr.id}`)}
        activeOpacity={0.8}
      >
        <View style={styles.iconBox}>
          <LRIcon size={28} color={COLORS.black} />
        </View>
        <View style={styles.cardBody}>
          <Text style={[styles.cardNumber, isRejected && styles.cardNumberRejected]}>
            {getLRDisplayId(lr)}
          </Text>
          <Text style={styles.cardRoute}>
            {lr.originCity} → {lr.destinationCity}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
          <Text style={[styles.statusText, { color: statusStyle.text }]}>
            {formatStatusLabel(lr.status)}
          </Text>
        </View>
      </TouchableOpacity>

      <View style={styles.divider} />

      <View style={styles.cardFooter}>
        <Text style={styles.cardDate}>{getExecutiveFooterDate(lr)}</Text>
        <TouchableOpacity
          onPress={() => handleExecutiveLrAction(lr)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={[styles.cardAction, { color: action.color }]}>{action.label}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: "#E8E8E8",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    padding: 12,
  },
  cardRejected: {
    borderColor: "#961C1C",
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: "#F5F5F7",
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: {
    flex: 1,
    gap: 4,
    paddingRight: 4,
  },
  cardNumber: {
    fontSize: FONT_SIZES.lg,
    fontFamily: FONTS.semiBold,
    color: "#000000",
  },
  cardNumberRejected: {
    color: "#961C1C",
  },
  cardRoute: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.regular,
    color: "#4D4D4D",
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
  divider: {
    height: 1,
    backgroundColor: "rgba(0, 0, 0, 0.10)",
    marginVertical: 10,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardDate: {
    fontSize: 10,
    color: "#4D4D4D",
  },
  cardAction: {
    fontSize: 12,
    fontWeight: "400",
  },
});
