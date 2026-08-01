import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { COLORS, FONT_SIZES } from "../../../constants/theme";
import { useAuth } from "../../../lib/auth";
import { api } from "../../../lib/api";
import { Screen } from "../../../components/Screen";
import { useContentBottomPadding } from "../../../hooks/useScreenInsets";
import { useKeyboardAwareScroll } from "../../../hooks/useKeyboardAwareScroll";

export default function ProfileEditScreen() {
  const { user, refreshUser } = useAuth();
  const contentBottom = useContentBottomPadding();
  const { scrollRef, contentPaddingBottom, onInputFocus, onScroll, scrollEventThrottle } =
    useKeyboardAwareScroll({
      footerHeight: 88,
      extraPadding: 24,
    });
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(user?.name || "");
  const [mobile, setMobile] = useState(user?.mobile || "");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  useEffect(() => {
    if (user?.role === "executive") {
      router.replace("/(tabs)/profile" as any);
    }
  }, [user?.role]);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setMobile(user.mobile);
    }
  }, [user]);

  if (user?.role === "executive") {
    return null;
  }

  async function handleSendOtp() {
    if (mobile === user?.mobile) {
      Alert.alert("No Change", "Mobile number is the same as current");
      return;
    }

    if (!/^\d{10}$/.test(mobile)) {
      Alert.alert("Invalid Mobile", "Please enter a valid 10-digit mobile number");
      return;
    }

    setLoading(true);
    const response = await api.sendOtp(mobile, { purpose: "profile_update" });
    setLoading(false);

    if (response.success) {
      setOtpSent(true);
      if (__DEV__ && response.data?.devOtp) {
        Alert.alert("Dev OTP", `Use OTP: ${response.data.devOtp}`);
      } else {
        Alert.alert("OTP Sent", "Verification code sent to your mobile");
      }
    } else {
      Alert.alert("Error", response.error || "Failed to send OTP");
    }
  }

  async function handleSave() {
    if (!name.trim()) {
      Alert.alert("Validation Error", "Name is required");
      return;
    }

    if (mobile !== user?.mobile && !otpSent) {
      Alert.alert("Verification Required", "Please verify your new mobile number");
      return;
    }

    if (mobile !== user?.mobile && otpSent && !otp) {
      Alert.alert("Validation Error", "Please enter OTP to verify mobile number");
      return;
    }

    setLoading(true);
    const updateData: Record<string, string> = { name: name.trim() };

    if (mobile !== user?.mobile) {
      updateData.mobile = mobile;
      updateData.otp = otp;
    }

    const response = await api.updateProfile(updateData);
    setLoading(false);

    if (response.success && response.data) {
      await refreshUser(response.data);
      Alert.alert("Success", "Profile updated successfully", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } else {
      Alert.alert("Error", response.error || "Failed to update profile");
    }
  }

  return (
    <Screen edges={["top"]} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Edit Profile</Text>
        <View style={styles.placeholder} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
      <ScrollView
        ref={scrollRef}
        style={styles.content}
        contentContainerStyle={[styles.contentContainer, { paddingBottom: contentPaddingBottom }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        onScroll={onScroll}
        scrollEventThrottle={scrollEventThrottle}
      >
        <View style={styles.section}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Enter your name"
            placeholderTextColor={COLORS.textMuted}
            onFocus={onInputFocus}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Mobile Number</Text>
          <View style={styles.mobileContainer}>
            <TextInput
              style={[styles.input, styles.mobileInput]}
              value={mobile}
              onChangeText={setMobile}
              placeholder="Enter mobile number"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="phone-pad"
              maxLength={10}
              onFocus={onInputFocus}
            />
            {mobile !== user?.mobile ? (
              <TouchableOpacity
                style={styles.verifyButton}
                onPress={handleSendOtp}
                disabled={loading}
              >
                <Text style={styles.verifyButtonText}>
                  {otpSent ? "Resend OTP" : "Verify"}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {otpSent && mobile !== user?.mobile ? (
          <View style={styles.section}>
            <Text style={styles.label}>Enter OTP</Text>
            <TextInput
              style={styles.input}
              value={otp}
              onChangeText={setOtp}
              placeholder="Enter 6-digit OTP"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="number-pad"
              maxLength={6}
              onFocus={onInputFocus}
            />
          </View>
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: contentBottom }]}>
        <TouchableOpacity
          style={[styles.saveButton, loading && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.saveButtonText}>Save Changes</Text>
          )}
        </TouchableOpacity>
      </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
  },
  backIcon: {
    fontSize: 32,
    fontWeight: "300",
    color: COLORS.text,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.text,
  },
  mobileContainer: {
    flexDirection: "row",
    gap: 8,
  },
  mobileInput: {
    flex: 1,
  },
  verifyButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: "center",
  },
  verifyButtonText: {
    color: COLORS.white,
    fontWeight: "600",
    fontSize: 14,
  },
  footer: {
    padding: 16,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "700",
  },
});
