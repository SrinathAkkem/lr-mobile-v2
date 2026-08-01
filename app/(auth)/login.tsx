import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Redirect } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useAuth, getLastFirstName } from "../../lib/auth";
import { RonoLogo } from "../../components/RonoLogo";
import { FONTS } from "../../constants/fonts";

export default function LoginScreenV2() {
  const { sendOtp, login, user } = useAuth();
  const [mobile, setMobile] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [firstName, setFirstName] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const otpInputRef = useRef<TextInput | null>(null);
  const verifyInFlightRef = useRef(false);

  useEffect(() => {
    getLastFirstName().then(setFirstName);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (user) {
      void SplashScreen.hideAsync();
    }
  }, [user]);

  if (user) {
    return <Redirect href="/(tabs)" />;
  }

  function startResendTimer() {
    setResendTimer(30);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  async function handleSendOtp() {
    if (mobile.length !== 10) {
      Alert.alert("Invalid number", "Enter a valid 10-digit mobile number");
      return;
    }
    setSendingOtp(true);
    const res = await sendOtp(mobile);
    setSendingOtp(false);
    if (res.ok) {
      setOtpSent(true);
      startResendTimer();
      setTimeout(() => otpInputRef.current?.focus(), 100);

      if (res.devOtp) {
        Alert.alert(
          "Dev OTP",
          `SMS not configured — use OTP: ${res.devOtp}`,
          [{ text: "OK" }]
        );
      }
    } else {
      Alert.alert("Couldn't send OTP", res.error ?? "Try again in a moment.");
    }
  }

  function handleOtpChange(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 6);
    setOtp(digits);

    if (digits.length === 6 && !verifyInFlightRef.current) {
      void handleVerify(digits);
    }
  }

  async function handleVerify(otpValue?: string) {
    const otpCode = otpValue || otp;
    if (otpCode.length !== 6 || verifyInFlightRef.current) return;

    verifyInFlightRef.current = true;
    setVerifying(true);
    const res = await login(mobile, otpCode);
    setVerifying(false);
    verifyInFlightRef.current = false;

    if (!res.ok) {
      Alert.alert("Invalid OTP", res.error ?? "Please re-enter the code.");
      setOtp("");
      otpInputRef.current?.focus();
      return;
    }
  }

  async function handleResend() {
    if (resendTimer > 0 || sendingOtp) return;
    setSendingOtp(true);
    const res = await sendOtp(mobile);
    setSendingOtp(false);
    if (res.ok) {
      startResendTimer();

      if (res.devOtp) {
        Alert.alert(
          "Dev OTP",
          `SMS not configured — use OTP: ${res.devOtp}`,
          [{ text: "OK" }]
        );
      }
    } else {
      Alert.alert("Couldn't resend", res.error ?? "Try again.");
    }
  }

  const welcomeTitle = firstName
    ? `Welcome Back, ${firstName}!`
    : "Welcome Back!";

  const busy = sendingOtp || verifying;

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          <View style={styles.logoSection}>
            <RonoLogo height={30} />

            <View style={styles.titleSection}>
              <Text style={styles.title}>{welcomeTitle}</Text>
              <Text style={styles.subtitle}>
                Please write your mobile number to receive your one time
                password
              </Text>
            </View>
          </View>

          <View style={styles.formSection}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Mobile Number</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  value={mobile}
                  onChangeText={(t) =>
                    setMobile(t.replace(/\D/g, "").slice(0, 10))
                  }
                  keyboardType="phone-pad"
                  placeholder="Enter Mobile Number"
                  placeholderTextColor="#999999"
                  maxLength={10}
                  editable={!otpSent && !busy}
                />
                <TouchableOpacity
                  onPress={handleSendOtp}
                  disabled={busy || otpSent}
                >
                  {sendingOtp ? (
                    <ActivityIndicator color="#5B21B6" size="small" />
                  ) : (
                    <Text
                      style={[styles.sendOtpText, otpSent && styles.sendOtpDisabled]}
                    >
                      Send Otp
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>OTP</Text>
              <View style={styles.otpRow}>
                <TextInput
                  ref={otpInputRef}
                  style={styles.otpInput}
                  value={otp}
                  onChangeText={handleOtpChange}
                  keyboardType="number-pad"
                  maxLength={6}
                  placeholder="_ _ _ _ _ _"
                  placeholderTextColor="#999999"
                  editable={!verifying}
                />

                <TouchableOpacity
                  style={styles.verifyButton}
                  onPress={() => handleVerify()}
                  disabled={verifying || otp.length !== 6}
                  activeOpacity={0.8}
                >
                  {verifying ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.verifyButtonText}>Verify</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.resendContainer}>
              <Text style={styles.resendText}>Didn't Receive OTP?</Text>
              {resendTimer > 0 ? (
                <Text style={styles.resendTimer}>
                  Resend in {resendTimer}s
                </Text>
              ) : (
                <TouchableOpacity onPress={handleResend} disabled={busy}>
                  <Text style={styles.resendLink}>Resend OTP</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={styles.termsContainer}>
            <Text style={styles.termsText}>
              By continuing, you agree to our{" "}
              <Text style={styles.termsLink}>Terms of Use</Text> and{" "}
              <Text style={styles.termsLink}>Privacy Policy</Text>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  logoSection: {
    paddingHorizontal: 32,
    paddingTop: 32,
    alignItems: "center",
    gap: 40,
  },
  titleSection: {
    alignItems: "center",
    gap: 12,
    width: "100%",
  },
  title: {
    fontFamily: FONTS.semiBold,
    fontSize: 28,
    color: "#000000",
    textAlign: "center",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: "#666666",
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  formSection: {
    paddingHorizontal: 32,
    marginTop: 40,
    gap: 24,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: "#666666",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F2F2F2",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  input: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: 16,
    color: "#000000",
  },
  sendOtpText: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: "#5B21B6",
  },
  sendOtpDisabled: {
    opacity: 0.4,
  },
  otpRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  otpInput: {
    flex: 1,
    backgroundColor: "#F2F2F2",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontFamily: FONTS.regular,
    fontSize: 16,
    color: "#000000",
    letterSpacing: 6,
  },
  verifyButton: {
    backgroundColor: "#000000",
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 16,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 96,
    minHeight: 52,
  },
  verifyButtonText: {
    fontFamily: FONTS.semiBold,
    color: "#FFFFFF",
    fontSize: 16,
  },
  resendContainer: {
    alignItems: "center",
    marginTop: 8,
    gap: 8,
  },
  resendText: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: "#666666",
  },
  resendTimer: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: "#999999",
  },
  resendLink: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: "#5B21B6",
    textDecorationLine: "underline",
  },
  termsContainer: {
    paddingHorizontal: 32,
    marginTop: "auto",
    paddingTop: 48,
  },
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
});
