import { StyleSheet } from "react-native";
import { FONTS } from "../../constants/fonts";

export const AUTH_COLORS = {
  purple: "#5B21B6",
  black: "#000000",
  grayText: "#666666",
  grayMuted: "#999999",
  inputBg: "#F2F2F2",
  white: "#FFFFFF",
};

export const authStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AUTH_COLORS.white,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  content: {
    paddingHorizontal: 32,
  },
  titleSection: {
    alignItems: "center",
    gap: 12,
    marginTop: 24,
    marginBottom: 32,
  },
  title: {
    fontFamily: FONTS.semiBold,
    fontSize: 28,
    color: AUTH_COLORS.black,
    textAlign: "center",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: AUTH_COLORS.grayText,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  formSection: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: AUTH_COLORS.grayText,
  },
  input: {
    backgroundColor: AUTH_COLORS.inputBg,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontFamily: FONTS.regular,
    fontSize: 16,
    color: AUTH_COLORS.black,
  },
  inputMultiline: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  primaryButton: {
    backgroundColor: AUTH_COLORS.black,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    minHeight: 52,
  },
  primaryButtonText: {
    fontFamily: FONTS.semiBold,
    fontSize: 16,
    color: AUTH_COLORS.white,
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  otpInputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: AUTH_COLORS.inputBg,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  otpInput: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: 16,
    color: AUTH_COLORS.black,
    letterSpacing: 4,
  },
  resendOtpText: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: AUTH_COLORS.purple,
  },
  resendOtpDisabled: {
    opacity: 0.4,
  },
  legalFooter: {
    paddingHorizontal: 32,
    marginTop: "auto",
    paddingTop: 32,
  },
});
