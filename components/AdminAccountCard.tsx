import { View, Text, StyleSheet } from "react-native";
import { COLORS, SPACING } from "../constants/theme";
import { FONTS } from "../constants/fonts";
import { UserIcon } from "./icons";

function formatMobile(mobile: string) {
  const digits = mobile.replace(/\D/g, "");
  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  }
  if (digits.length === 12 && digits.startsWith("91")) {
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  }
  return mobile;
}

export function AdminAccountCard({
  name,
  mobile,
  companyName,
}: {
  name: string;
  mobile: string;
  companyName: string;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.title}>Admin Account</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.avatar}>
            <UserIcon size={24} color={COLORS.black} />
          </View>
          <View style={styles.info}>
            <Text style={styles.name}>{name}</Text>
            <Text style={styles.phone}>{formatMobile(mobile)}</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText} numberOfLines={1}>
              {companyName}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 8,
  },
  title: {
    fontFamily: FONTS.regular,
    fontSize: 16,
    color: COLORS.black,
  },
  card: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  avatar: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: COLORS.white,
  },
  info: {
    flex: 1,
    gap: 10,
  },
  name: {
    fontFamily: FONTS.semiBold,
    fontSize: 16,
    color: COLORS.black,
  },
  phone: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  badge: {
    backgroundColor: COLORS.white,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    maxWidth: 110,
  },
  badgeText: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: COLORS.primary,
    textAlign: "center",
  },
});
