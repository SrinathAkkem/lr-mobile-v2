import { Text, StyleSheet, Linking, TouchableOpacity } from "react-native";
import { FONTS } from "../../constants/fonts";

const TERMS_URL = "https://ronolr.com/legal/terms";
const PRIVACY_URL = "https://ronolr.com/legal/privacy";

export function LegalFooter() {
  return (
    <Text style={styles.termsText}>
      By continuing, you agree to our{" "}
      <Text style={styles.termsLink} onPress={() => Linking.openURL(TERMS_URL)}>
        Terms of Use
      </Text>{" "}
      and{" "}
      <Text style={styles.termsLink} onPress={() => Linking.openURL(PRIVACY_URL)}>
        Privacy Policy
      </Text>
      .
    </Text>
  );
}

export function AuthLinkRow({
  prefix,
  linkLabel,
  onPress,
}: {
  prefix: string;
  linkLabel: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={styles.linkRow}>
      <Text style={styles.linkPrefix}>
        {prefix}{" "}
        <Text style={styles.linkLabel}>{linkLabel}</Text>
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  termsText: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: "#999999",
    textAlign: "center",
    lineHeight: 18,
  },
  termsLink: {
    fontFamily: FONTS.semiBold,
    color: "#000000",
  },
  linkRow: {
    alignItems: "center",
    marginTop: 24,
  },
  linkPrefix: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: "#666666",
    textAlign: "center",
  },
  linkLabel: {
    fontFamily: FONTS.semiBold,
    color: "#5B21B6",
  },
});
