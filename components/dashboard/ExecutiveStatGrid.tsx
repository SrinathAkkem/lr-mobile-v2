import { View, Text, StyleSheet } from "react-native";
import { COLORS, FONT_SIZES } from "../../constants/theme";
import { FONTS } from "../../constants/fonts";

type ExecutiveStatGridProps = {
  totalLrs: number;
  delivered: number;
  thisMonth: number;
};

export function ExecutiveStatGrid({
  totalLrs,
  delivered,
  thisMonth,
}: ExecutiveStatGridProps) {
  const items = [
    { label: "Total LR", value: totalLrs },
    { label: "Delivered", value: delivered },
    { label: "This Month", value: thisMonth },
  ];

  return (
    <View style={styles.row}>
      {items.map((item) => (
        <View key={item.label} style={styles.card}>
          <Text style={styles.label}>{item.label}</Text>
          <Text style={styles.value}>{item.value}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 16,
  },
  card: {
    flex: 1,
    height: 59,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.07)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    paddingVertical: 8,
    gap: 2,
  },
  label: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.regular,
    color: "rgba(255, 255, 255, 0.70)",
    textAlign: "center",
  },
  value: {
    fontSize: 20,
    fontFamily: FONTS.bold,
    color: COLORS.white,
    textAlign: "center",
  },
});
