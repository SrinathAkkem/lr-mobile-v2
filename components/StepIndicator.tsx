import { View, Text, StyleSheet } from "react-native";
import { COLORS } from "../constants/theme";

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  steps: string[];
}

export function StepIndicator({ currentStep, totalSteps, steps }: StepIndicatorProps) {
  return (
    <View style={styles.container}>
      <View style={styles.progressBar}>
        {Array.from({ length: totalSteps }).map((_, index) => (
          <View
            key={index}
            style={[
              styles.progressDot,
              index < currentStep && styles.progressDotCompleted,
              index === currentStep - 1 && styles.progressDotActive,
            ]}
          >
            {index < currentStep - 1 ? (
              <Text style={styles.progressCheck}>✓</Text>
            ) : (
              <Text
                style={[
                  styles.progressNumber,
                  index === currentStep - 1 && styles.progressNumberActive,
                ]}
              >
                {index + 1}
              </Text>
            )}
          </View>
        ))}
      </View>
      <Text style={styles.stepLabel}>
        Step {currentStep} of {totalSteps}: {steps[currentStep - 1]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  progressBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  progressDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.background,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  progressDotCompleted: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  progressDotActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  progressNumber: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.textMuted,
  },
  progressNumberActive: {
    color: COLORS.white,
  },
  progressCheck: {
    fontSize: 18,
    color: COLORS.white,
    fontWeight: "700",
  },
  stepLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
    textAlign: "center",
  },
});
