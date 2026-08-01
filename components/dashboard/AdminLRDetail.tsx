import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { router } from "expo-router";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { api, API_URL } from "../../lib/api";
import { getLRDisplayId } from "../../lib/lr-utils";
import type { LRRequest } from "../../types";
import { COLORS, FONT_SIZES } from "../../constants/theme";
import { FONTS } from "../../constants/fonts";
import { useContentBottomPadding } from "../../hooks/useScreenInsets";
import { getDetailStatusStyle } from "../../lib/dashboard-utils";
import {
  CameraSectionIcon,
  ChevronBackIcon,
  CloseIcon,
  LRIcon,
  PersonSectionIcon,
  RouteArrowLongIcon,
  ShipmentSectionIcon,
  SignatureSectionIcon,
} from "../icons";

function absUrl(url: string) {
  if (!url) return "";
  if (url.startsWith("http") || url.startsWith("data:") || url.startsWith("file:")) {
    return url;
  }
  return `${API_URL}${url}`;
}

function formatCreatedDate(date: string) {
  if (!date) return "N/A";
  
  const value = new Date(date);
  if (isNaN(value.getTime())) {
    // Try parsing YYYY-MM-DD format
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(date);
    if (match) {
      const [, year, month, day] = match;
      const localDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      if (!isNaN(localDate.getTime())) {
        const day = localDate.getDate();
        const month = localDate.toLocaleDateString("en-GB", { month: "short" });
        const year = localDate.getFullYear().toString().slice(-2);
        return `${day} ${month}'${year}`;
      }
    }
    return "N/A";
  }
  
  const day = value.getDate();
  const month = value.toLocaleDateString("en-GB", { month: "short" });
  const year = value.getFullYear().toString().slice(-2);
  return `${day} ${month}'${year}`;
}

function formatNumber(value: number) {
  return value.toLocaleString("en-IN");
}

function formatPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  if (digits.length === 12 && digits.startsWith("91")) {
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  }
  return phone;
}

function getPaymentStatus(lr: LRRequest) {
  if (lr.paymentMode?.toLowerCase() === "paid") return "Paid";
  return "Pending";
}

function DetailCard({ children }: { children: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

function SectionHeader({
  icon,
  title,
}: {
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      {icon}
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

function DetailRow({
  label,
  value,
  multiline,
}: {
  label: string;
  value: string;
  multiline?: boolean;
}) {
  return (
    <View style={[styles.detailRow, multiline && styles.detailRowMultiline]}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text
        style={[styles.detailValue, multiline && styles.detailValueMultiline]}
      >
        {value}
      </Text>
    </View>
  );
}

function RowDivider() {
  return <View style={styles.rowDivider} />;
}

type AdminLRDetailProps = {
  id: string;
};

export function AdminLRDetail({ id }: AdminLRDetailProps) {
  const [lr, setLr] = useState<LRRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [rejectionModalVisible, setRejectionModalVisible] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // This screen is nested under `(tabs)/lrs/[id].tsx`, so the floating tab
  // bar is always overlaid on top of it — the bottom action bar must
  // reserve space for it (withTabBar defaults to true) or Approve/Reject
  // end up hidden underneath the tab bar.
  const contentBottom = useContentBottomPadding();

  // expo-router reuses this same screen instance when navigating between
  // different LR ids (only the `id` param changes), so local state must be
  // explicitly reset here to avoid leaking modal/reason state across LRs.
  useEffect(() => {
    setLr(null);
    setLoading(true);
    setRejectionModalVisible(false);
    setRejectionReason("");
  }, [id]);

  const loadLR = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const res = await api.getLR(id);
    if (res.success && res.data) {
      setLr(res.data);
    } else if (res.error) {
      Alert.alert("Error", res.error);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    loadLR();
  }, [loadLR]);

  async function handleApprove() {
    if (!id) return;
    setSubmitting(true);
    const res = await api.approveLR(id);
    setSubmitting(false);

    if (res.success) {
      router.back();
      return;
    }

    Alert.alert("Error", res.error || "Failed to approve LR");
  }

  async function handleRejectSubmit() {
    if (!id) return;
    if (!rejectionReason.trim()) {
      Alert.alert("Error", "Please enter a reason for rejection");
      return;
    }

    setSubmitting(true);
    const res = await api.rejectLR(id, rejectionReason.trim());
    setSubmitting(false);

    if (res.success) {
      setRejectionModalVisible(false);
      setRejectionReason("");
      router.back();
      return;
    }

    Alert.alert("Error", res.error || "Failed to reject LR");
  }

  async function handleDownloadPdf() {
    if (!lr) return;
    // Linking.openURL() hits the raw API URL without the auth token and
    // gets rejected as Unauthorized in the external browser. Always go
    // through the authenticated download flow instead.
    setSubmitting(true);
    const res = await api.downloadLRPdf(lr.id);
    setSubmitting(false);

    if (!res.success) {
      Alert.alert("Error", res.error || "PDF not available yet.");
    } else {
      Alert.alert("Downloaded", "LR PDF has been saved.");
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!lr) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>LR not found</Text>
      </View>
    );
  }

  const statusStyle = getDetailStatusStyle(lr.status);
  const statusLabel = lr.status.charAt(0).toUpperCase() + lr.status.slice(1);
  const showPendingActions = lr.status === "pending";
  const showDownloadPdf = lr.status === "approved" || lr.status === "delivered";
  const showActionBar = showPendingActions || showDownloadPdf;
  const scrollPaddingBottom = showActionBar ? contentBottom + 88 : contentBottom + 16;
  
  // Safe date parsing with fallback
  const parseSignatureDate = () => {
    const dateValue = lr.dispatchDate || lr.createdAt;
    if (!dateValue) return new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
    
    const parsedDate = new Date(dateValue);
    if (isNaN(parsedDate.getTime())) {
      // Invalid date, try to extract date parts if it's in YYYY-MM-DD format
      const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateValue);
      if (match) {
        const [, year, month, day] = match;
        const localDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        return localDate.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
      }
      // Fallback to current date if parsing fails
      return new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
    }
    
    return parsedDate.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  };
  
  const signatureDate = parseSignatureDate();

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.statusBarGradient}>
        <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
          <Defs>
            <LinearGradient id="lrDetailStatusBar" x1="0%" y1="100%" x2="0%" y2="0%">
              <Stop offset="4.79%" stopColor={COLORS.primaryGradientEnd} />
              <Stop offset="65.55%" stopColor={COLORS.primaryGradientEnd} />
              <Stop offset="100%" stopColor={COLORS.primaryGradientStart} />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#lrDetailStatusBar)" />
        </Svg>
      </View>

      <SafeAreaView edges={["top"]} style={styles.headerSafeArea}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <ChevronBackIcon />
          </Pressable>
          <Text style={styles.headerTitle}>LR Detail</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.statusText, { color: statusStyle.text }]}>
              {statusLabel}
            </Text>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: scrollPaddingBottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <DetailCard>
          <View style={styles.lrSummaryRow}>
            <View style={styles.lrSummaryLeft}>
              <View style={styles.lrIconBox}>
                <LRIcon size={24} color="#000000" />
              </View>
              <View>
                <Text style={styles.metaLabel}>LR Number</Text>
                <Text style={styles.metaValue}>{getLRDisplayId(lr)}</Text>
              </View>
            </View>
            <View style={styles.lrSummaryRight}>
              <Text style={styles.createdLabel}>Created on</Text>
              <Text style={styles.metaValue}>{formatCreatedDate(lr.createdAt)}</Text>
            </View>
          </View>

          <View style={styles.sectionGap} />

          <SectionHeader
            icon={<PersonSectionIcon />}
            title="Consigner Details"
          />
          <View style={styles.sectionBody}>
            <DetailRow label="Consigner Name" value={lr.consignorName || "—"} />
            <RowDivider />
            <DetailRow
              label="Consigner Address"
              value={lr.consignorAddress || "—"}
              multiline
            />
          </View>
        </DetailCard>

        <DetailCard>
          <SectionHeader
            icon={<PersonSectionIcon />}
            title="Consignee Details"
          />
          <View style={styles.sectionBody}>
            {lr.consigneeCompany ? (
              <>
                <DetailRow label="Company Name" value={lr.consigneeCompany} />
                <RowDivider />
              </>
            ) : null}
            <DetailRow label="Consignee Name" value={lr.consigneeName || "—"} />
            <RowDivider />
            <DetailRow
              label="Consignee Address"
              value={lr.consigneeAddress || "—"}
              multiline
            />
            <RowDivider />
            <DetailRow
              label="Consignee Mobile No"
              value={lr.consigneePhone ? formatPhone(lr.consigneePhone) : "—"}
            />
          </View>
        </DetailCard>

        <DetailCard>
          <SectionHeader
            icon={<ShipmentSectionIcon />}
            title="Shipment Details"
          />
          <View style={styles.routeCard}>
            <View style={styles.routeBlock}>
              <Text style={styles.routeLabel}>From</Text>
              <Text style={styles.routeValue}>{lr.originCity}</Text>
            </View>
            <RouteArrowLongIcon />
            <View style={[styles.routeBlock, styles.routeBlockRight]}>
              <Text style={styles.routeLabel}>To</Text>
              <Text style={styles.routeValue}>{lr.destinationCity}</Text>
            </View>
          </View>

          <View style={styles.sectionBody}>
            <DetailRow label="Vehicle Number" value={lr.vehicleNumber || "—"} />
            <RowDivider />
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Goods Description</Text>
              <View style={styles.goodsDescription}>
                <Text style={styles.detailValue}>
                  {lr.goodsDescription || "—"}
                </Text>
                {lr.specialInstructions ? (
                  <Text style={styles.goodsSubtitle}>{lr.specialInstructions}</Text>
                ) : null}
              </View>
            </View>
            <RowDivider />
            <DetailRow
              label="No Of Package"
              value={formatNumber(lr.noOfPackages || 0)}
            />
            <RowDivider />
            <DetailRow
              label="Declared Value"
              value={formatNumber(lr.declaredValue || 0)}
            />
            <RowDivider />
            <DetailRow label="Weight (KG)" value={formatNumber(lr.weightKg || 0)} />
            <RowDivider />
            <DetailRow
              label="Freight Amount"
              value={formatNumber(lr.freightAmount || 0)}
            />
            <RowDivider />
            <DetailRow
              label="Payment Mode"
              value={(lr.paymentMode || "—").toUpperCase()}
            />
            <RowDivider />
            <DetailRow label="Payment Status" value={getPaymentStatus(lr)} />
          </View>
        </DetailCard>

        {lr.status === "rejected" && lr.rejectionReason ? (
          <View style={styles.rejectionBanner}>
            <Text style={styles.rejectionTitle}>Rejection Reason</Text>
            <Text style={styles.rejectionText}>{lr.rejectionReason}</Text>
          </View>
        ) : null}

        {lr.photos && lr.photos.length > 0 ? (
          <DetailCard>
            <SectionHeader icon={<CameraSectionIcon />} title="Goods Photos" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {lr.photos.map((photo, index) => (
                <Image
                  key={`${photo}-${index}`}
                  source={{ uri: absUrl(photo) }}
                  style={styles.goodsPhoto}
                />
              ))}
            </ScrollView>
          </DetailCard>
        ) : null}

        {lr.signatureUrl ? (
          <DetailCard>
            <SectionHeader
              icon={<SignatureSectionIcon />}
              title="Executive Signature"
            />
            <View style={styles.signatureBox}>
              <Image
                source={{ uri: absUrl(lr.signatureUrl) }}
                style={styles.signature}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.signatureInfo}>
              {lr.executive?.name || "Executive"} : {signatureDate}
            </Text>
          </DetailCard>
        ) : null}
      </ScrollView>

      {showActionBar ? (
        <View style={[styles.actionBar, { paddingBottom: contentBottom }]}>
          {showPendingActions ? (
            <View style={styles.actionRow}>
              <Pressable
                style={[styles.rejectButton, submitting && styles.disabledButton]}
                onPress={() => setRejectionModalVisible(true)}
                disabled={submitting}
              >
                <Text style={styles.rejectButtonText}>Reject</Text>
              </Pressable>
              <Pressable
                style={[styles.approveButton, submitting && styles.disabledButton]}
                onPress={handleApprove}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color={COLORS.approvedText} />
                ) : (
                  <Text style={styles.approveButtonText}>Approve</Text>
                )}
              </Pressable>
            </View>
          ) : (
            <Pressable
              style={[styles.downloadButton, submitting && styles.disabledButton]}
              onPress={handleDownloadPdf}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color={COLORS.approvedText} />
              ) : (
                <Text style={styles.approveButtonText}>Download PDF</Text>
              )}
            </Pressable>
          )}
        </View>
      ) : null}

      <Modal
        visible={rejectionModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRejectionModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setRejectionModalVisible(false)}
          />
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reason for Rejection</Text>
              <Pressable
                onPress={() => setRejectionModalVisible(false)}
                hitSlop={8}
              >
                <CloseIcon size={10} color="#000000" />
              </Pressable>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Comment</Text>
              <TextInput
                style={styles.commentInput}
                value={rejectionReason}
                onChangeText={setRejectionReason}
                placeholder="Enter your comment here"
                placeholderTextColor="#4D4D4D"
                multiline
                textAlignVertical="top"
              />
            </View>

            <View style={styles.modalFooter}>
              <Pressable
                style={styles.cancelButton}
                onPress={() => setRejectionModalVisible(false)}
                disabled={submitting}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.rejectSubmitButton, submitting && styles.disabledButton]}
                onPress={handleRejectSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.rejectSubmitButtonText}>Reject</Text>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.white,
  },
  errorText: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
  },
  statusBarGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 62,
  },
  headerSafeArea: {
    backgroundColor: COLORS.white,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 12,
    gap: 12,
  },
  backButton: {
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    flex: 1,
    fontSize: FONT_SIZES.xl,
    fontFamily: FONTS.semiBold,
    color: COLORS.black,
    textAlign: "center",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.regular,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 12,
    gap: 12,
  },
  card: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 12,
    padding: 12,
    gap: 16,
  },
  lrSummaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  lrSummaryLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  lrIconBox: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: COLORS.white,
  },
  lrSummaryRight: {
    alignItems: "flex-end",
    gap: 4,
  },
  metaLabel: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.regular,
    color: COLORS.black,
  },
  createdLabel: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.regular,
    color: COLORS.black,
  },
  metaValue: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.semiBold,
    color: COLORS.black,
  },
  sectionGap: {
    height: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.regular,
    color: COLORS.black,
  },
  sectionBody: {
    gap: 12,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  detailRowMultiline: {
    alignItems: "flex-start",
  },
  detailLabel: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.regular,
    color: COLORS.black,
    flex: 1,
  },
  detailValue: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.semiBold,
    color: COLORS.black,
    textAlign: "right",
    flex: 1,
    letterSpacing: 0.28,
  },
  detailValueMultiline: {
    maxWidth: 196,
  },
  rowDivider: {
    height: 1,
    backgroundColor: "#D9D9D9",
  },
  routeCard: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  routeBlock: {
    flex: 1,
    gap: 8,
  },
  routeBlockRight: {
    alignItems: "flex-end",
  },
  routeLabel: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.regular,
    color: COLORS.black,
  },
  routeValue: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.semiBold,
    color: COLORS.black,
  },
  goodsDescription: {
    flex: 1,
    alignItems: "flex-end",
    gap: 4,
  },
  goodsSubtitle: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    textAlign: "right",
    lineHeight: 18,
  },
  rejectionBanner: {
    backgroundColor: COLORS.chipRejectedBg,
    borderRadius: 12,
    padding: 12,
  },
  rejectionTitle: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.semiBold,
    color: COLORS.rejectedText,
    marginBottom: 4,
  },
  rejectionText: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.regular,
    color: COLORS.rejectedText,
    lineHeight: 20,
  },
  goodsPhoto: {
    width: 73,
    height: 73,
    borderRadius: 8,
    marginRight: 8,
    backgroundColor: COLORS.white,
  },
  signatureBox: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    minHeight: 120,
    padding: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  signature: {
    width: "100%",
    height: 80,
  },
  signatureInfo: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.regular,
    color: COLORS.black,
    textAlign: "center",
  },
  actionBar: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 24,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  actionRow: {
    flexDirection: "row",
    gap: 16,
  },
  rejectButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.accentRed,
    borderRadius: 25,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  rejectButtonText: {
    fontSize: FONT_SIZES.lg,
    fontFamily: FONTS.regular,
    color: COLORS.accentRed,
  },
  approveButton: {
    flex: 1,
    backgroundColor: COLORS.approved,
    borderRadius: 25,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  approveButtonText: {
    fontSize: FONT_SIZES.lg,
    fontFamily: FONTS.regular,
    color: COLORS.approvedText,
  },
  downloadButton: {
    backgroundColor: COLORS.approved,
    borderRadius: 25,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  disabledButton: {
    opacity: 0.6,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalCard: {
    backgroundColor: COLORS.modalBg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.borderMuted,
    padding: 16,
    gap: 24,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalTitle: {
    fontSize: FONT_SIZES.xl,
    fontFamily: FONTS.semiBold,
    color: COLORS.black,
  },
  modalBody: {
    gap: 8,
  },
  inputLabel: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.regular,
    color: COLORS.black,
  },
  commentInput: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    padding: 12,
    minHeight: 120,
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.regular,
    color: COLORS.black,
  },
  modalFooter: {
    flexDirection: "row",
    gap: 16,
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.black,
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: "center",
    backgroundColor: COLORS.white,
  },
  cancelButtonText: {
    fontSize: FONT_SIZES.lg,
    fontFamily: FONTS.regular,
    color: COLORS.black,
  },
  rejectSubmitButton: {
    flex: 1,
    backgroundColor: COLORS.accentRed,
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  rejectSubmitButtonText: {
    fontSize: FONT_SIZES.lg,
    fontFamily: FONTS.regular,
    color: COLORS.white,
  },
});
