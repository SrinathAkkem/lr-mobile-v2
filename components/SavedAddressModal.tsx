import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import {
  AddIcon,
  BusinessOutlineIcon,
  IonCloseIcon,
} from "./icons";
import { useAuth } from "../lib/auth";
import { addressBook } from "../lib/addresses";
import type { Address } from "../types";
import { COLORS, FONT_SIZES } from "../constants/theme";
import { FONTS } from "../constants/fonts";

type AddressType = "consigner" | "consignee";

function formatAddressLine(address: Address) {
  if (address.pincode && !address.address.includes(address.pincode)) {
    return `${address.address}, ${address.pincode}`;
  }
  return address.address;
}

type Props = {
  visible: boolean;
  type: AddressType;
  onClose: () => void;
  onSelect: (address: Address) => void;
};

export function SavedAddressModal({ visible, type, onClose, onSelect }: Props) {
  const { user } = useAuth();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [list, selected] = await Promise.all([
        addressBook.list(user.id, type),
        addressBook.getSelected(user.id, type),
      ]);
      setAddresses(list);
      setSelectedId(selected);
    } catch {
      setAddresses([]);
      setSelectedId(null);
    } finally {
      setLoading(false);
    }
  }, [user, type]);

  useEffect(() => {
    if (visible) load();
  }, [visible, load]);

  async function handleSelect(address: Address) {
    if (!user) return;
    await addressBook.setSelected(user.id, type, address.id);
    setSelectedId(address.id);
    onSelect(address);
    onClose();
  }

  const sorted = [...addresses].sort((a, b) => {
    if (a.id === selectedId) return -1;
    if (b.id === selectedId) return 1;
    return 0;
  });

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Saved Address</Text>
            <Pressable onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <IonCloseIcon size={22} color={COLORS.black} />
            </Pressable>
          </View>

          <Pressable
            style={styles.addButton}
            onPress={() => {
              onClose();
              router.push("/(tabs)/address-book");
            }}
          >
            <AddIcon size={18} color={COLORS.black} />
            <Text style={styles.addButtonText}>Add New Address</Text>
          </Pressable>

          {loading ? (
            <ActivityIndicator size="large" color={COLORS.primary} style={styles.loader} />
          ) : sorted.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No saved addresses yet</Text>
              <Text style={styles.emptyBody}>
                Add an address from the address book to reuse it while creating LRs.
              </Text>
            </View>
          ) : (
            <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
              {sorted.map((address, index) => {
                const selected = address.id === selectedId;
                return (
                  <View key={address.id}>
                    <Pressable
                      style={[styles.card, selected && styles.cardSelected]}
                      onPress={() => handleSelect(address)}
                    >
                      <View style={styles.cardIcon}>
                        <BusinessOutlineIcon size={18} color={COLORS.black} />
                      </View>
                      <View style={styles.cardBody}>
                        {selected ? (
                          <Text style={styles.selectedLabel}>Current Selected Address</Text>
                        ) : null}
                        <Text style={styles.addressName}>{address.name}</Text>
                        <Text style={styles.addressText}>{formatAddressLine(address)}</Text>
                      </View>
                    </Pressable>
                    {selected && index < sorted.length - 1 ? (
                      <View style={styles.cardDivider} />
                    ) : null}
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: COLORS.backgroundSecondary,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: "75%",
    paddingBottom: 24,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 12,
  },
  title: {
    fontSize: FONT_SIZES.xl,
    fontFamily: FONTS.semiBold,
    color: COLORS.black,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginHorizontal: 24,
    marginBottom: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E8E8E8",
    backgroundColor: COLORS.white,
  },
  addButtonText: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.medium,
    color: COLORS.black,
  },
  loader: {
    padding: 40,
  },
  emptyState: {
    paddingHorizontal: 24,
    paddingVertical: 32,
    alignItems: "center",
    gap: 8,
  },
  emptyTitle: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.semiBold,
    color: COLORS.black,
    textAlign: "center",
  },
  emptyBody: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
    textAlign: "center",
    lineHeight: 20,
  },
  list: {
    paddingHorizontal: 24,
  },
  card: {
    flexDirection: "row",
    gap: 12,
    padding: 14,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    marginBottom: 10,
  },
  cardSelected: {
    marginBottom: 0,
  },
  cardDivider: {
    height: 1,
    backgroundColor: COLORS.divider,
    marginVertical: 10,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: COLORS.backgroundSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: {
    flex: 1,
    gap: 4,
  },
  selectedLabel: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.medium,
    color: COLORS.primary,
  },
  addressName: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.semiBold,
    color: COLORS.black,
  },
  addressText: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.semiBold,
    color: COLORS.black,
    lineHeight: 20,
  },
});
