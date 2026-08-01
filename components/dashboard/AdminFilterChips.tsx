import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { COLORS, FONT_SIZES } from "../../constants/theme";
import { FONTS } from "../../constants/fonts";
import {
  FILTER_STATUSES,
  getFilterChipStyle,
  type LRStatusKey,
} from "../../lib/dashboard-utils";

type AdminFilterChipsProps = {
  counts: Record<LRStatusKey, number>;
  activeStatuses: string[];
  onToggle: (status: LRStatusKey) => void;
};

export function AdminFilterChips({
  counts,
  activeStatuses,
  onToggle,
}: AdminFilterChipsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.row}
    >
      {FILTER_STATUSES.map((status) => {
        const chipStyle = getFilterChipStyle(status);
        const isActive = activeStatuses.includes(status);
        const count = counts[status];

        return (
          <Pressable
            key={status}
            style={[
              styles.chip,
              { backgroundColor: chipStyle.bg },
              isActive && styles.chipActive,
              isActive && { borderColor: chipStyle.border },
            ]}
            onPress={() => onToggle(status)}
          >
            <Text style={[styles.chipText, { color: chipStyle.text }]}>
              {status.charAt(0).toUpperCase() + status.slice(1)} ({count})
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 0,
  },
  row: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 2,
    paddingRight: 4,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "transparent",
    flexShrink: 0,
  },
  chipActive: {
    borderWidth: 1,
  },
  chipText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.regular,
  },
});
