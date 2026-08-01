import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { COLORS } from "../constants/theme";
import type { Address } from "../types";
import { api } from "../lib/api";

interface AddressSelectorProps {
  visible: boolean;
  type: "consigner" | "consignee";
  onClose: () => void;
  onSelect: (address: Address) => void;
}

export function AddressSelector({ visible, type, onClose, onSelect }: AddressSelectorProps) {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (visible) {
      loadAddresses();
    }
  }, [visible]);

  async function loadAddresses() {
    setLoading(true);
    try {
      const response = await api.getAddresses();
      if (response.success && response.data) {
        setAddresses(response.data.filter((addr) => addr.type === type));
      }
    } catch (error) {
      console.error("Failed to load addresses:", error);
    } finally {
      setLoading(false);
    }
  }

  const filteredAddresses = addresses.filter(
    (addr) =>
      addr.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      addr.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      addr.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  function handleSelect(address: Address) {
    onSelect(address);
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>
              Select {type === "consigner" ? "Consigner" : "Consignee"}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.close}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search addresses..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={COLORS.textMuted}
            />
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
          ) : filteredAddresses.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>📇</Text>
              <Text style={styles.emptyText}>No addresses found</Text>
              <Text style={styles.emptyHint}>
                Add addresses in the Address Book to quickly fill in LR details
              </Text>
            </View>
          ) : (
            <ScrollView style={styles.list}>
              {filteredAddresses.map((address) => (
                <TouchableOpacity
                  key={address.id}
                  style={styles.addressCard}
                  onPress={() => handleSelect(address)}
                >
                  <View style={styles.cardContent}>
                    <Text style={styles.addressName}>{address.name}</Text>
                    {address.company && (
                      <Text style={styles.addressCompany}>{address.company}</Text>
                    )}
                    <Text style={styles.addressText} numberOfLines={2}>
                      {address.address}
                    </Text>
                    <Text style={styles.addressPhone}>📞 {address.phone}</Text>
                  </View>
                  <Text style={styles.chevron}>›</Text>
                </TouchableOpacity>
              ))}
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
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modal: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "80%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.text,
  },
  close: {
    fontSize: 24,
    color: COLORS.textMuted,
    fontWeight: "300",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.background,
    margin: 16,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.text,
  },
  loadingContainer: {
    padding: 40,
    alignItems: "center",
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center",
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 8,
  },
  emptyHint: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: "center",
  },
  list: {
    flex: 1,
  },
  addressCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  cardContent: {
    flex: 1,
  },
  addressName: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 4,
  },
  addressCompany: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  addressText: {
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 4,
    lineHeight: 20,
  },
  addressPhone: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  chevron: {
    fontSize: 24,
    color: COLORS.textMuted,
  },
});
