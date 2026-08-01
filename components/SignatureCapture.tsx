import { View, Text, StyleSheet, TouchableOpacity, Modal } from "react-native";
import { useRef, useState } from "react";
import { IonCloseIcon } from "./icons";
import SignatureCanvas from "react-native-signature-canvas";
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from "../constants/theme";
import { FONTS } from "../constants/fonts";

type Props = {
  visible: boolean;
  onClose: () => void;
  onSave: (signature: string) => void;
  userName?: string;
};

export function SignatureCapture({ visible, onClose, onSave, userName = "User" }: Props) {
  const signatureRef = useRef<any>(null);
  const [hasStroke, setHasStroke] = useState(false);

  function handleClear() {
    signatureRef.current?.clearSignature();
    setHasStroke(false);
  }

  function handleConfirm() {
    signatureRef.current?.readSignature();
  }

  function handleSave(signature: string) {
    onSave(signature);
    onClose();
    setHasStroke(false);
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Executive Signature</Text>
            <Text style={styles.subtitle}>Step 4 of 4</Text>
          </View>
          <TouchableOpacity onPress={onClose}>
            <IonCloseIcon size={24} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        <Text style={styles.instructionTitle}>
          Sign below with <Text style={styles.instructionBold}>your</Text> finger
        </Text>
        <Text style={styles.instructionBody}>
          Your signature will appear on the LR PDF. Use your finger to sign clearly in the
          white box below.
        </Text>

        <View style={styles.padWrap}>
          <SignatureCanvas
            ref={signatureRef}
            onOK={handleSave}
            onBegin={() => setHasStroke(true)}
            onEnd={() => setHasStroke(true)}
            descriptionText=""
            clearText=""
            confirmText=""
            trimWhitespace
            webStyle={`
              .m-signature-pad {
                box-shadow: none;
                border: 2px dashed #D1D5DB;
                border-radius: 12px;
                margin: 0;
              }
              .m-signature-pad--body { border: none; }
              .m-signature-pad--footer { display: none; }
              body, html { margin: 0; padding: 0; }
            `}
          />
          <Text style={styles.padHint}>
            {hasStroke
              ? `Sign by ${userName} / Saved Signature will be printed on LR document`
              : `Sign by ${userName}`}
          </Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.clearButton} onPress={handleClear}>
            <IonCloseIcon size={16} color="#6B7280" />
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.confirmButton, hasStroke && styles.confirmButtonActive]}
            onPress={handleConfirm}
            disabled={!hasStroke}
          >
            <Text
              style={[
                styles.confirmButtonText,
                hasStroke && styles.confirmButtonTextActive,
              ]}
            >
              Confirm Signature
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  title: {
    fontSize: FONT_SIZES.xl,
    fontFamily: FONTS.bold,
    color: COLORS.text,
  },
  subtitle: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  instructionTitle: {
    fontSize: FONT_SIZES.lg,
    fontFamily: FONTS.regular,
    color: COLORS.text,
    marginBottom: 8,
    textAlign: "center",
  },
  instructionBold: {
    fontFamily: FONTS.bold,
  },
  instructionBody: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
    lineHeight: 20,
    marginBottom: 16,
    textAlign: "center",
  },
  padWrap: {
    flex: 1,
    borderRadius: BORDER_RADIUS.lg,
    overflow: "hidden",
    backgroundColor: "#FAFAFA",
    marginBottom: 16,
  },
  padHint: {
    position: "absolute",
    bottom: 12,
    right: 12,
    fontSize: 11,
    color: "#9CA3AF",
    textAlign: "right",
    maxWidth: "70%",
    lineHeight: 16,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
  },
  clearButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: COLORS.white,
  },
  clearButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: "600",
    color: "#6B7280",
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    backgroundColor: COLORS.white,
  },
  confirmButtonActive: {
    backgroundColor: "#000000",
    borderColor: "#000000",
  },
  confirmButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: "600",
    color: "#9CA3AF",
  },
  confirmButtonTextActive: {
    color: COLORS.white,
  },
});
