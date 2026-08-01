import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { router, useLocalSearchParams } from "expo-router";
import { COLORS, SPACING } from "../../constants/theme";
import { FONTS } from "../../constants/fonts";
import { api } from "../../lib/api";
import type { Executive } from "../../types";
import { useContentBottomPadding } from "../../hooks/useScreenInsets";
import {
  PlusIcon,
  SearchIcon,
  ToastErrorIcon,
  ToastSuccessIcon,
  UserIcon,
} from "../icons";

type BranchOption = {
  id: string;
  label: string;
};

type ToastState = {
  type: "success" | "error";
  message: string;
};

function formatMobile(mobile: string) {
  const digits = mobile.replace(/\D/g, "").slice(-10);
  if (digits.length !== 10) return mobile;
  return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
}

function AddExecutiveButton({
  onPress,
  variant = "header",
}: {
  onPress: () => void;
  variant?: "header" | "empty";
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        variant === "header" ? styles.addButtonHeader : styles.addButtonEmpty,
        pressed && styles.pressed,
      ]}
    >
      <PlusIcon size={10} color={COLORS.white} />
      <Text
        style={
          variant === "header"
            ? styles.addButtonHeaderText
            : styles.addButtonEmptyText
        }
      >
        Add Executive
      </Text>
    </Pressable>
  );
}

function ExecutiveCard({ executive }: { executive: Executive }) {
  const lrCount = executive.lrsThisMonth ?? 0;

  return (
    <View style={styles.executiveCard}>
      <View style={styles.executiveContent}>
        <View style={styles.avatar}>
          <UserIcon size={24} color={COLORS.black} />
        </View>
        <View style={styles.executiveInfo}>
          <Text style={styles.executiveName}>{executive.name}</Text>
          <Text style={styles.executivePhone}>{formatMobile(executive.mobile)}</Text>
        </View>
      </View>
      <View style={styles.executiveBadge}>
        <View style={styles.executiveBadgeDot} />
        <Text style={styles.executiveBadgeText}>
          {lrCount} LR
        </Text>
      </View>
    </View>
  );
}

function InviteExecutiveForm({
  name,
  mobile,
  selectedBranchId,
  branches,
  submitting,
  onNameChange,
  onMobileChange,
  onBranchSelect,
  onCancel,
  onSubmit,
}: {
  name: string;
  mobile: string;
  selectedBranchId: string;
  branches: BranchOption[];
  submitting: boolean;
  onNameChange: (value: string) => void;
  onMobileChange: (value: string) => void;
  onBranchSelect: (id: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  return (
    <View style={styles.inviteCard}>
      <View style={styles.inviteHeader}>
        <Text style={styles.inviteTitle}>Invite Executive</Text>
        <Text style={styles.inviteSubtitle}>
          They'll get access on first OTP login from their phone.
        </Text>
      </View>

      <View style={styles.inviteFields}>
        <View style={styles.formGroup}>
          <Text style={styles.label}>Mobile Number*</Text>
          <View style={styles.phoneInputContainer}>
            <Text style={styles.phonePrefix}>+91</Text>
            <TextInput
              style={styles.phoneInput}
              value={mobile}
              onChangeText={(text) =>
                onMobileChange(text.replace(/\D/g, "").slice(0, 10))
              }
              keyboardType="phone-pad"
              maxLength={10}
              placeholderTextColor={COLORS.textSecondary}
            />
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Executive Name*</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={onNameChange}
            placeholder="Ravi Kumar"
            placeholderTextColor={COLORS.textSecondary}
            autoCapitalize="words"
          />
        </View>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Branch*</Text>
        {branches.length === 0 ? (
          <View style={styles.noBranchNote}>
            <Text style={styles.noBranchNoteText}>
              No branches found. To add a new executive, please add a branch
              first from the Company Admin web portal (Branches section).
            </Text>
          </View>
        ) : (
          <View style={styles.branchChips}>
            {branches.map((branch) => {
              const isActive = selectedBranchId === branch.id;
              return (
                <Pressable
                  key={branch.id}
                  onPress={() => onBranchSelect(branch.id)}
                  style={({ pressed }) => [
                    styles.chip,
                    isActive && styles.chipActive,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                    {branch.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>

      <View style={styles.buttonRow}>
        <Pressable
          onPress={onCancel}
          style={({ pressed }) => [styles.cancelButton, pressed && styles.pressed]}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </Pressable>
        <Pressable
          onPress={onSubmit}
          disabled={submitting || branches.length === 0}
          style={({ pressed }) => [
            styles.submitButton,
            (submitting || branches.length === 0) && styles.submitButtonDisabled,
            pressed && !submitting && branches.length > 0 && styles.pressed,
          ]}
        >
          {submitting ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.submitButtonText}>Send Invite</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

export function AdminExecutives() {
  const { invite } = useLocalSearchParams<{ invite?: string }>();

  const [search, setSearch] = useState("");
  const [executives, setExecutives] = useState<Executive[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const contentBottom = useContentBottomPadding();

  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [selectedBranchId, setSelectedBranchId] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    const [executivesRes, branchesRes] = await Promise.all([
      api.getExecutives(),
      api.getBranches(),
    ]);

    if (executivesRes.success && executivesRes.data) {
      setExecutives(executivesRes.data);
    }

    if (branchesRes.success && branchesRes.data) {
      const options = branchesRes.data.map((branch) => ({
        id: branch.id,
        label: branch.name.toLowerCase().includes("branch")
          ? branch.name
          : `${branch.city} Branch`,
      }));
      setBranches(options);
      if (options.length > 0) {
        setSelectedBranchId((current) => current || options[0].id);
      }
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (invite === "1") {
      setShowInviteForm(true);
    }
  }, [invite]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const filteredExecutives = executives.filter((executive) => {
    if (!search) return true;
    const query = search.toLowerCase();
    return (
      executive.name.toLowerCase().includes(query) ||
      executive.mobile.includes(search.replace(/\D/g, ""))
    );
  });

  const hasExecutives = executives.length > 0;

  function openInviteForm() {
    setName("");
    setMobile("");
    if (branches.length > 0) {
      setSelectedBranchId(branches[0].id);
    }
    setShowInviteForm(true);
  }

  function closeInviteForm() {
    setShowInviteForm(false);
    if (invite === "1") {
      router.replace("/(tabs)/executives");
    }
  }

  async function handleSendInvite() {
    if (!name.trim() || mobile.length !== 10 || !selectedBranchId) {
      setToast({ type: "error", message: "Error Adding the Executive" });
      return;
    }

    setSubmitting(true);
    const res = await api.inviteExecutive(mobile, selectedBranchId, name.trim());
    setSubmitting(false);

    if (res.success) {
      closeInviteForm();
      await loadData();
      setToast({
        type: "success",
        message: `Invite has been sent to ${name.trim()}`,
      });
      return;
    }

    setToast({
      type: "error",
      message: res.error || "Error Adding the Executive",
    });
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Executives</Text>
          {hasExecutives && !showInviteForm ? (
            <AddExecutiveButton onPress={openInviteForm} variant="header" />
          ) : null}
        </View>

        <View style={styles.searchContainer}>
          <SearchIcon size={18} color={COLORS.textDark} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by Executive Name"
            placeholderTextColor={COLORS.textDark}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {loading ? (
          <ActivityIndicator
            size="large"
            color={COLORS.primary}
            style={styles.loader}
          />
        ) : showInviteForm ? (
          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: contentBottom },
            ]}
          >
            <InviteExecutiveForm
              name={name}
              mobile={mobile}
              selectedBranchId={selectedBranchId}
              branches={branches}
              submitting={submitting}
              onNameChange={setName}
              onMobileChange={setMobile}
              onBranchSelect={setSelectedBranchId}
              onCancel={closeInviteForm}
              onSubmit={handleSendInvite}
            />
          </ScrollView>
        ) : !hasExecutives ? (
          <View style={styles.emptyContainer}>
            <AddExecutiveButton onPress={openInviteForm} variant="empty" />
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
            {filteredExecutives.map((executive) => (
              <ExecutiveCard key={executive.id} executive={executive} />
            ))}

            {filteredExecutives.length === 0 ? (
              <Text style={styles.emptySearchText}>No executives found</Text>
            ) : null}
          </ScrollView>
        )}
      </SafeAreaView>

      {toast ? (
        <View
          style={[
            styles.toast,
            toast.type === "success" ? styles.toastSuccess : styles.toastError,
          ]}
        >
          {toast.type === "success" ? (
            <ToastSuccessIcon />
          ) : (
            <ToastErrorIcon />
          )}
          <Text
            style={[
              styles.toastText,
              toast.type === "success"
                ? styles.toastTextSuccess
                : styles.toastTextError,
            ]}
          >
            {toast.message}
          </Text>
        </View>
      ) : null}
    </KeyboardAvoidingView>
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  headerTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: 18,
    color: COLORS.black,
  },
  addButtonHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonHeaderText: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.white,
  },
  addButtonEmpty: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.primary,
    borderWidth: 1,
    borderColor: COLORS.borderMuted,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 10,
    minHeight: 40,
  },
  addButtonEmptyText: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.white,
  },
  pressed: {
    opacity: 0.85,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.backgroundSecondary,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    paddingHorizontal: 10,
    paddingVertical: 11,
    borderRadius: 12,
    gap: 8,
    minHeight: 40,
  },
  searchInput: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textDark,
    padding: 0,
  },
  loader: {
    marginTop: 40,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: SPACING.lg,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    gap: 12,
  },
  executiveCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  executiveContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    flex: 1,
  },
  avatar: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: COLORS.white,
  },
  executiveInfo: {
    flex: 1,
    gap: 10,
  },
  executiveName: {
    fontFamily: FONTS.semiBold,
    fontSize: 16,
    color: COLORS.black,
  },
  executivePhone: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  executiveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: COLORS.approved,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  executiveBadgeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.success,
  },
  executiveBadgeText: {
    fontFamily: FONTS.semiBold,
    fontSize: 10,
    color: COLORS.success,
  },
  emptySearchText: {
    textAlign: "center",
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: 40,
  },
  inviteCard: {
    backgroundColor: COLORS.modalBg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.borderMuted,
    padding: 16,
    gap: 24,
  },
  inviteHeader: {
    gap: 8,
  },
  inviteTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: 18,
    color: COLORS.black,
  },
  inviteSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textDark,
  },
  inviteFields: {
    gap: 16,
  },
  formGroup: {
    gap: 8,
  },
  label: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.accentRed,
    lineHeight: 17,
  },
  phoneInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderRadius: 27,
    paddingHorizontal: 20,
    paddingVertical: 16,
    minHeight: 48,
  },
  phonePrefix: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textSecondary,
    marginRight: 8,
  },
  phoneInput: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.black,
    padding: 0,
  },
  input: {
    backgroundColor: COLORS.white,
    borderRadius: 27,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.black,
    minHeight: 48,
  },
  branchChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  noBranchNote: {
    backgroundColor: "#FFF4E5",
    borderWidth: 1,
    borderColor: "#FFD8A8",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  noBranchNoteText: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: "#8A5A00",
    lineHeight: 17,
  },
  chip: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 27,
  },
  chipActive: {
    backgroundColor: COLORS.primary,
  },
  chipText: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.black,
  },
  chipTextActive: {
    color: COLORS.white,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 16,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.black,
  },
  cancelButtonText: {
    fontFamily: FONTS.regular,
    fontSize: 16,
    color: COLORS.black,
    lineHeight: 18,
  },
  submitButton: {
    flex: 1,
    backgroundColor: COLORS.buttonPrimary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 42,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontFamily: FONTS.regular,
    fontSize: 16,
    color: COLORS.white,
    lineHeight: 18,
  },
  toast: {
    position: "absolute",
    left: SPACING.lg,
    right: SPACING.lg,
    bottom: 100,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "center",
  },
  toastSuccess: {
    backgroundColor: COLORS.approved,
  },
  toastError: {
    backgroundColor: COLORS.rejected,
  },
  toastText: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: 14,
  },
  toastTextSuccess: {
    color: COLORS.success,
  },
  toastTextError: {
    color: COLORS.error,
  },
});
