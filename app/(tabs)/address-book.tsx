import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useState, useEffect, useCallback } from "react";
import { router } from "expo-router";
import {
  BusinessOutlineIcon,
  CreateOutlineIcon,
  EllipsisVerticalIcon,
  TrashOutlineIcon,
} from "../../components/icons";
import { useAuth } from "../../lib/auth";
import { addressBook } from "../../lib/addresses";
import type { Address } from "../../types";
import { COLORS, FONT_SIZES } from "../../constants/theme";
import { FONTS } from "../../constants/fonts";
import { RoleGuard } from "../../components/RoleGuard";
import { useContentBottomPadding } from "../../hooks/useScreenInsets";
import { useKeyboardAwareScroll } from "../../hooks/useKeyboardAwareScroll";
import { ChevronBackIcon, PlusIcon } from "../../components/icons";

type AddressType = "consigner" | "consignee";
type ScreenMode = "list" | "form";

interface FormState {
  company: string;
  address: string;
  pincode: string;
}

const EMPTY_FORM: FormState = {
  company: "",
  address: "",
  pincode: "",
};

const TABS: { key: AddressType; label: string }[] = [
  { key: "consigner", label: "Consigner" },
  { key: "consignee", label: "Consignee" },
];

function formatAddressLine(address: Address) {
  if (address.pincode && !address.address.includes(address.pincode)) {
    return `${address.address}, ${address.pincode}`;
  }
  return address.address;
}

function RequiredLabel({ children }: { children: string }) {
  const parts = children.split("*");
  return (
    <Text style={styles.fieldLabel}>
      {parts[0]}
      <Text style={styles.required}>*</Text>
    </Text>
  );
}

function AddressTypeTabs({
  activeTab,
  onChange,
  variant,
}: {
  activeTab: AddressType;
  onChange: (tab: AddressType) => void;
  variant: "segment" | "pill";
}) {
  if (variant === "segment") {
    return (
      <View style={styles.segmentRow}>
        {TABS.map((tab, index) => {
          const active = activeTab === tab.key;
          const isFirst = index === 0;
          return (
            <Pressable
              key={tab.key}
              style={[
                styles.segmentTab,
                isFirst ? styles.segmentTabLeft : styles.segmentTabRight,
                active ? styles.segmentTabActive : styles.segmentTabInactive,
                !active && isFirst && styles.segmentTabInactiveLeft,
                !active && !isFirst && styles.segmentTabInactiveRight,
              ]}
              onPress={() => onChange(tab.key)}
            >
              <Text
                style={[
                  styles.segmentTabText,
                  active ? styles.segmentTabTextActive : styles.segmentTabTextInactive,
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    );
  }

  return (
    <View style={styles.pillRow}>
      {TABS.map((tab) => {
        const active = activeTab === tab.key;
        return (
          <Pressable
            key={tab.key}
            style={[styles.pillTab, active ? styles.pillTabActive : styles.pillTabInactive]}
            onPress={() => onChange(tab.key)}
          >
            <Text
              style={[
                styles.pillTabText,
                active ? styles.pillTabTextActive : styles.pillTabTextInactive,
              ]}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function AddressCard({
  address,
  selected,
  onSelect,
  menuOpen,
  onToggleMenu,
  onEdit,
  onDelete,
}: {
  address: Address;
  selected: boolean;
  onSelect: () => void;
  menuOpen: boolean;
  onToggleMenu: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <View style={styles.cardWrap}>
      <View style={[styles.card, selected ? styles.cardSelected : styles.cardDefault]}>
        <Pressable style={styles.cardMain} onPress={onSelect}>
          <View style={[styles.cardIconBox, selected && styles.cardIconBoxSelected]}>
            <BusinessOutlineIcon size={22} color={COLORS.black} />
          </View>
          <View style={styles.cardBody}>
            {selected ? (
              <Text style={styles.selectedLabel}>Current Selected Address</Text>
            ) : null}
            <Text style={styles.cardAddress}>{formatAddressLine(address)}</Text>
          </View>
        </Pressable>
        <Pressable
          style={styles.menuButton}
          onPress={onToggleMenu}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <EllipsisVerticalIcon size={20} color={COLORS.black} />
        </Pressable>
      </View>
      {menuOpen ? (
        <View style={styles.contextMenu}>
          <Pressable style={styles.contextMenuRow} onPress={onEdit}>
            <View style={styles.contextMenuIcon}>
              <CreateOutlineIcon size={16} color={COLORS.black} />
            </View>
            <Text style={styles.contextMenuText}>Edit</Text>
          </Pressable>
          <View style={styles.contextMenuDivider} />
          <Pressable style={styles.contextMenuRow} onPress={onDelete}>
            <View style={styles.contextMenuIcon}>
              <TrashOutlineIcon size={16} color={COLORS.black} />
            </View>
            <Text style={styles.contextMenuText}>Delete</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

export default function AddressBookScreen() {
  const { user } = useAuth();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<AddressType>("consigner");
  const [mode, setMode] = useState<ScreenMode>("list");
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Partial<Record<AddressType, string>>>({});
  const [menuAddressId, setMenuAddressId] = useState<string | null>(null);
  const contentBottom = useContentBottomPadding();
  const { scrollRef, contentPaddingBottom, onInputFocus, onScroll, scrollEventThrottle } =
    useKeyboardAwareScroll({
      footerHeight: 40,
      extraPadding: 32,
    });

  const loadAddresses = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [list, consignerId, consigneeId] = await Promise.all([
        addressBook.list(user.id),
        addressBook.getSelected(user.id, "consigner"),
        addressBook.getSelected(user.id, "consignee"),
      ]);
      setAddresses(list);
      const nextSelected: Partial<Record<AddressType, string>> = {
        consigner: consignerId ?? undefined,
        consignee: consigneeId ?? undefined,
      };
      for (const type of ["consigner", "consignee"] as AddressType[]) {
        if (!nextSelected[type]) {
          const first = list.find((a) => a.type === type);
          if (first) {
            nextSelected[type] = first.id;
            await addressBook.setSelected(user.id, type, first.id);
          }
        }
      }
      setSelectedIds(nextSelected);
    } catch {
      setAddresses([]);
      setSelectedIds({});
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadAddresses();
  }, [loadAddresses]);

  const tabAddresses = addresses.filter((a) => a.type === activeTab);
  const selectedId = selectedIds[activeTab];
  const sortedAddresses = [...tabAddresses].sort((a, b) => {
    if (a.id === selectedId) return -1;
    if (b.id === selectedId) return 1;
    return 0;
  });

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditId(null);
    setMode("list");
  }

  function openAdd() {
    setEditId(null);
    setForm(EMPTY_FORM);
    setMode("form");
  }

  function openEdit(address: Address) {
    setActiveTab(address.type);
    setEditId(address.id);
    setForm({
      company: address.company ?? "",
      address: address.address,
      pincode: address.pincode ?? "",
    });
    setMode("form");
  }

  function handleTabChange(tab: AddressType) {
    setActiveTab(tab);
    if (mode === "form" && !editId) {
      setForm(EMPTY_FORM);
    }
  }

  async function handleSelect(address: Address) {
    if (!user) return;
    await addressBook.setSelected(user.id, address.type, address.id);
    setSelectedIds((prev) => ({ ...prev, [address.type]: address.id }));
  }

  function handleDelete(address: Address) {
    setMenuAddressId(null);
    Alert.alert("Delete Address", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await addressBook.delete(address.id);
          if (selectedIds[address.type] === address.id && user) {
            await addressBook.setSelected(user.id, address.type, "");
          }
          await loadAddresses();
        },
      },
    ]);
  }

  function handleEdit(address: Address) {
    setMenuAddressId(null);
    openEdit(address);
  }

  async function handleSubmit() {
    if (!user) return;

    if (activeTab === "consignee" && !form.company.trim()) {
      Alert.alert("Validation", "Company name is required");
      return;
    }
    if (!form.address.trim()) {
      Alert.alert("Validation", "Address is required");
      return;
    }
    if (!form.pincode.trim()) {
      Alert.alert("Validation", "Pincode is required");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        type: activeTab,
        name:
          activeTab === "consignee"
            ? form.company.trim()
            : form.address.trim().split(",")[0],
        company: activeTab === "consignee" ? form.company.trim() : undefined,
        address: form.address.trim(),
        pincode: form.pincode.trim(),
        phone: "",
      };

      if (editId) {
        await addressBook.update(editId, payload);
      } else {
        const created = await addressBook.create(user.id, payload);
        await addressBook.setSelected(user.id, activeTab, created.id);
      }

      resetForm();
      await loadAddresses();
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "Failed to save address"
      );
    } finally {
      setSaving(false);
    }
  }

  const addressPrefix = activeTab === "consigner" ? "Consigner" : "Consignee";

  return (
    <RoleGuard allowedRoles={["executive"]}>
      <View style={styles.container}>
        <StatusBar style="light" />

        <View style={styles.header}>
          <SafeAreaView edges={["top"]}>
            <View style={styles.headerRow}>
              <Pressable
                onPress={() => router.back()}
                style={styles.backButton}
                hitSlop={8}
              >
                <ChevronBackIcon size={24} color={COLORS.white} />
              </Pressable>
              <Text style={styles.headerTitle}>Address Book</Text>
              <View style={styles.headerSpacer} />
            </View>
          </SafeAreaView>
        </View>

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.body}>
            <AddressTypeTabs
              activeTab={activeTab}
              onChange={handleTabChange}
              variant={mode === "list" ? "segment" : "pill"}
            />

            {mode === "list" ? (
              <>
                <Pressable
                  style={({ pressed }) => [
                    styles.addButton,
                    pressed && styles.pressed,
                  ]}
                  onPress={openAdd}
                >
                  <PlusIcon size={12} color={COLORS.textDark} />
                  <Text style={styles.addButtonText}>Add New Address</Text>
                </Pressable>

                {loading ? (
                  <ActivityIndicator
                    size="large"
                    color={COLORS.primary}
                    style={styles.loader}
                  />
                ) : (
                  <FlatList
                    data={sortedAddresses}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={[
                      styles.listContent,
                      { paddingBottom: contentBottom },
                    ]}
                    renderItem={({ item }) => (
                      <AddressCard
                        address={item}
                        selected={item.id === selectedId}
                        onSelect={() => handleSelect(item)}
                        menuOpen={menuAddressId === item.id}
                        onToggleMenu={() =>
                          setMenuAddressId((prev) => (prev === item.id ? null : item.id))
                        }
                        onEdit={() => handleEdit(item)}
                        onDelete={() => handleDelete(item)}
                      />
                    )}
                    ItemSeparatorComponent={() => <View style={styles.listGap} />}
                    showsVerticalScrollIndicator={false}
                  />
                )}
              </>
            ) : (
              <ScrollView
                ref={scrollRef}
                style={styles.flex}
                contentContainerStyle={[
                  styles.formContent,
                  { paddingBottom: contentPaddingBottom },
                ]}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                showsVerticalScrollIndicator={false}
                onScroll={onScroll}
                scrollEventThrottle={scrollEventThrottle}
              >
                {activeTab === "consignee" ? (
                  <View style={styles.fieldGroup}>
                    <RequiredLabel>Company Name</RequiredLabel>
                    <TextInput
                      style={styles.input}
                      value={form.company}
                      onChangeText={(v) => setForm((f) => ({ ...f, company: v }))}
                      placeholder="ABC International"
                      placeholderTextColor={COLORS.textSecondary}
                      onFocus={onInputFocus}
                    />
                  </View>
                ) : null}

                <View style={styles.fieldGroup}>
                  <RequiredLabel>{`${addressPrefix} Address`}</RequiredLabel>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={form.address}
                    onChangeText={(v) => setForm((f) => ({ ...f, address: v }))}
                    placeholder="NH 1 Phagwara-Jalandhar HWY, Chhaba, Punjab"
                    placeholderTextColor={COLORS.textSecondary}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    onFocus={onInputFocus}
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <RequiredLabel>{`${addressPrefix} Address Pincode`}</RequiredLabel>
                  <TextInput
                    style={styles.input}
                    value={form.pincode}
                    onChangeText={(v) => setForm((f) => ({ ...f, pincode: v }))}
                    placeholder="380008"
                    placeholderTextColor={COLORS.textSecondary}
                    keyboardType="number-pad"
                    maxLength={6}
                    onFocus={onInputFocus}
                  />
                </View>

                <View style={styles.formActions}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.cancelButton,
                      pressed && styles.pressed,
                    ]}
                    onPress={resetForm}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [
                      styles.submitButton,
                      saving && styles.submitButtonDisabled,
                      pressed && !saving && styles.pressed,
                    ]}
                    onPress={handleSubmit}
                    disabled={saving}
                  >
                    {editId ? (
                      <Text style={styles.submitButtonText}>Save</Text>
                    ) : (
                      <>
                        <PlusIcon size={8} color={COLORS.white} />
                        <Text style={styles.submitButtonText}>Add</Text>
                      </>
                    )}
                  </Pressable>
                </View>
              </ScrollView>
            )}
          </View>
        </KeyboardAvoidingView>
      </View>
    </RoleGuard>
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
  header: {
    backgroundColor: COLORS.primary,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    fontSize: FONT_SIZES.xl,
    fontFamily: FONTS.semiBold,
    color: COLORS.white,
    textAlign: "center",
  },
  headerSpacer: {
    width: 40,
  },
  body: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    gap: 16,
  },
  segmentRow: {
    flexDirection: "row",
    height: 46,
    alignItems: "stretch",
  },
  segmentTab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 11,
  },
  segmentTabLeft: {
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  segmentTabRight: {
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
  },
  segmentTabActive: {
    backgroundColor: COLORS.primary,
  },
  segmentTabInactive: {
    backgroundColor: COLORS.white,
  },
  segmentTabInactiveLeft: {
    borderWidth: 1,
    borderColor: COLORS.black,
    borderRightWidth: 0,
  },
  segmentTabInactiveRight: {
    borderWidth: 1,
    borderColor: COLORS.black,
    borderLeftWidth: 0,
  },
  segmentTabText: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.regular,
  },
  segmentTabTextActive: {
    color: COLORS.white,
  },
  segmentTabTextInactive: {
    color: COLORS.black,
  },
  pillRow: {
    flexDirection: "row",
    gap: 12,
  },
  pillTab: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  pillTabActive: {
    backgroundColor: COLORS.primary,
  },
  pillTabInactive: {
    backgroundColor: COLORS.backgroundSecondary,
  },
  pillTabText: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.regular,
  },
  pillTabTextActive: {
    color: COLORS.white,
  },
  pillTabTextInactive: {
    color: COLORS.textSecondary,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.backgroundSecondary,
    paddingHorizontal: 10,
  },
  addButtonText: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.semiBold,
    color: COLORS.textDark,
  },
  loader: {
    marginTop: 40,
  },
  listContent: {
    paddingTop: 0,
  },
  listGap: {
    height: 16,
  },
  cardWrap: {
    position: "relative",
    zIndex: 1,
  },
  contextMenu: {
    position: "absolute",
    top: 44,
    right: 8,
    width: 140,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.divider,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 10,
    overflow: "hidden",
  },
  contextMenuRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  contextMenuIcon: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: COLORS.backgroundSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  contextMenuText: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.medium,
    color: COLORS.black,
  },
  contextMenuDivider: {
    height: 1,
    backgroundColor: COLORS.divider,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
  },
  cardDefault: {
    borderWidth: 1,
    borderColor: COLORS.divider,
    backgroundColor: COLORS.white,
  },
  cardSelected: {
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.backgroundSecondary,
  },
  cardMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  cardIconBox: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: COLORS.backgroundSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  cardIconBoxSelected: {
    backgroundColor: COLORS.white,
  },
  cardBody: {
    flex: 1,
    gap: 12,
  },
  selectedLabel: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.regular,
    color: COLORS.primary,
  },
  cardAddress: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  menuButton: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  formContent: {
    gap: 20,
    paddingTop: 0,
  },
  fieldGroup: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    lineHeight: 17,
  },
  required: {
    color: COLORS.error,
  },
  input: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
  },
  textArea: {
    minHeight: 86,
    paddingTop: 16,
    textAlignVertical: "top",
  },
  formActions: {
    flexDirection: "row",
    gap: 15,
    marginTop: 4,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: COLORS.black,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.white,
  },
  cancelButtonText: {
    fontSize: FONT_SIZES.lg,
    fontFamily: FONTS.regular,
    color: COLORS.black,
    lineHeight: 18,
  },
  submitButton: {
    flex: 1,
    flexDirection: "row",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COLORS.black,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: FONT_SIZES.lg,
    fontFamily: FONTS.regular,
    color: COLORS.white,
    lineHeight: 18,
  },
  pressed: {
    opacity: 0.85,
  },
});
