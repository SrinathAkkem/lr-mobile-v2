import { View, Text, StyleSheet } from "react-native";
import { COLORS, FONT_SIZES } from "../constants/theme";
import { FONTS } from "../constants/fonts";

type Props = {
  currentStep: number;
  totalSteps?: number;
};

export function CreateLRStepIndicator({ currentStep, totalSteps = 4 }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.stepLabel}>
        Step {currentStep} of {totalSteps}
      </Text>
      <View style={styles.barRow}>
        {Array.from({ length: totalSteps }).map((_, index) => {
          const step = index + 1;
          const active = step <= currentStep;
          return (
            <View
              key={step}
              style={[styles.bar, active ? styles.barActive : styles.barInactive]}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    backgroundColor: COLORS.white,
  },
  stepLabel: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.semiBold,
    color: COLORS.primary,
    marginBottom: 10,
  },
  barRow: {
    flexDirection: "row",
    gap: 8,
  },
  bar: {
    flex: 1,
    borderRadius: 4,
  },
  barActive: {
    height: 4,
    backgroundColor: COLORS.black,
  },
  barInactive: {
    height: 2,
    backgroundColor: "#E5E7EB",
    marginTop: 1,
  },
});
