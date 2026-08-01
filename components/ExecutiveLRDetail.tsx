import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  type FocusEvent,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useState, useEffect, useCallback } from "react";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import { api, API_URL } from "../lib/api";
import { getLRDisplayId } from "../lib/lr-utils";
import { uploadLrPhotos, resolveSignatureUrl } from "../lib/media-utils";
import { addressBook } from "../lib/addresses";
import { SavedAddressModal } from "./SavedAddressModal";
import type { Address, LRRequest } from "../types";
import { COLORS, FONT_SIZES } from "../constants/theme";
import { FONTS } from "../constants/fonts";
import {
  getExecutiveLrNumberColor,
  getExecutiveStatusStyle,
} from "./ExecutiveLRCard";
import { formatStatusLabel } from "../lib/dashboard-utils";
import { useContentBottomPadding } from "../hooks/useScreenInsets";
import { useKeyboardAwareScroll } from "../hooks/useKeyboardAwareScroll";
import { SignatureCapture } from "./SignatureCapture";
import { useAuth } from "../lib/auth";
import {
  AddIcon,
  AlertCircleIcon,
  ArrowForwardIcon,
  CalendarOutlineIcon,
  CameraSectionIcon,
  CheckmarkCircleIcon,
  CheckmarkCircleOutlineIcon,
  CheckmarkIcon,
  ChevronBackIcon,
  CreateOutlineIcon,
  DocumentTextOutlineIcon,
  IonCloseIcon,
  LRIcon,
  PersonSectionIcon,
  RouteArrowLongIcon,
  SearchIcon,
  ShareOutlineIcon,
  ShipmentSectionIcon,
  SignatureSectionIcon,
  SyncOutlineIcon,
} from "./icons";

type EditMode = "view" | "edit" | "readySubmit";

const PAYMENT_MODES = ["To Be Billed", "Paid", "To Pay"] as const;

type EditFormData = {
  consignerName: string;
  consignerAddress: string;
  consigneeCompany: string;
  consigneeName: string;
  consigneeMobile: string;
  consigneeAddress: string;
  dispatchDate: Date;
  originCity: string;
  destinationCity: string;
  vehicleNumber: string;
  goodsDescription: string;
  specialInstructions: string;
  packageCount: string;
  weight: string;
  declaredValue: string;
  freightAmount: string;
  paymentMode: string;
  saveConsignerAddress: boolean;
  saveConsigneeAddress: boolean;
  goodsPhotos: string[];
  signature: string;
};

function formatPaymentLabel(mode: string) {
  if (mode === "To Be Billed") return "To be Billed";
  return mode;
}

function absUrl(url: string) {
  if (!url) return "";
  if (url.startsWith("http") || url.startsWith("data:") || url.startsWith("file:")) {
    return url;
  }
  return `${API_URL}${url}`;
}

function formatCreatedDate(date: string) {
  if (!date) return "N/A";
  
  const parsedDate = new Date(date);
  if (isNaN(parsedDate.getTime())) {
    // Try parsing YYYY-MM-DD format
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(date);
    if (match) {
      const [, year, month, day] = match;
      const localDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      if (!isNaN(localDate.getTime())) {
        return localDate.toLocaleDateString("en-GB", {
          day: "numeric",
          month: "long",
          year: "numeric",
        });
      }
    }
    return "N/A";
  }
  
  return parsedDate.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
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

// Android's native DateTimePicker crashes with "Date value out of bounds"
// if handed an Invalid Date or a year outside its supported range, instead
// of failing gracefully like a plain JS Date would. Any malformed/garbage
// date coming from the API must be normalized before it ever reaches the
// picker.
function safeParseDispatchDate(...values: (string | undefined)[]): Date {
  for (const value of values) {
    if (!value) continue;
    const parsed = new Date(value);
    if (isNaN(parsed.getTime())) continue;
    const year = parsed.getFullYear();
    if (year < 1971 || year > 2100) continue;
    return parsed;
  }
  return new Date();
}

function lrToForm(lr: LRRequest): EditFormData {
  return {
    consignerName: lr.consignorName || "",
    consignerAddress: lr.consignorAddress || "",
    consigneeCompany: lr.consigneeCompany || "",
    consigneeName: lr.consigneeName || "",
    consigneeMobile: lr.consigneePhone || "",
    consigneeAddress: lr.consigneeAddress || "",
    dispatchDate: safeParseDispatchDate(lr.dispatchDate, lr.createdAt),
    originCity: lr.originCity || "",
    destinationCity: lr.destinationCity || "",
    vehicleNumber: lr.vehicleNumber || "",
    goodsDescription: lr.goodsDescription || "",
    specialInstructions: lr.specialInstructions || "",
    packageCount: String(lr.noOfPackages || ""),
    weight: String(lr.weightKg || ""),
    declaredValue: String(lr.declaredValue || ""),
    freightAmount: String(lr.freightAmount || ""),
    paymentMode: lr.paymentMode || "To Be Billed",
    saveConsignerAddress: false,
    saveConsigneeAddress: false,
    goodsPhotos: lr.photos ? [...lr.photos] : [],
    signature: lr.signatureUrl || "",
  };
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
  valueColor,
  multiline,
}: {
  label: string;
  value: string;
  valueColor?: string;
  multiline?: boolean;
}) {
  return (
    <View style={[styles.detailRow, multiline && styles.detailRowMultiline]}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text
        style={[
          styles.detailValue,
          multiline && styles.detailValueMultiline,
          valueColor ? { color: valueColor } : null,
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

function RowDivider() {
  return <View style={styles.rowDivider} />;
}

function EditField({
  label,
  value,
  onChangeText,
  multiline,
  keyboardType,
  required,
  actionLabel,
  onAction,
  onFocus,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  multiline?: boolean;
  keyboardType?: "default" | "numeric" | "phone-pad" | "decimal-pad";
  required?: boolean;
  actionLabel?: string;
  onAction?: () => void;
  onFocus?: (event: FocusEvent) => void;
}) {
  return (
    <View style={styles.editField}>
      <View style={styles.editLabelRow}>
        <Text style={styles.detailLabel}>
          {label}
          {required ? <Text style={styles.required}>*</Text> : null}
        </Text>
        {actionLabel && onAction ? (
          <TouchableOpacity style={styles.changeAddressBtn} onPress={onAction}>
            <SyncOutlineIcon size={10} color={COLORS.white} />
            <Text style={styles.changeAddressText}>{actionLabel}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      <TextInput
        style={[styles.editInput, multiline && styles.editInputMultiline]}
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        keyboardType={keyboardType}
        placeholderTextColor={COLORS.textMuted}
        textAlignVertical={multiline ? "top" : "center"}
        onFocus={onFocus}
      />
    </View>
  );
}

function CheckboxRow({
  label,
  checked,
  onToggle,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <TouchableOpacity style={styles.checkboxRow} onPress={onToggle} activeOpacity={0.8}>
      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
        {checked ? <CheckmarkIcon size={14} color={COLORS.white} /> : null}
      </View>
      <Text style={styles.checkboxLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

type ExecutiveLRDetailProps = {
  id: string;
  initialEdit?: boolean;
};

export function ExecutiveLRDetail({ id, initialEdit }: ExecutiveLRDetailProps) {
  const { user } = useAuth();
  const [lr, setLr] = useState<LRRequest | null>(null);
  const [form, setForm] = useState<EditFormData | null>(null);
  const [mode, setMode] = useState<EditMode>("view");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [signatureModalVisible, setSignatureModalVisible] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [addressModalType, setAddressModalType] = useState<"consigner" | "consignee">(
    "consigner"
  );
  const [successToast, setSuccessToast] = useState(false);
  const contentBottom = useContentBottomPadding();
  const {
    scrollRef,
    contentPaddingBottom,
    onInputFocus,
    scrollToFocusedField,
    onScroll,
    scrollEventThrottle,
  } = useKeyboardAwareScroll({ footerHeight: 24, extraPadding: 40 });

  useEffect(() => {
    if (mode === "edit") scrollToFocusedField();
  }, [mode, scrollToFocusedField]);

  // expo-router reuses this same screen instance when navigating between
  // different LR ids (only the `id` param changes), so all local state must
  // be explicitly reset here — otherwise a previous LR's edit-mode/form data
  // leaks into the newly opened LR.
  useEffect(() => {
    setMode("view");
    setForm(null);
    setLr(null);
    setLoading(true);
    setSignatureModalVisible(false);
    setShowDatePicker(false);
    setShowAddressModal(false);
    setSuccessToast(false);
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

  useEffect(() => {
    if (initialEdit && lr?.status === "rejected") {
      setForm(lrToForm(lr));
      setMode("edit");
    }
  }, [initialEdit, lr]);

  function updateField<K extends keyof EditFormData>(key: K, value: EditFormData[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  function openAddressModal(type: "consigner" | "consignee") {
    setAddressModalType(type);
    setShowAddressModal(true);
  }

  function handleAddressSelect(address: Address) {
    if (!form) return;
    if (addressModalType === "consigner") {
      updateField("consignerName", address.name || address.address.split(",")[0]);
      updateField(
        "consignerAddress",
        address.pincode ? `${address.address}, ${address.pincode}` : address.address
      );
    } else {
      updateField("consigneeCompany", address.company || address.name);
      updateField("consigneeName", address.name);
      updateField(
        "consigneeAddress",
        address.pincode ? `${address.address}, ${address.pincode}` : address.address
      );
      if (address.phone) updateField("consigneeMobile", address.phone);
    }
  }

  async function saveAddressesIfNeeded(data: EditFormData) {
    if (!user) return;
    if (data.saveConsignerAddress && data.consignerAddress.trim()) {
      await addressBook.create(user.id, {
        type: "consigner",
        name: data.consignerName.trim(),
        address: data.consignerAddress.trim(),
        phone: "",
      });
    }
    if (data.saveConsigneeAddress && data.consigneeAddress.trim()) {
      await addressBook.create(user.id, {
        type: "consignee",
        name: data.consigneeName.trim(),
        company: data.consigneeCompany.trim(),
        address: data.consigneeAddress.trim(),
        phone: data.consigneeMobile.trim(),
      });
    }
  }

  function handleStartEdit() {
    if (!lr) return;
    
    // Only allow editing for pending and rejected LRs
    if (lr.status === "approved" || lr.status === "in_transit" || lr.status === "delivered") {
      Alert.alert(
        "Cannot Edit",
        "This LR cannot be edited because it has been approved or is already in transit/delivered."
      );
      return;
    }
    
    setForm(lrToForm(lr));
    setMode("edit");
  }

  function validateForm(data: EditFormData): boolean {
    if (!data.consignerName.trim() || !data.consignerAddress.trim()) {
      Alert.alert("Validation Error", "Consigner name and address are required");
      return false;
    }
    if (
      !data.consigneeCompany.trim() ||
      !data.consigneeName.trim() ||
      !data.consigneeAddress.trim()
    ) {
      Alert.alert(
        "Validation Error",
        "Consignee company name, name and address are required",
      );
      return false;
    }
    if (
      !data.consigneeMobile.trim() ||
      data.consigneeMobile.replace(/\D/g, "").length < 10
    ) {
      Alert.alert("Validation Error", "Valid consignee phone is required");
      return false;
    }
    if (!data.originCity.trim() || !data.destinationCity.trim()) {
      Alert.alert("Validation Error", "From and To cities are required");
      return false;
    }
    if (!data.vehicleNumber.trim()) {
      Alert.alert("Validation Error", "Vehicle number is required");
      return false;
    }
    if (!data.goodsDescription.trim()) {
      Alert.alert("Validation Error", "Goods description is required");
      return false;
    }
    if (!data.signature) {
      Alert.alert("Validation Error", "Executive signature is required");
      return false;
    }
    return true;
  }

  async function buildPayload(data: EditFormData) {
    const uploadedPhotos = await uploadLrPhotos(data.goodsPhotos);
    const signatureUrl = await resolveSignatureUrl(data.signature);

    return {
      consignerName: data.consignerName.trim(),
      consignerAddress: data.consignerAddress.trim(),
      consigneeCompany: data.consigneeCompany.trim(),
      consigneeName: data.consigneeName.trim(),
      consigneeAddress: data.consigneeAddress.trim(),
      consigneeMobile: data.consigneeMobile.trim(),
      lrDate: data.dispatchDate.toISOString(),
      originCity: data.originCity.trim(),
      destinationCity: data.destinationCity.trim(),
      vehicleNumber: data.vehicleNumber.trim(),
      goodsDescription: data.goodsDescription.trim(),
      specialInstructions: data.specialInstructions.trim(),
      packageCount: parseInt(data.packageCount, 10) || 0,
      declaredValue: parseFloat(data.declaredValue) || 0,
      weight: parseFloat(data.weight) || 0,
      freightAmount: parseFloat(data.freightAmount) || 0,
      paymentMode: data.paymentMode,
      goodsPhotos: uploadedPhotos,
      executiveSignature: signatureUrl,
    };
  }

  async function handleSaveChanges() {
    if (!form || !lr) return;
    if (!validateForm(form)) return;

    setSubmitting(true);
    try {
      const payload = await buildPayload(form);
      const res = await api.updateLR(id, payload);
      if (res.success && res.data) {
        await saveAddressesIfNeeded(form);
        setLr(res.data);
        setForm(lrToForm(res.data));
        if (lr.status === "rejected") {
          setMode("readySubmit");
          setSuccessToast(true);
          setTimeout(() => setSuccessToast(false), 3000);
        } else {
          setMode("view");
        }
      } else {
        Alert.alert("Error", res.error || "Failed to save changes");
      }
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "Failed to upload files"
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmit() {
    if (!form || !lr) return;
    if (!validateForm(form)) return;

    setSubmitting(true);
    try {
      const payload = await buildPayload(form);
      const res = await api.updateLR(id, { ...payload, status: "pending" });
      if (res.success && res.data) {
        setLr(res.data);
        setForm(null);
        setMode("view");
        Alert.alert("Success", "LR resubmitted for approval");
      } else {
        Alert.alert("Error", res.error || "Failed to submit LR");
      }
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "Failed to upload files"
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function pickPhoto() {
    if (!form) return;
    const remaining = 5 - form.goodsPhotos.length;
    if (remaining <= 0) {
      Alert.alert("Limit Reached", "Maximum 5 photos allowed");
      return;
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Required", "Please grant photo library access.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      quality: 0.8,
      allowsMultipleSelection: true,
      selectionLimit: remaining,
    });
    if (!result.canceled && result.assets.length > 0) {
      const picked = result.assets.slice(0, remaining).map((a) => a.uri);
      updateField("goodsPhotos", [...form.goodsPhotos, ...picked]);
    }
  }

  function removePhoto(index: number) {
    if (!form) return;
    updateField(
      "goodsPhotos",
      form.goodsPhotos.filter((_, i) => i !== index)
    );
  }

  // Download saves the PDF to the device only. Share converts/attaches the
  // PDF and opens the native share sheet so it can be sent to other apps.
  // Both route through the authenticated fetch — Linking.openURL() /
  // Share.share({ url }) hit the raw API URL without the auth token and get
  // rejected as Unauthorized.
  async function handleShare() {
    if (!lr) return;
    const res = await api.shareLRPdf(lr.id);
    if (!res.success) {
      Alert.alert("Error", res.error || "PDF not available yet.");
    }
  }

  async function handleDownloadPdf() {
    if (!lr) return;
    const res = await api.downloadLRPdf(lr.id);
    if (!res.success) {
      Alert.alert("Error", res.error || "PDF not available yet.");
    } else {
      Alert.alert("Downloaded", "LR PDF has been saved.");
    }
  }

  async function handleMarkDelivered() {
    if (!lr) return;
    setSubmitting(true);
    const res = await api.markDelivered(lr.id);
    setSubmitting(false);
    if (res.success) {
      await loadLR();
    } else {
      Alert.alert("Error", res.error || "Failed to mark as delivered");
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

  const isEditing = mode === "edit";
  const statusStyle = getExecutiveStatusStyle(lr.status);
  const statusLabel = formatStatusLabel(lr.status);
  const lrNumberColor = getExecutiveLrNumberColor(lr.status);
  const isRejected = lr.status === "rejected";
  const isApproved = lr.status === "approved" || lr.status === "in_transit";
  const isDelivered = lr.status === "delivered";
  const showEdit =
    mode === "view" && !isDelivered && (isRejected || lr.status === "pending");
  const showSave = mode === "edit";
  const showSubmit = mode === "readySubmit" && isRejected;
  const consignerMobile = lr.executive?.mobile || user?.mobile || "";
  
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
  const routeFrom = isEditing && form ? form.originCity : lr.originCity;
  const routeTo = isEditing && form ? form.destinationCity : lr.destinationCity;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.statusBarFill}>
        <SafeAreaView edges={["top"]} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: isEditing ? contentPaddingBottom : contentBottom },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        onScroll={onScroll}
        scrollEventThrottle={scrollEventThrottle}
      >
        <View style={styles.pageHeader}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <ChevronBackIcon />
          </Pressable>
          <Text style={styles.pageTitle}>LRs History</Text>
          {showEdit ? (
            <Pressable style={styles.headerAction} onPress={handleStartEdit}>
              <CreateOutlineIcon size={14} color={COLORS.white} />
              <Text style={styles.headerActionText}>Edit</Text>
            </Pressable>
          ) : showSave ? (
            <Pressable
              style={[styles.headerAction, submitting && styles.buttonDisabled]}
              onPress={handleSaveChanges}
              disabled={submitting}
            >
              <Text style={styles.headerActionText}>Save Changes</Text>
            </Pressable>
          ) : showSubmit ? (
            <Pressable
              style={[styles.headerAction, submitting && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              <Text style={styles.headerActionText}>Submit</Text>
            </Pressable>
          ) : (
            <View style={styles.headerSpacer} />
          )}
        </View>

        <DetailCard>
          <View style={styles.summaryRow}>
            <View style={styles.summaryLeft}>
              <View style={styles.lrIconBox}>
                <LRIcon size={24} color={COLORS.black} />
              </View>
              <View>
                <Text style={styles.createdLabel}>Created on</Text>
                <Text style={styles.createdDate}>{formatCreatedDate(lr.createdAt)}</Text>
                <Text style={[styles.lrNumber, { color: lrNumberColor }]}>
                  {getLRDisplayId(lr)}
                </Text>
              </View>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
              <Text style={[styles.statusText, { color: statusStyle.text }]}>
                {statusLabel}
              </Text>
            </View>
          </View>
        </DetailCard>

        {isRejected && lr.rejectionReason ? (
          <View style={styles.rejectionBanner}>
            <AlertCircleIcon size={24} color={COLORS.rejectedText} />
            <View style={styles.rejectionTextWrap}>
              <Text style={styles.rejectionTitle}>LR Rejected Take Action!</Text>
              <Text style={styles.rejectionMessage}>{lr.rejectionReason}</Text>
            </View>
          </View>
        ) : null}

        {isApproved && !isEditing ? (
          <View style={styles.actionBlock}>
            <View style={styles.actionRow}>
              <Pressable style={styles.blackButton} onPress={handleShare}>
                <ShareOutlineIcon size={16} color={COLORS.white} />
                <Text style={styles.blackButtonText}>Share</Text>
              </Pressable>
              <Pressable style={styles.blackButton} onPress={handleDownloadPdf}>
                <DocumentTextOutlineIcon size={16} color={COLORS.white} />
                <Text style={styles.blackButtonText}>Download PDF</Text>
              </Pressable>
            </View>
            <Pressable
              style={[styles.deliverButton, submitting && styles.buttonDisabled]}
              onPress={handleMarkDelivered}
              disabled={submitting}
            >
              <CheckmarkCircleOutlineIcon size={18} color={COLORS.white} />
              <Text style={styles.deliverButtonText}>Mark As Delivered</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.routeCard}>
          <View style={styles.routeHeaderRow}>
            <Text style={styles.routeLabel}>From</Text>
            <Text style={styles.routeLabel}>To</Text>
          </View>
          <View style={styles.routePillRow}>
            <View style={styles.routePill}>
              <Text style={styles.routePillText}>{routeFrom || "—"}</Text>
            </View>
            <RouteArrowLongIcon />
            <View style={[styles.routePill, styles.routePillRight]}>
              <Text style={styles.routePillText}>{routeTo || "—"}</Text>
            </View>
          </View>
        </View>

        <DetailCard>
          <SectionHeader icon={<PersonSectionIcon />} title="Consigner Details" />
          <View style={styles.sectionBody}>
            {isEditing && form ? (
              <>
                <EditField
                  onFocus={onInputFocus}
                  label="Consigner Name"
                  value={form.consignerName}
                  onChangeText={(v) => updateField("consignerName", v)}
                  required
                />
                <EditField
                  onFocus={onInputFocus}
                  label="Consigner Address"
                  value={form.consignerAddress}
                  onChangeText={(v) => updateField("consignerAddress", v)}
                  multiline
                  required
                  actionLabel="Change Address"
                  onAction={() => openAddressModal("consigner")}
                />
                <CheckboxRow
                  label="Save Address For Future Use"
                  checked={form.saveConsignerAddress}
                  onToggle={() =>
                    updateField("saveConsignerAddress", !form.saveConsignerAddress)
                  }
                />
              </>
            ) : (
              <>
                <DetailRow label="Consigner Name" value={lr.consignorName || "—"} />
                <RowDivider />
                <DetailRow
                  label="Consigner Address"
                  value={lr.consignorAddress || "—"}
                  multiline
                />
                <RowDivider />
                <DetailRow
                  label="Consigner Mobile No"
                  value={consignerMobile ? formatPhone(consignerMobile) : "—"}
                />
              </>
            )}
          </View>
        </DetailCard>

        <DetailCard>
          <SectionHeader icon={<PersonSectionIcon />} title="Consignee Details" />
          <View style={styles.sectionBody}>
            {isEditing && form ? (
              <>
                <EditField
                  onFocus={onInputFocus}
                  label="Company Name"
                  value={form.consigneeCompany}
                  onChangeText={(v) => updateField("consigneeCompany", v)}
                  required
                />
                <EditField
                  onFocus={onInputFocus}
                  label="Consignee Name"
                  value={form.consigneeName}
                  onChangeText={(v) => updateField("consigneeName", v)}
                  required
                />
                <EditField
                  onFocus={onInputFocus}
                  label="Consignee Address"
                  value={form.consigneeAddress}
                  onChangeText={(v) => updateField("consigneeAddress", v)}
                  multiline
                  required
                  actionLabel="Change Address"
                  onAction={() => openAddressModal("consignee")}
                />
                <CheckboxRow
                  label="Save Address For Future Use"
                  checked={form.saveConsigneeAddress}
                  onToggle={() =>
                    updateField("saveConsigneeAddress", !form.saveConsigneeAddress)
                  }
                />
                <EditField
                  onFocus={onInputFocus}
                  label="Consignee Phone Number"
                  value={form.consigneeMobile}
                  onChangeText={(v) => updateField("consigneeMobile", v)}
                  keyboardType="phone-pad"
                  required
                />
              </>
            ) : (
              <>
                <DetailRow label="Company Name" value={lr.consigneeCompany || "—"} />
                <RowDivider />
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
              </>
            )}
          </View>
        </DetailCard>

        <DetailCard>
          <SectionHeader icon={<ShipmentSectionIcon />} title="Shipment Details" />
          {isEditing && form ? (
            <View style={styles.sectionBody}>
              <View style={styles.editField}>
                <Text style={styles.detailLabel}>
                  Date of Dispatch<Text style={styles.required}>*</Text>
                </Text>
                <TouchableOpacity
                  style={styles.dateInput}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text style={styles.dateInputText}>
                    {form.dispatchDate.toLocaleDateString("en-GB")}
                  </Text>
                  <CalendarOutlineIcon size={18} color={COLORS.textMuted} />
                </TouchableOpacity>
              </View>

              <View style={styles.routeSearchRow}>
                <View style={styles.routeSearchField}>
                  <Text style={styles.detailLabel}>
                    From<Text style={styles.required}>*</Text>
                  </Text>
                  <View style={styles.searchInput}>
                    <TextInput
                      style={styles.searchInputText}
                      value={form.originCity}
                      onChangeText={(v) => updateField("originCity", v)}
                      placeholderTextColor={COLORS.textMuted}
                    />
                    <SearchIcon size={16} color={COLORS.textMuted} />
                  </View>
                </View>
                <ArrowForwardIcon
                  size={16}
                  color={COLORS.black}
                  style={styles.routeSearchArrow}
                />
                <View style={styles.routeSearchField}>
                  <Text style={styles.detailLabel}>
                    To<Text style={styles.required}>*</Text>
                  </Text>
                  <View style={styles.searchInput}>
                    <TextInput
                      style={styles.searchInputText}
                      value={form.destinationCity}
                      onChangeText={(v) => updateField("destinationCity", v)}
                      placeholderTextColor={COLORS.textMuted}
                    />
                    <SearchIcon size={16} color={COLORS.textMuted} />
                  </View>
                </View>
              </View>

              <EditField
                onFocus={onInputFocus}
                label="Vehicle Number"
                value={form.vehicleNumber}
                onChangeText={(v) => updateField("vehicleNumber", v)}
                required
              />
              <EditField
                onFocus={onInputFocus}
                label="Goods Description"
                value={form.goodsDescription}
                onChangeText={(v) => updateField("goodsDescription", v)}
                multiline
                required
              />

              <View style={styles.numericGrid}>
                <View style={styles.numericGridItem}>
                  <EditField
                    onFocus={onInputFocus}
                    label="No. Of Package"
                    value={form.packageCount}
                    onChangeText={(v) => updateField("packageCount", v)}
                    keyboardType="numeric"
                    required
                  />
                </View>
                <View style={styles.numericGridItem}>
                  <EditField
                    onFocus={onInputFocus}
                    label="Declared Value (₹)"
                    value={form.declaredValue}
                    onChangeText={(v) => updateField("declaredValue", v)}
                    keyboardType="decimal-pad"
                    required
                  />
                </View>
                <View style={styles.numericGridItem}>
                  <EditField
                    onFocus={onInputFocus}
                    label="Weight (KG)"
                    value={form.weight}
                    onChangeText={(v) => updateField("weight", v)}
                    keyboardType="decimal-pad"
                    required
                  />
                </View>
                <View style={styles.numericGridItem}>
                  <EditField
                    onFocus={onInputFocus}
                    label="Freight Amount (₹)"
                    value={form.freightAmount}
                    onChangeText={(v) => updateField("freightAmount", v)}
                    keyboardType="decimal-pad"
                    required
                  />
                </View>
              </View>

              <View style={styles.editField}>
                <Text style={styles.detailLabel}>
                  Payment Mode<Text style={styles.required}>*</Text>
                </Text>
                <View style={styles.segmentRow}>
                  {PAYMENT_MODES.map((mode) => {
                    const active = form.paymentMode === mode;
                    return (
                      <TouchableOpacity
                        key={mode}
                        style={[styles.segment, active && styles.segmentActive]}
                        onPress={() => updateField("paymentMode", mode)}
                      >
                        <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                          {formatPaymentLabel(mode)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <EditField
                onFocus={onInputFocus}
                label="Special Instruction"
                value={form.specialInstructions}
                onChangeText={(v) => updateField("specialInstructions", v)}
                multiline
              />
            </View>
          ) : (
            <View style={styles.innerRouteCard}>
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
          )}

          {!isEditing ? (
            <View style={styles.sectionBody}>
                <DetailRow
                  label="Vehicle Number"
                  value={lr.vehicleNumber || "—"}
                  valueColor={isRejected ? COLORS.rejectedText : undefined}
                />
                <RowDivider />
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Goods Description</Text>
                  <View style={styles.goodsBlock}>
                    <Text style={styles.goodsTitle}>{lr.goodsDescription || "—"}</Text>
                    {lr.specialInstructions ? (
                      <Text style={styles.goodsSubtitle}>{lr.specialInstructions}</Text>
                    ) : null}
                  </View>
                </View>
                <RowDivider />
                <DetailRow label="No Of Package" value={formatNumber(lr.noOfPackages || 0)} />
                <RowDivider />
                <DetailRow label="Declared Value" value={formatNumber(lr.declaredValue || 0)} />
                <RowDivider />
                <DetailRow label="Weight (KG)" value={formatNumber(lr.weightKg || 0)} />
                <RowDivider />
                <DetailRow label="Freight Amount" value={formatNumber(lr.freightAmount || 0)} />
                <RowDivider />
                <DetailRow label="Payment Mode" value={(lr.paymentMode || "—").toUpperCase()} />
                <RowDivider />
                <DetailRow label="Payment Status" value={getPaymentStatus(lr)} />
            </View>
          ) : null}
        </DetailCard>

        {(isEditing && form) || (lr.photos && lr.photos.length > 0) ? (
          <DetailCard>
            <SectionHeader icon={<CameraSectionIcon />} title="Goods Photos" />
            {isEditing && form ? (
              <View style={styles.photosEditWrap}>
                <View style={styles.photosRow}>
                  {form.goodsPhotos.map((photo, index) => (
                    <View key={`${photo}-${index}`} style={styles.photoThumbWrap}>
                      <Image
                        source={{ uri: absUrl(photo) }}
                        style={styles.photoThumb}
                        resizeMode="cover"
                      />
                      <Pressable
                        style={styles.photoRemove}
                        onPress={() => removePhoto(index)}
                      >
                        <IonCloseIcon size={12} color={COLORS.white} />
                      </Pressable>
                    </View>
                  ))}
                  {form.goodsPhotos.length < 5 ? (
                    <Pressable style={styles.photoAdd} onPress={pickPhoto}>
                      <AddIcon size={24} color={COLORS.textMuted} />
                    </Pressable>
                  ) : null}
                </View>
              </View>
            ) : (
              <View style={styles.goodsPhotoWrap}>
                {lr.photos.map((photo, index) => (
                  <Image
                    key={`${photo}-${index}`}
                    source={{ uri: absUrl(photo) }}
                    style={styles.goodsPhotoFull}
                    resizeMode="cover"
                  />
                ))}
              </View>
            )}
          </DetailCard>
        ) : null}

        {(isEditing && form) || lr.signatureUrl ? (
          <DetailCard>
            <SectionHeader icon={<SignatureSectionIcon />} title="Executive Signature" />
            {isEditing && form ? (
              <>
                <Pressable
                  style={styles.signatureBox}
                  onPress={() => setSignatureModalVisible(true)}
                >
                  {form.signature ? (
                    <Image
                      source={{ uri: absUrl(form.signature) }}
                      style={styles.signature}
                      resizeMode="contain"
                    />
                  ) : (
                    <Text style={styles.signaturePlaceholder}>Tap to add signature</Text>
                  )}
                </Pressable>
                <Text style={styles.signatureInfo}>
                  {user?.name || "Executive"} : {signatureDate}
                </Text>
              </>
            ) : (
              <>
                <View style={styles.signatureBox}>
                  <Image
                    source={{ uri: absUrl(lr.signatureUrl!) }}
                    style={styles.signature}
                    resizeMode="contain"
                  />
                </View>
                <Text style={styles.signatureInfo}>
                  {lr.executive?.name || "Executive"} : {signatureDate}
                </Text>
              </>
            )}
          </DetailCard>
        ) : null}
      </ScrollView>
      </KeyboardAvoidingView>

      {successToast ? (
        <View style={styles.successToast}>
          <CheckmarkCircleIcon size={16} color="#0C6B24" />
          <Text style={styles.successToastText}>LR Updated Successfully</Text>
        </View>
      ) : null}

      <SavedAddressModal
        visible={showAddressModal}
        type={addressModalType}
        onClose={() => setShowAddressModal(false)}
        onSelect={handleAddressSelect}
      />

      <SignatureCapture
        visible={signatureModalVisible}
        onClose={() => setSignatureModalVisible(false)}
        onSave={(signature) => updateField("signature", signature)}
        userName={user?.name}
      />

      {showDatePicker && form ? (
        <DateTimePicker
          value={form.dispatchDate}
          mode="date"
          onChange={(_, date) => {
            setShowDatePicker(Platform.OS === "ios");
            if (date) updateField("dispatchDate", date);
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  flex: {
    flex: 1,
  },
  statusBarFill: {
    backgroundColor: COLORS.primary,
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 12,
    gap: 12,
  },
  routeCard: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  routeHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  routePillRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  routePill: {
    flex: 1,
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    alignItems: "flex-start",
  },
  routePillRight: {
    alignItems: "flex-end",
  },
  routePillText: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.semiBold,
    color: COLORS.black,
    letterSpacing: 0.28,
  },
  innerRouteCard: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 12,
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
  routeInput: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.semiBold,
    color: COLORS.black,
    padding: 0,
  },
  routeInputRight: {
    textAlign: "right",
  },
  pageHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  backButton: {
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  pageTitle: {
    flex: 1,
    fontSize: FONT_SIZES.xl,
    fontFamily: FONTS.semiBold,
    color: COLORS.black,
  },
  headerAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  headerActionText: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.semiBold,
    color: COLORS.white,
  },
  headerSpacer: {
    width: 24,
  },
  card: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 12,
    padding: 12,
    gap: 16,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  summaryLeft: {
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
  createdLabel: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.regular,
    color: COLORS.black,
  },
  createdDate: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.semiBold,
    color: COLORS.black,
    marginBottom: 4,
  },
  lrNumber: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.semiBold,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 2,
  },
  statusText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.regular,
  },
  rejectionBanner: {
    backgroundColor: "#FFF4F4",
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 16,
  },
  rejectionTextWrap: {
    flex: 1,
    gap: 4,
  },
  rejectionTitle: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.semiBold,
    color: COLORS.rejectedText,
  },
  rejectionMessage: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.regular,
    color: "#4D4D4D",
    lineHeight: 18,
  },
  actionBlock: {
    gap: 10,
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
  },
  blackButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: COLORS.black,
    borderRadius: 32,
    paddingVertical: 12,
  },
  blackButtonText: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.semiBold,
    color: COLORS.white,
  },
  deliverButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: COLORS.success,
    borderRadius: 32,
    paddingVertical: 12,
  },
  deliverButtonText: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.semiBold,
    color: COLORS.white,
  },
  buttonDisabled: {
    opacity: 0.6,
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
  goodsBlock: {
    flex: 1,
    alignItems: "flex-end",
    gap: 4,
  },
  goodsTitle: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.semiBold,
    color: COLORS.black,
    textAlign: "right",
  },
  goodsSubtitle: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    textAlign: "right",
    lineHeight: 18,
  },
  editField: {
    gap: 8,
    marginBottom: 4,
  },
  editLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  required: {
    color: COLORS.error,
  },
  changeAddressBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  changeAddressText: {
    fontSize: 10,
    fontFamily: FONTS.regular,
    color: COLORS.white,
  },
  editInput: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.semiBold,
    color: COLORS.black,
  },
  editInputMultiline: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: COLORS.black,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.white,
  },
  checkboxChecked: {
    backgroundColor: COLORS.black,
  },
  checkboxLabel: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.regular,
    color: COLORS.black,
  },
  dateInput: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  dateInputText: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.semiBold,
    color: COLORS.black,
  },
  routeSearchRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 6,
    marginBottom: 4,
  },
  routeSearchField: {
    flex: 1,
    gap: 8,
  },
  routeSearchArrow: {
    marginBottom: 22,
  },
  searchInput: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 8,
  },
  searchInputText: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.semiBold,
    color: COLORS.black,
    padding: 0,
  },
  numericGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  numericGridItem: {
    width: "48%",
  },
  segmentRow: {
    flexDirection: "row",
    gap: 8,
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLORS.backgroundSecondary,
    alignItems: "center",
  },
  segmentActive: {
    backgroundColor: "rgba(94, 62, 161, 0.12)",
  },
  segmentText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.medium,
    color: COLORS.black,
  },
  segmentTextActive: {
    fontFamily: FONTS.semiBold,
    color: COLORS.black,
  },
  photosEditWrap: {
    gap: 8,
  },
  photosRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  photoThumbWrap: {
    position: "relative",
  },
  photoThumb: {
    width: 73,
    height: 73,
    borderRadius: 8,
    backgroundColor: COLORS.white,
  },
  photoRemove: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  photoAdd: {
    width: 73,
    height: 73,
    borderRadius: 8,
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#D9D9D9",
    borderStyle: "dashed",
  },
  goodsPhoto: {
    width: 73,
    height: 73,
    borderRadius: 8,
    marginRight: 8,
    backgroundColor: COLORS.white,
  },
  goodsPhotoWrap: {
    gap: 8,
  },
  goodsPhotoFull: {
    width: "100%",
    height: 185,
    borderRadius: 16,
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
  signaturePlaceholder: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
  },
  signatureInfo: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.regular,
    color: COLORS.black,
    textAlign: "center",
  },
  successToast: {
    position: "absolute",
    bottom: 100,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(52, 199, 89, 0.10)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  successToastText: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.regular,
    color: "#0C6B24",
  },
});
