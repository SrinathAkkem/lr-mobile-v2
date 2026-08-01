import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useState, useEffect } from "react";
import { router, useLocalSearchParams } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import { SignatureCapture } from "../../../components/SignatureCapture";
import { CreateLRStepIndicator } from "../../../components/CreateLRStepIndicator";
import { SavedAddressModal } from "../../../components/SavedAddressModal";
import { api } from "../../../lib/api";
import { addressBook } from "../../../lib/addresses";
import { useAuth } from "../../../lib/auth";
import { COLORS, FONT_SIZES, BORDER_RADIUS } from "../../../constants/theme";
import { FONTS } from "../../../constants/fonts";
import type { CreateLRFormData, Address, LRRequest } from "../../../types";
import { useContentBottomPadding } from "../../../hooks/useScreenInsets";
import { useKeyboardAwareScroll } from "../../../hooks/useKeyboardAwareScroll";
import { getLRDisplayId } from "../../../lib/lr-utils";
import { uploadLrPhotos, resolveSignatureUrl } from "../../../lib/media-utils";
import {
  AddIcon,
  ArrowForwardIcon,
  ArrowUpOutlineIcon,
  CalendarOutlineIcon,
  CameraSectionIcon,
  CheckmarkCircleIcon,
  CheckmarkCircleOutlineIcon,
  CheckmarkSuccessIcon,
  CheckmarkIcon,
  CreateOutlineIcon,
  DocumentTextOutlineIcon,
  ImageOutlineIcon,
  IonCloseIcon,
  LRIcon,
  PencilIcon,
  PersonSectionIcon,
  SearchIcon,
  ShipmentSectionIcon,
  SignatureSectionIcon,
  SyncOutlineIcon,
  TimeIcon,
} from "../../../components/icons";

const TOTAL_STEPS = 4;
const PAYMENT_MODES = ["To Be Billed", "Paid", "To Pay"] as const;
const PHONE_PREFIX = "+91 ";

function formatIndiaPhoneInput(raw: string) {
  const digits = raw.replace(/\D/g, "");
  const local = digits.startsWith("91") ? digits.slice(2) : digits;
  const limited = local.slice(0, 10);
  if (!limited) return PHONE_PREFIX;
  if (limited.length <= 5) return `${PHONE_PREFIX}${limited}`;
  return `${PHONE_PREFIX}${limited.slice(0, 5)} ${limited.slice(5)}`;
}

function isValidIndiaPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return digits.length === 12 && digits.startsWith("91");
}

function formatPaymentLabel(mode: string) {
  if (mode === "To Be Billed") return "To be Billed";
  return mode;
}

const INITIAL_FORM: CreateLRFormData = {
  consignerName: "",
  consignerAddress: "",
  consigneeCompany: "",
  consigneeName: "",
  consigneeAddress: "",
  consigneeMobile: PHONE_PREFIX,
  lrDate: new Date(),
  originCity: "",
  destinationCity: "",
  vehicleNumber: "",
  goodsDescription: "",
  goodsDescriptionDetail: "",
  packageCount: "",
  weight: "",
  declaredValue: "",
  freightAmount: "",
  paymentMode: "To Be Billed",
  specialInstructions: "",
  saveConsignerAddress: true,
  saveConsigneeAddress: true,
  goodsPhotos: [],
  signature: "",
};

function RequiredLabel({ children }: { children: string }) {
  return (
    <Text style={styles.label}>
      {children}
      <Text style={styles.required}>*</Text>
    </Text>
  );
}

function SectionHeader({
  icon,
  title,
  actionLabel,
  onAction,
}: {
  icon: React.ReactNode;
  title: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleRowInline}>
        {icon}
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <TouchableOpacity style={styles.changeButton} onPress={onAction}>
        <SyncOutlineIcon size={12} color={COLORS.white} />
        <Text style={styles.changeButtonText}>{actionLabel}</Text>
      </TouchableOpacity>
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
        {checked ? <CheckmarkIcon size={14} color="#FFFFFF" /> : null}
      </View>
      <Text style={styles.checkboxLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function LRSuccessScreen({
  lr,
  onGoHome,
  onViewStatus,
  contentBottom,
}: {
  lr: LRRequest;
  onGoHome: () => void;
  onViewStatus: () => void;
  contentBottom: number;
}) {
  const timeline = [
    {
      icon: <CheckmarkIcon size={16} color="#0C6B24" />,
      iconBg: "#EBF9EE",
      iconColor: "#0C6B24",
      title: "LR Submitted",
      sub: "Just Now",
      lineColor: "#0C6B24",
      lineStyle: "solid" as const,
      muted: false,
    },
    {
      icon: <TimeIcon size={16} color="#967E1C" />,
      iconBg: "#FDF5D3",
      iconColor: "#967E1C",
      title: "Pending Approval",
      sub: "Admin side approval pending",
      lineColor: "#D9D9D9",
      lineStyle: "dashed" as const,
      muted: false,
    },
    {
      icon: <DocumentTextOutlineIcon size={16} color="#929292" />,
      iconBg: "#F5F5F7",
      iconColor: "#929292",
      title: "Approved & Pdf Generate Ready",
      sub: "You'll be notify once ready to download",
      lineColor: "transparent",
      lineStyle: "none" as const,
      muted: true,
    },
  ];

  return (
    <ScrollView
      style={styles.successScroll}
      contentContainerStyle={[styles.successContent, { paddingBottom: contentBottom }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.successIcon}>
        <CheckmarkSuccessIcon size={36} color={COLORS.white} />
      </View>
      <Text style={styles.successTitle}>LR Submitted Successfully!</Text>
      <Text style={styles.successBody}>
        Your LR has been sent to the company admin for approval. You will get a
        notification once it is approved.
      </Text>

      <View style={styles.trackingCard}>
        <View style={styles.trackingIconBox}>
          <LRIcon size={24} color={COLORS.black} />
        </View>
        <View style={styles.trackingInfo}>
          <Text style={styles.trackingLabel}>Your Tracking Id</Text>
          <Text style={styles.trackingId}>{getLRDisplayId(lr)}</Text>
        </View>
        <View style={styles.pendingBadge}>
          <Text style={styles.pendingBadgeText}>Pending</Text>
        </View>
      </View>

      <View style={styles.timelineCard}>
        <View style={styles.timelineHeader}>
          <PersonSectionIcon size={16} color={COLORS.black} />
          <Text style={styles.timelineTitle}>Timeline</Text>
        </View>
        {timeline.map((item, index) => (
          <View key={item.title} style={styles.timelineRow}>
            <View style={styles.timelineLeft}>
              <View style={[styles.timelineIconBox, { backgroundColor: item.iconBg }]}>
                {item.icon}
              </View>
              {index < timeline.length - 1 ? (
                <View
                  style={[
                    styles.timelineLine,
                    { backgroundColor: item.lineColor },
                    item.lineStyle === "dashed" && styles.timelineLineDashed,
                  ]}
                />
              ) : null}
            </View>
            <View style={styles.timelineText}>
              <Text
                style={[styles.timelineItemTitle, item.muted && styles.timelineItemTitleMuted]}
              >
                {item.title}
              </Text>
              <Text style={styles.timelineItemSub}>{item.sub}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.successActions}>
        <TouchableOpacity style={styles.goHomeButton} onPress={onGoHome}>
          <ArrowUpOutlineIcon size={16} color={COLORS.text} />
          <Text style={styles.goHomeText}>Go home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.viewStatusButton} onPress={onViewStatus}>
          <DocumentTextOutlineIcon size={16} color="#FFFFFF" />
          <Text style={styles.viewStatusText}>View LR Status</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

export default function CreateLRScreen() {
  const { editId } = useLocalSearchParams<{ editId?: string }>();
  const { user } = useAuth();
  const contentBottom = useContentBottomPadding();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(!!editId);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showSignature, setShowSignature] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [addressModalType, setAddressModalType] = useState<"consigner" | "consignee">(
    "consigner"
  );
  const [signatureSavedMsg, setSignatureSavedMsg] = useState(false);
  const [signatureConfirmed, setSignatureConfirmed] = useState(false);
  const [submittedLr, setSubmittedLr] = useState<LRRequest | null>(null);
  const [editStatus, setEditStatus] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateLRFormData>(INITIAL_FORM);
  const {
    scrollRef,
    contentPaddingBottom,
    onInputFocus,
    scrollToFocusedField,
    onScroll,
    scrollEventThrottle,
  } = useKeyboardAwareScroll({ footerHeight: 96, extraPadding: 40 });

  const updateField = (field: keyof CreateLRFormData, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    scrollToFocusedField();
  }, [scrollToFocusedField]);

  useEffect(() => {
    if (editId || !user) return;

    (async () => {
      try {
        const [consignerAddresses, consigneeAddresses, consignerId, consigneeId] =
          await Promise.all([
            addressBook.list(user.id, "consigner"),
            addressBook.list(user.id, "consignee"),
            addressBook.getSelected(user.id, "consigner"),
            addressBook.getSelected(user.id, "consignee"),
          ]);

        const consigner =
          consignerAddresses.find((item) => item.id === consignerId) ??
          consignerAddresses[0];
        const consignee =
          consigneeAddresses.find((item) => item.id === consigneeId) ??
          consigneeAddresses[0];

        setFormData((prev) => ({
          ...prev,
          ...(consigner && !prev.consignerName
            ? {
                consignerName: consigner.name,
                consignerAddress: consigner.pincode
                  ? `${consigner.address}, ${consigner.pincode}`
                  : consigner.address,
              }
            : {}),
          ...(consignee && !prev.consigneeName
            ? {
                consigneeCompany: consignee.company || consignee.name,
                consigneeName: consignee.name,
                consigneeAddress: consignee.pincode
                  ? `${consignee.address}, ${consignee.pincode}`
                  : consignee.address,
                consigneeMobile: consignee.phone
                  ? formatIndiaPhoneInput(consignee.phone)
                  : prev.consigneeMobile,
              }
            : {}),
        }));
      } catch {
        // Prefill is best-effort.
      }
    })();
  }, [editId, user]);

  useEffect(() => {
    if (!editId) return;
    (async () => {
      const res = await api.getLR(editId);
      if (res.success && res.data) {
        const lr = res.data;
        setEditStatus(lr.status);
        setFormData({
          consignerName: lr.consignorName || "",
          consignerAddress: lr.consignorAddress || "",
          consigneeCompany: lr.consigneeCompany || "",
          consigneeName: lr.consigneeName || "",
          consigneeAddress: lr.consigneeAddress || "",
          consigneeMobile: lr.consigneePhone
            ? formatIndiaPhoneInput(lr.consigneePhone)
            : PHONE_PREFIX,
          lrDate: new Date(lr.dispatchDate || lr.createdAt),
          originCity: lr.originCity || "",
          destinationCity: lr.destinationCity || "",
          vehicleNumber: lr.vehicleNumber || "",
          goodsDescription: lr.goodsDescription || "",
          goodsDescriptionDetail: lr.specialInstructions || "",
          packageCount: String(lr.noOfPackages || ""),
          weight: String(lr.weightKg || ""),
          declaredValue: String(lr.declaredValue || ""),
          freightAmount: String(lr.freightAmount || ""),
          paymentMode: lr.paymentMode || "To Be Billed",
          specialInstructions: lr.specialInstructions || "",
          saveConsignerAddress: false,
          saveConsigneeAddress: false,
          goodsPhotos: lr.photos ? [...lr.photos] : [],
          signature: lr.signatureUrl || "",
        });
        if (lr.signatureUrl) setSignatureConfirmed(true);
      }
      setInitialLoading(false);
    })();
  }, [editId]);

  function handleAddressSelect(address: Address) {
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
      if (address.phone) {
        updateField("consigneeMobile", formatIndiaPhoneInput(address.phone));
      }
    }
  }

  function openAddressModal(type: "consigner" | "consignee") {
    setAddressModalType(type);
    setShowAddressModal(true);
  }

  function validateStep(step: number): boolean {
    switch (step) {
      case 1:
        if (!formData.consignerName.trim()) {
          Alert.alert("Validation Error", "Consigner name is required");
          return false;
        }
        if (!formData.consignerAddress.trim()) {
          Alert.alert("Validation Error", "Consigner address is required");
          return false;
        }
        return true;
      case 2:
        if (!formData.consigneeCompany.trim()) {
          Alert.alert("Validation Error", "Company name is required");
          return false;
        }
        if (!formData.consigneeName.trim()) {
          Alert.alert("Validation Error", "Consignee name is required");
          return false;
        }
        if (!formData.consigneeAddress.trim()) {
          Alert.alert("Validation Error", "Consignee address is required");
          return false;
        }
        if (!isValidIndiaPhone(formData.consigneeMobile)) {
          Alert.alert("Validation Error", "Valid consignee phone is required");
          return false;
        }
        return true;
      case 3:
        if (!formData.originCity.trim() || !formData.destinationCity.trim()) {
          Alert.alert("Validation Error", "From and To cities are required");
          return false;
        }
        if (!formData.vehicleNumber.trim()) {
          Alert.alert("Validation Error", "Vehicle number is required");
          return false;
        }
        if (!formData.goodsDescription.trim()) {
          Alert.alert("Validation Error", "Goods description is required");
          return false;
        }
        if (!formData.packageCount.trim() || parseInt(formData.packageCount, 10) <= 0) {
          Alert.alert("Validation Error", "Package count must be greater than 0");
          return false;
        }
        if (!formData.weight.trim() || parseFloat(formData.weight) <= 0) {
          Alert.alert("Validation Error", "Weight must be greater than 0");
          return false;
        }
        if (!formData.declaredValue.trim() || parseFloat(formData.declaredValue) < 0) {
          Alert.alert("Validation Error", "Declared value is required");
          return false;
        }
        if (!formData.freightAmount.trim() || parseFloat(formData.freightAmount) < 0) {
          Alert.alert("Validation Error", "Freight amount is required");
          return false;
        }
        return true;
      case 4:
        if (!formData.signature) {
          Alert.alert("Validation Error", "Executive signature is required");
          return false;
        }
        if (!signatureConfirmed) {
          Alert.alert("Validation Error", "Please confirm your signature");
          return false;
        }
        return true;
      default:
        return true;
    }
  }

  async function saveAddressesIfNeeded() {
    if (!user) return;
    if (formData.saveConsignerAddress && formData.consignerAddress.trim()) {
      await addressBook.create(user.id, {
        type: "consigner",
        name: formData.consignerName.trim(),
        address: formData.consignerAddress.trim(),
        phone: "",
      });
    }
    if (formData.saveConsigneeAddress && formData.consigneeAddress.trim()) {
      await addressBook.create(user.id, {
        type: "consignee",
        name: formData.consigneeName.trim(),
        company: formData.consigneeCompany.trim(),
        address: formData.consigneeAddress.trim(),
        phone: formData.consigneeMobile.trim(),
      });
    }
  }

  async function handleSubmit() {
    if (!validateStep(4)) return;
    setLoading(true);
    try {
      const uploadedPhotos = await uploadLrPhotos(formData.goodsPhotos);
      const signatureUrl = await resolveSignatureUrl(formData.signature);

      const payload = {
        lrDate: formData.lrDate.toISOString(),
        consignerName: formData.consignerName,
        consignerAddress: formData.consignerAddress,
        consigneeCompany: formData.consigneeCompany,
        consigneeName: formData.consigneeName,
        consigneeAddress: formData.consigneeAddress,
        consigneeMobile: formData.consigneeMobile,
        originCity: formData.originCity,
        destinationCity: formData.destinationCity,
        vehicleNumber: formData.vehicleNumber,
        goodsDescription: formData.goodsDescription,
        goodsDescriptionDetail: formData.goodsDescriptionDetail,
        specialInstructions: formData.specialInstructions,
        packageCount: parseInt(formData.packageCount, 10) || 0,
        declaredValue: parseFloat(formData.declaredValue) || 0,
        weight: parseFloat(formData.weight) || 0,
        freightAmount: parseFloat(formData.freightAmount) || 0,
        paymentMode: formData.paymentMode,
        goodsPhotos: uploadedPhotos,
        executiveSignature: signatureUrl,
        ...(editId && editStatus === "rejected" ? { status: "pending" } : {}),
      };

      const res = editId
        ? await api.updateLR(editId, payload)
        : await api.createLR(payload);

      if (res.success && res.data) {
        await saveAddressesIfNeeded();
        setSubmittedLr(res.data);
      } else {
        Alert.alert("Error", res.error || "Failed to submit LR");
      }
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "Failed to upload files"
      );
    } finally {
      setLoading(false);
    }
  }

  function handleNext() {
    if (!validateStep(currentStep)) return;
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep((s) => s + 1);
    } else {
      handleSubmit();
    }
  }

  function handlePrevious() {
    if (currentStep > 1) setCurrentStep((s) => s - 1);
  }

  async function pickPhoto() {
    const remaining = 5 - formData.goodsPhotos.length;
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
      updateField("goodsPhotos", [...formData.goodsPhotos, ...picked]);
    }
  }

  function removePhoto(index: number) {
    updateField(
      "goodsPhotos",
      formData.goodsPhotos.filter((_, i) => i !== index)
    );
  }

  if (initialLoading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (submittedLr) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.statusBarFill}>
          <SafeAreaView edges={["top"]} />
        </View>
        <LRSuccessScreen
          lr={submittedLr}
          onGoHome={() => router.replace("/(tabs)" as any)}
          onViewStatus={() => router.replace(`/(tabs)/lrs/${submittedLr.id}`)}
          contentBottom={contentBottom}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.statusBarFill}>
        <SafeAreaView edges={["top"]} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 12 : 0}
      >
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>{editId ? "Edit LR" : "Create LRs"}</Text>
        <Text style={styles.pageSubtitle}>Fill all details carefully</Text>
        <CreateLRStepIndicator currentStep={currentStep} />
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: contentPaddingBottom },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        onScroll={onScroll}
        scrollEventThrottle={scrollEventThrottle}
      >
        {currentStep === 1 ? (
          <View>
            <SectionHeader
              icon={<PersonSectionIcon size={18} color={COLORS.black} />}
              title="Consigner Details"
              actionLabel="Change Consigner"
              onAction={() => openAddressModal("consigner")}
            />
            <View style={styles.fieldGroup}>
              <RequiredLabel>Consigner Name</RequiredLabel>
              <View style={styles.inputWithIcon}>
                <TextInput
                  style={styles.inputFlex}
                  value={formData.consignerName}
                  onChangeText={(v) => updateField("consignerName", v)}
                  placeholder="Sr Transport"
                  placeholderTextColor={COLORS.textMuted}
                />
                <SearchIcon size={18} color="#9CA3AF" />
              </View>
            </View>
            <View style={styles.fieldGroup}>
              <RequiredLabel>Consigner Address</RequiredLabel>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.consignerAddress}
                onChangeText={(v) => updateField("consignerAddress", v)}
                placeholder="NH 1 Phagwara-Jalandhar HWY, Chhaba, 440013"
                placeholderTextColor={COLORS.textMuted}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                onFocus={onInputFocus}
              />
            </View>
            <CheckboxRow
              label="Save Address For Future Use"
              checked={formData.saveConsignerAddress}
              onToggle={() =>
                updateField("saveConsignerAddress", !formData.saveConsignerAddress)
              }
            />
          </View>
        ) : null}

        {currentStep === 2 ? (
          <View>
            <SectionHeader
              icon={<PersonSectionIcon size={18} color={COLORS.black} />}
              title="Consignee Details"
              actionLabel="Change Consignee"
              onAction={() => openAddressModal("consignee")}
            />
            <View style={styles.fieldGroup}>
              <RequiredLabel>Company Name</RequiredLabel>
              <View style={styles.inputWithIcon}>
                <TextInput
                  style={styles.inputFlex}
                  value={formData.consigneeCompany}
                  onChangeText={(v) => updateField("consigneeCompany", v)}
                  placeholder="ABC International"
                  placeholderTextColor={COLORS.textMuted}
                />
                <SearchIcon size={18} color="#9CA3AF" />
              </View>
            </View>
            <View style={styles.fieldGroup}>
              <RequiredLabel>Consignee Name</RequiredLabel>
              <TextInput
                style={styles.input}
                value={formData.consigneeName}
                onChangeText={(v) => updateField("consigneeName", v)}
                placeholder="Utsav Nagar"
                placeholderTextColor={COLORS.textMuted}
              />
            </View>
            <View style={styles.fieldGroup}>
              <RequiredLabel>Consignee Address</RequiredLabel>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.consigneeAddress}
                onChangeText={(v) => updateField("consigneeAddress", v)}
                placeholder="BIT Mesra Road, Mesra, Ranchi, Jharkhand 835215"
                placeholderTextColor={COLORS.textMuted}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                onFocus={onInputFocus}
              />
            </View>
            <CheckboxRow
              label="Save Address For Future Use"
              checked={formData.saveConsigneeAddress}
              onToggle={() =>
                updateField("saveConsigneeAddress", !formData.saveConsigneeAddress)
              }
            />
            <View style={styles.fieldGroup}>
              <RequiredLabel>Consignee Phone Number</RequiredLabel>
              <TextInput
                style={styles.input}
                value={formData.consigneeMobile}
                onChangeText={(value) =>
                  updateField("consigneeMobile", formatIndiaPhoneInput(value))
                }
                placeholder="+91 12345 67890"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="phone-pad"
                onFocus={onInputFocus}
              />
            </View>
          </View>
        ) : null}

        {currentStep === 3 ? (
          <View>
            <View style={styles.sectionTitleRow}>
              <ShipmentSectionIcon size={18} color={COLORS.black} />
              <Text style={styles.sectionTitle}>Shipment Details</Text>
            </View>

            <View style={styles.fieldGroup}>
              <RequiredLabel>Date of Dispatch</RequiredLabel>
              <TouchableOpacity style={styles.inputRow} onPress={() => setShowDatePicker(true)}>
                <Text style={styles.inputRowText}>
                  {formData.lrDate.toLocaleDateString("en-GB")}
                </Text>
                <CalendarOutlineIcon size={18} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <View style={styles.routeRow}>
              <View style={[styles.fieldGroup, styles.halfField]}>
                <RequiredLabel>From</RequiredLabel>
                <View style={styles.inputWithIcon}>
                  <TextInput
                    style={styles.inputFlex}
                    value={formData.originCity}
                    onChangeText={(v) => updateField("originCity", v)}
                    placeholder="Jaipur, RJ"
                    placeholderTextColor={COLORS.textMuted}
                  />
                  <SearchIcon size={16} color="#9CA3AF" />
                </View>
              </View>
              <ArrowForwardIcon size={16} color="#000000" style={styles.routeArrow} />
              <View style={[styles.fieldGroup, styles.halfField]}>
                <RequiredLabel>To</RequiredLabel>
                <View style={styles.inputWithIcon}>
                  <TextInput
                    style={styles.inputFlex}
                    value={formData.destinationCity}
                    onChangeText={(v) => updateField("destinationCity", v)}
                    placeholder="Lucknow, UP"
                    placeholderTextColor={COLORS.textMuted}
                  />
                  <SearchIcon size={16} color="#9CA3AF" />
                </View>
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <RequiredLabel>Vehicle Number</RequiredLabel>
              <TextInput
                style={styles.input}
                value={formData.vehicleNumber}
                onChangeText={(v) => updateField("vehicleNumber", v)}
                placeholder="GJ27 AZ 8990"
                placeholderTextColor={COLORS.textMuted}
                autoCapitalize="characters"
              />
            </View>

            <View style={styles.fieldGroup}>
              <RequiredLabel>Goods Description</RequiredLabel>
              <TextInput
                style={[styles.input, styles.textAreaLarge]}
                value={formData.goodsDescription}
                onChangeText={(v) => updateField("goodsDescription", v)}
                placeholder="Aero-Glide Pro Running Shoes..."
                placeholderTextColor={COLORS.textMuted}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
                onFocus={onInputFocus}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.fieldGroup, styles.halfField]}>
                <RequiredLabel>No. Of Package</RequiredLabel>
                <TextInput
                  style={styles.input}
                  value={formData.packageCount}
                  onChangeText={(v) => updateField("packageCount", v)}
                  placeholder="500"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="number-pad"
                />
              </View>
              <View style={[styles.fieldGroup, styles.halfField]}>
                <RequiredLabel>Declared Value (₹)</RequiredLabel>
                <TextInput
                  style={styles.input}
                  value={formData.declaredValue}
                  onChangeText={(v) => updateField("declaredValue", v)}
                  placeholder="85210"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.fieldGroup, styles.halfField]}>
                <RequiredLabel>Weight (KG)</RequiredLabel>
                <TextInput
                  style={styles.input}
                  value={formData.weight}
                  onChangeText={(v) => updateField("weight", v)}
                  placeholder="9898"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={[styles.fieldGroup, styles.halfField]}>
                <RequiredLabel>Freight Amount (₹)</RequiredLabel>
                <TextInput
                  style={styles.input}
                  value={formData.freightAmount}
                  onChangeText={(v) => updateField("freightAmount", v)}
                  placeholder="1000"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <RequiredLabel>Payment Mode</RequiredLabel>
              <View style={styles.segmentRow}>
                {PAYMENT_MODES.map((mode) => {
                  const active = formData.paymentMode === mode;
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

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Special Instruction</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.specialInstructions}
                onChangeText={(v) => updateField("specialInstructions", v)}
                placeholder="Extra Wrap Also Make Sure of Safety"
                placeholderTextColor={COLORS.textMuted}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                onFocus={onInputFocus}
              />
            </View>
          </View>
        ) : null}

        {currentStep === 4 ? (
          <View>
            <View style={styles.photosHeader}>
              <View style={styles.sectionTitleRowInline}>
                <CameraSectionIcon size={18} color={COLORS.black} />
                <Text style={styles.sectionTitle}>Goods Photos (Optional)</Text>
              </View>
              <View style={styles.maxPhotosBadge}>
                <Text style={styles.maxPhotosText}>Max 5 Photos</Text>
              </View>
            </View>

            {formData.goodsPhotos.length === 0 ? (
              <TouchableOpacity style={styles.uploadArea} onPress={pickPhoto}>
                <ImageOutlineIcon size={28} color={COLORS.primary} />
                <Text style={styles.uploadTitle}>Tap to Upload PNG/JPG</Text>
                <Text style={styles.uploadHint}>Recommended: 200*200 px</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.photoGridWrap}>
                <View style={styles.photoGrid}>
                {formData.goodsPhotos.map((photo, index) => (
                  <View key={`${photo}-${index}`} style={styles.photoThumbWrap}>
                    <Image source={{ uri: photo }} style={styles.photoThumb} />
                    <TouchableOpacity
                      style={styles.photoRemove}
                      onPress={() => removePhoto(index)}
                    >
                      <IonCloseIcon size={12} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                ))}
                {formData.goodsPhotos.length < 5 ? (
                  <TouchableOpacity style={styles.photoAdd} onPress={pickPhoto}>
                    <AddIcon size={24} color={COLORS.primary} />
                  </TouchableOpacity>
                ) : null}
                </View>
              </View>
            )}

            <View style={[styles.sectionTitleRowInline, styles.signatureSection]}>
              <SignatureSectionIcon size={18} color={COLORS.black} />
              <Text style={styles.sectionTitle}>
                Executive Signature<Text style={styles.required}>*</Text>
              </Text>
            </View>

            {formData.signature ? (
              <View style={styles.signaturePreview}>
                {formData.signature.startsWith("data:") || formData.signature.startsWith("http") ? (
                  <Image
                    source={{ uri: formData.signature }}
                    style={styles.signatureImage}
                    resizeMode="contain"
                  />
                ) : (
                  <Text style={styles.signaturePlaceholder}>Signature captured</Text>
                )}
                <TouchableOpacity
                  style={styles.signatureEdit}
                  onPress={() => {
                    setSignatureConfirmed(false);
                    setShowSignature(true);
                  }}
                >
                  <CreateOutlineIcon size={14} color={COLORS.primary} />
                  <Text style={styles.signatureEditText}>Edit</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.signHereBox}
                onPress={() => setShowSignature(true)}
              >
                <PencilIcon size={18} color={COLORS.primary} />
                <Text style={styles.signHereText}>Sign Here</Text>
              </TouchableOpacity>
            )}

            {formData.signature ? (
              <View style={styles.signatureActions}>
                <TouchableOpacity
                  style={styles.sigClearBtn}
                  onPress={() => {
                    updateField("signature", "");
                    setSignatureSavedMsg(false);
                    setSignatureConfirmed(false);
                  }}
                >
                  <IonCloseIcon size={14} color="#6B7280" />
                  <Text style={styles.sigClearText}>Clear</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.sigConfirmBtn,
                    signatureConfirmed && styles.sigConfirmBtnActive,
                  ]}
                  onPress={() => {
                    setSignatureConfirmed(true);
                    setSignatureSavedMsg(true);
                    setTimeout(() => setSignatureSavedMsg(false), 3000);
                  }}
                >
                  <Text
                    style={[
                      styles.sigConfirmText,
                      signatureConfirmed && styles.sigConfirmTextActive,
                    ]}
                  >
                    Confirm Signature
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {signatureSavedMsg ? (
              <View style={styles.signatureToast}>
                <CheckmarkCircleIcon size={16} color="#0C6B24" />
                <Text style={styles.signatureToastText}>Signature Saved Successfully</Text>
              </View>
            ) : null}

            {currentStep === TOTAL_STEPS && formData.signature && signatureConfirmed ? (
              <TouchableOpacity
                style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={loading}
              >
                <CheckmarkCircleOutlineIcon size={18} color="#FFFFFF" />
                <Text style={styles.submitButtonText}>
                  {loading ? "Submitting..." : "Submit LR"}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: contentBottom }]}>
        <TouchableOpacity
          style={[styles.prevButton, currentStep === 1 && styles.prevButtonDisabled]}
          onPress={handlePrevious}
          disabled={currentStep === 1}
        >
          <Text
            style={[
              styles.prevButtonText,
              currentStep === 1 && styles.prevButtonTextDisabled,
            ]}
          >
            Previous
          </Text>
        </TouchableOpacity>
        {currentStep < TOTAL_STEPS ? (
          <TouchableOpacity
            style={[styles.nextButton, loading && styles.nextButtonDisabled]}
            onPress={handleNext}
            disabled={loading}
          >
            <Text style={styles.nextButtonText}>Next →</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.nextPlaceholder} />
        )}
      </View>

      <SavedAddressModal
        visible={showAddressModal}
        type={addressModalType}
        onClose={() => setShowAddressModal(false)}
        onSelect={handleAddressSelect}
      />

      <SignatureCapture
        visible={showSignature}
        onClose={() => setShowSignature(false)}
        onSave={(sig) => {
          updateField("signature", sig);
          setSignatureConfirmed(false);
          setSignatureSavedMsg(false);
        }}
        userName={user?.name?.split(" ")[0] || "User"}
      />

      {showDatePicker ? (
        <DateTimePicker
          value={formData.lrDate}
          mode="date"
          onChange={(_, date) => {
            setShowDatePicker(Platform.OS === "ios");
            if (date) updateField("lrDate", date);
          }}
        />
      ) : null}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  flex: { flex: 1 },
  loadingWrap: { flex: 1, justifyContent: "center", alignItems: "center" },
  statusBarFill: { backgroundColor: COLORS.primary },
  pageHeader: { paddingTop: 16, backgroundColor: COLORS.white },
  pageTitle: {
    fontSize: FONT_SIZES.xl,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    paddingHorizontal: 24,
  },
  pageSubtitle: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
    paddingHorizontal: 24,
    marginTop: 4,
    marginBottom: 12,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 16 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  sectionTitleRowInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.semiBold,
    color: COLORS.text,
  },
  changeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  changeButtonText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.semiBold,
    color: COLORS.white,
  },
  fieldGroup: { marginBottom: 14 },
  label: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  required: { color: COLORS.error },
  input: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.semiBold,
    color: COLORS.text,
  },
  inputFlex: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.semiBold,
    color: COLORS.text,
    padding: 0,
  },
  inputWithIcon: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 8,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  inputRowText: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.semiBold,
    color: COLORS.text,
  },
  textArea: { minHeight: 100, paddingTop: 14 },
  textAreaLarge: { minHeight: 120, paddingTop: 14 },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.white,
  },
  checkboxChecked: { backgroundColor: "#000000" },
  checkboxLabel: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.regular,
    color: COLORS.text,
  },
  routeRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 6,
    marginBottom: 4,
  },
  routeArrow: { marginBottom: 22 },
  row: { flexDirection: "row", gap: 10 },
  halfField: { flex: 1 },
  segmentRow: { flexDirection: "row", gap: 8 },
  segment: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLORS.backgroundSecondary,
    alignItems: "center",
  },
  segmentActive: { backgroundColor: "rgba(94, 62, 161, 0.12)" },
  segmentText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.medium,
    color: COLORS.text,
  },
  segmentTextActive: {
    fontFamily: FONTS.semiBold,
    color: COLORS.black,
  },
  photosHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  maxPhotosBadge: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  maxPhotosText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
  },
  uploadArea: {
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderStyle: "dashed",
    borderRadius: 12,
    paddingVertical: 36,
    alignItems: "center",
    gap: 6,
    marginBottom: 20,
  },
  uploadTitle: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.semiBold,
    color: COLORS.primary,
  },
  uploadHint: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
  },
  photoGridWrap: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  photoThumbWrap: { position: "relative" },
  photoThumb: { width: 80, height: 80, borderRadius: 10 },
  photoRemove: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
  },
  photoAdd: {
    width: 80,
    height: 80,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    alignItems: "center",
    justifyContent: "center",
  },
  signatureSection: { marginTop: 4 },
  signHereBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 12,
    paddingVertical: 40,
    marginBottom: 12,
  },
  signHereText: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.semiBold,
    color: COLORS.primary,
  },
  signaturePreview: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 12,
    padding: 16,
    minHeight: 120,
    marginBottom: 12,
    position: "relative",
  },
  signatureImage: { width: "100%", height: 80 },
  signaturePlaceholder: { fontSize: 14, color: COLORS.textMuted, textAlign: "center" },
  signatureEdit: {
    position: "absolute",
    bottom: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  signatureEditText: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.semiBold,
    color: COLORS.primary,
  },
  signatureActions: { flexDirection: "row", gap: 10, marginBottom: 12 },
  sigClearBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  sigClearText: { fontSize: 12, fontWeight: "600", color: "#6B7280" },
  sigConfirmBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    backgroundColor: COLORS.white,
  },
  sigConfirmBtnActive: {
    backgroundColor: COLORS.black,
    borderColor: COLORS.black,
  },
  sigConfirmText: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.semiBold,
    color: "#9CA3AF",
  },
  sigConfirmTextActive: { color: COLORS.white },
  signatureToast: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#EBF9EE",
    borderRadius: 32,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  signatureToastText: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.semiBold,
    color: "#0C6B24",
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COLORS.black,
    borderRadius: 32,
    paddingVertical: 14,
    marginTop: 4,
  },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.semiBold,
    color: COLORS.white,
  },
  footer: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 24,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    backgroundColor: COLORS.white,
  },
  prevButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: "#000000",
    alignItems: "center",
  },
  prevButtonDisabled: { borderColor: "#E5E7EB" },
  prevButtonText: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.semiBold,
    color: COLORS.text,
  },
  prevButtonTextDisabled: { color: "#D1D5DB" },
  nextButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 32,
    backgroundColor: COLORS.black,
    alignItems: "center",
  },
  nextButtonDisabled: { opacity: 0.6 },
  nextButtonText: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.semiBold,
    color: COLORS.white,
  },
  nextPlaceholder: { flex: 1 },
  successScroll: { flex: 1, backgroundColor: COLORS.white },
  successContent: { padding: 24, alignItems: "center" },
  successIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.success,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    marginTop: 20,
  },
  successTitle: {
    fontSize: FONT_SIZES.xl,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    textAlign: "center",
    marginBottom: 10,
  },
  successBody: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  trackingCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    width: "100%",
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  trackingIconBox: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
  },
  trackingInfo: { flex: 1 },
  trackingLabel: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
  },
  trackingId: {
    fontSize: FONT_SIZES.lg,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    marginTop: 2,
  },
  pendingBadge: {
    backgroundColor: COLORS.chipPendingBg,
    borderRadius: 2,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pendingBadgeText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.semiBold,
    color: COLORS.pendingText,
  },
  timelineCard: {
    width: "100%",
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  timelineHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  timelineTitle: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.semiBold,
    color: COLORS.text,
  },
  timelineRow: { flexDirection: "row", gap: 12, marginBottom: 4 },
  timelineLeft: { alignItems: "center", width: 32 },
  timelineIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  timelineLine: {
    width: 2,
    flex: 1,
    marginVertical: 4,
    minHeight: 28,
  },
  timelineLineDashed: { opacity: 0.5 },
  timelineText: { flex: 1, paddingBottom: 16 },
  timelineItemTitle: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.semiBold,
    color: COLORS.text,
  },
  timelineItemTitleMuted: { color: COLORS.textMuted },
  timelineItemSub: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  successActions: { flexDirection: "row", gap: 12, width: "100%" },
  goHomeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: "#000000",
  },
  goHomeText: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.semiBold,
    color: COLORS.text,
  },
  viewStatusButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    borderRadius: 32,
    backgroundColor: COLORS.black,
  },
  viewStatusText: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.semiBold,
    color: COLORS.white,
  },
});
