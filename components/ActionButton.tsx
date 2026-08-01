import { TouchableOpacity, Text, StyleSheet, Alert } from "react-native";
import { router } from "expo-router";
import { api } from "../lib/api";
import type { LRRequest } from "../types";
import { FONT_SIZES } from "../constants/theme";

interface ActionButtonProps {
  lr: LRRequest;
  onRefresh?: () => void;
}

export function ActionButton({ lr }: ActionButtonProps) {
  // Always go through the authenticated download flow — Linking.openURL()
  // hits the raw pdfUrl without the auth token and gets rejected as
  // Unauthorized.
  async function handleDownloadPdf() {
    const res = await api.downloadLRPdf(lr.id);
    if (!res.success) {
      Alert.alert("Error", res.error || "PDF not available yet.");
    }
  }

  switch (lr.status) {
    case "rejected":
      return (
        <TouchableOpacity
          style={styles.actionLink}
          onPress={() => router.push(`/(tabs)/lrs/create?editId=${lr.id}`)}
        >
          <Text style={[styles.actionText, { color: "#991B1B" }]}>Edit & Resubmit</Text>
        </TouchableOpacity>
      );
    case "pending":
      return (
        <TouchableOpacity
          style={styles.actionLink}
          onPress={() => router.push(`/(tabs)/lrs/${lr.id}`)}
        >
          <Text style={[styles.actionText, { color: "#92400E" }]}>View</Text>
        </TouchableOpacity>
      );
    case "approved":
    case "in_transit":
      return (
        <TouchableOpacity style={styles.actionLink} onPress={handleDownloadPdf}>
          <Text style={[styles.actionText, { color: "#065F46" }]}>
            {lr.status === "in_transit" ? "View / PDF" : "Download Pdf"}
          </Text>
        </TouchableOpacity>
      );
    case "delivered":
      return (
        <TouchableOpacity
          style={styles.actionLink}
          onPress={() => router.push(`/(tabs)/lrs/${lr.id}`)}
        >
          <Text style={[styles.actionText, { color: "#1E40AF" }]}>Delivered</Text>
        </TouchableOpacity>
      );
    default:
      return null;
  }
}

const styles = StyleSheet.create({
  actionLink: {
    alignSelf: "flex-start",
  },
  actionText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: "600",
  },
});
