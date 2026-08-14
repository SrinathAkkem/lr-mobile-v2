import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Redirect, router, type Href } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useAuth } from "../../lib/auth";
import { api, clearToken } from "../../lib/api";
import { AuthHeader } from "../../components/auth/AuthHeader";
import { AuthLinkRow, LegalFooter } from "../../components/auth/LegalFooter";
import { authStyles, AUTH_COLORS } from "../../components/auth/authStyles";

type Step = 1 | 2 | 3;

interface FormState {
  name: string;
  lrCode: string;
  gstNumber: string;
  ibaNumber: string;
  contactPhone: string;
  email: string;
  address: string;
}

const EMPTY_FORM: FormState = {
  name: "",
  lrCode: "",
  gstNumber: "",
  ibaNumber: "",
  contactPhone: "",
  email: "",
  address: "",
};

function validateStep1(form: FormState): string | null {
  if (!form.name.trim()) return "Company name is required";
  if (!form.lrCode.trim()) {
    return "Company code is required";
  }
  if (!form.gstNumber.trim()) return "GST number is required";
  return null;
}

function validateStep2(form: FormState): string | null {
  if (!/^\d{10}$/.test(form.contactPhone)) {
    return "Enter a valid 10-digit contact number";
  }
  if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) {
    return "Enter a valid email address";
  }
  if (!form.address.trim()) return "Address is required";
  return null;
}

export default function RegisterScreen() {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [mobileOtp, setMobileOtp] = useState("");
  const [sendingMobileOtp, setSendingMobileOtp] = useState(false);
  const [creating, setCreating] = useState(false);
  const [mobileResendTimer, setMobileResendTimer] = useState(0);
  const otpsSentRef = useRef(false);
  const mobileTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (mobileTimerRef.current) clearInterval(mobileTimerRef.current);
    };
  }, []);

  const startTimer = useCallback(() => {
    setMobileResendTimer(30);
    if (mobileTimerRef.current) clearInterval(mobileTimerRef.current);
    mobileTimerRef.current = setInterval(() => {
      setMobileResendTimer((prev) => {
        if (prev <= 1) {
          if (mobileTimerRef.current) clearInterval(mobileTimerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const sendMobileOtp = useCallback(async () => {
    if (sendingMobileOtp || mobileResendTimer > 0) return;
    setSendingMobileOtp(true);
    const res = await api.sendOtp(form.contactPhone, { purpose: "register" });
    setSendingMobileOtp(false);
    if (res.success) {
      startTimer();
      if (res.data?.devOtp) {
        Alert.alert("Dev OTP", `Mobile OTP: ${res.data.devOtp}`);
      }
    } else {
      Alert.alert("Couldn't send OTP", res.error ?? "Try again.");
    }
  }, [form.contactPhone, mobileResendTimer, sendingMobileOtp, startTimer]);

  useEffect(() => {
    if (step !== 3 || otpsSentRef.current) return;
    otpsSentRef.current = true;
    void sendMobileOtp();
  }, [step, sendMobileOtp]);

  if (user) {
    return <Redirect href="/(tabs)" />;
  }

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleBack() {
    if (step === 1) {
      router.replace("/(auth)/login" as Href);
      return;
    }
    if (step === 3) {
      otpsSentRef.current = false;
      setMobileOtp("");
    }
    setStep((prev) => (prev === 1 ? 1 : ((prev - 1) as Step)));
  }

  function goToStep2() {
    const err = validateStep1(form);
    if (err) {
      Alert.alert("Check your details", err);
      return;
    }
    setStep(2);
  }

  function goToStep3() {
    const err = validateStep2(form);
    if (err) {
      Alert.alert("Check your details", err);
      return;
    }
    otpsSentRef.current = false;
    setStep(3);
  }

  async function handleCreateAccount() {
    if (mobileOtp.length !== 6) {
      Alert.alert("Verification required", "Enter the 6-digit OTP sent to your mobile.");
      return;
    }

    setCreating(true);
    const res = await api.registerCompany({
      name: form.name.trim(),
      lrCode: form.lrCode.trim(),
      gstNumber: form.gstNumber.trim(),
      ibaNumber: form.ibaNumber.trim() || undefined,
      contactPhone: form.contactPhone,
      email: form.email.trim(),
      address: form.address.trim(),
      mobileOtp,
    });
    setCreating(false);

    if (!res.success) {
      Alert.alert("Couldn't create account", res.error ?? "Please try again.");
      return;
    }

    await clearToken();
    Alert.alert(
      "Account created",
      "Your company is registered and pending approval. Please log in to continue.",
      [
        {
          text: "Log in",
          onPress: () => {
            router.replace({
              pathname: "/(auth)/login",
              params: { mobile: form.contactPhone },
            } as Href);
          },
        },
      ],
    );
  }

  const title =
    step === 3 ? "Verify Details" : "Please Enter Your Details";
  const subtitle =
    step === 3
      ? "We have sent an otp on your mobile no."
      : "Complete your registration to get started.";

  const busy = sendingMobileOtp || creating;

  return (
    <SafeAreaView style={authStyles.container} edges={["top", "bottom"]}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={authStyles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <AuthHeader showBack onBack={handleBack} />
        <ScrollView
          contentContainerStyle={authStyles.scroll}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          <View style={authStyles.content}>
            <View style={authStyles.titleSection}>
              <Text style={authStyles.title}>{title}</Text>
              <Text style={authStyles.subtitle}>{subtitle}</Text>
            </View>

            {step === 1 && (
              <View style={authStyles.formSection}>
                <View style={authStyles.inputGroup}>
                  <Text style={authStyles.label}>Company Name</Text>
                  <TextInput
                    style={authStyles.input}
                    value={form.name}
                    onChangeText={(t) => update("name", t)}
                    placeholder="Ester Logistics pvt. ltd."
                    placeholderTextColor={AUTH_COLORS.grayMuted}
                    autoCapitalize="words"
                  />
                </View>

                <View style={authStyles.inputGroup}>
                  <Text style={authStyles.label}>Company Code</Text>
                  <TextInput
                    style={authStyles.input}
                    value={form.lrCode}
                    onChangeText={(t) =>
                      update(
                        "lrCode",
                        t.toUpperCase(),
                      )
                    }
                    placeholder="ABC"
                    placeholderTextColor={AUTH_COLORS.grayMuted}
                    autoCapitalize="characters"
                    maxLength={8}
                  />
                </View>

                <View style={authStyles.inputGroup}>
                  <Text style={authStyles.label}>GST Number</Text>
                  <TextInput
                    style={authStyles.input}
                    value={form.gstNumber}
                    onChangeText={(t) => update("gstNumber", t.toUpperCase())}
                    placeholder="123-12345-123456"
                    placeholderTextColor={AUTH_COLORS.grayMuted}
                    autoCapitalize="characters"
                  />
                </View>

                <View style={authStyles.inputGroup}>
                  <Text style={authStyles.label}>IBA number</Text>
                  <TextInput
                    style={authStyles.input}
                    value={form.ibaNumber}
                    onChangeText={(t) => update("ibaNumber", t)}
                    placeholder="123-12345-123456"
                    placeholderTextColor={AUTH_COLORS.grayMuted}
                  />
                </View>

                <TouchableOpacity
                  style={authStyles.primaryButton}
                  onPress={goToStep2}
                  activeOpacity={0.8}
                >
                  <Text style={authStyles.primaryButtonText}>Save & Proceed</Text>
                </TouchableOpacity>

                <AuthLinkRow
                  prefix="Already have an account?"
                  linkLabel="Login"
                  onPress={() => router.replace("/(auth)/login" as Href)}
                />
              </View>
            )}

            {step === 2 && (
              <View style={authStyles.formSection}>
                <View style={authStyles.inputGroup}>
                  <Text style={authStyles.label}>Contact Number</Text>
                  <TextInput
                    style={authStyles.input}
                    value={form.contactPhone}
                    onChangeText={(t) =>
                      update("contactPhone", t.replace(/\D/g, "").slice(0, 10))
                    }
                    placeholder="+91 12345 12345"
                    placeholderTextColor={AUTH_COLORS.grayMuted}
                    keyboardType="phone-pad"
                    maxLength={10}
                  />
                </View>

                <View style={authStyles.inputGroup}>
                  <Text style={authStyles.label}>EMail</Text>
                  <TextInput
                    style={authStyles.input}
                    value={form.email}
                    onChangeText={(t) => update("email", t)}
                    placeholder="ak@gmail.com"
                    placeholderTextColor={AUTH_COLORS.grayMuted}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                <View style={authStyles.inputGroup}>
                  <Text style={authStyles.label}>Address</Text>
                  <TextInput
                    style={[authStyles.input, authStyles.inputMultiline]}
                    value={form.address}
                    onChangeText={(t) => update("address", t)}
                    placeholder="nutan shakti society, near vandan wadi, ahmedabad. - 39001"
                    placeholderTextColor={AUTH_COLORS.grayMuted}
                    multiline
                    numberOfLines={4}
                  />
                </View>

                <TouchableOpacity
                  style={authStyles.primaryButton}
                  onPress={goToStep3}
                  activeOpacity={0.8}
                >
                  <Text style={authStyles.primaryButtonText}>Save & Proceed</Text>
                </TouchableOpacity>
              </View>
            )}

            {step === 3 && (
              <View style={authStyles.formSection}>
                <View style={authStyles.inputGroup}>
                  <Text style={authStyles.label}>Verify Mobile No.</Text>
                  <View style={authStyles.otpInputRow}>
                    <TextInput
                      style={authStyles.otpInput}
                      value={mobileOtp}
                      onChangeText={(t) =>
                        setMobileOtp(t.replace(/\D/g, "").slice(0, 6))
                      }
                      placeholder="********"
                      placeholderTextColor={AUTH_COLORS.grayMuted}
                      keyboardType="number-pad"
                      maxLength={6}
                      secureTextEntry
                      editable={!busy}
                    />
                    {mobileResendTimer > 0 ? (
                      <Text style={[authStyles.resendOtpText, authStyles.resendOtpDisabled]}>
                        {mobileResendTimer}s
                      </Text>
                    ) : (
                      <TouchableOpacity
                        onPress={() => void sendMobileOtp()}
                        disabled={busy}
                      >
                        {sendingMobileOtp ? (
                          <ActivityIndicator color={AUTH_COLORS.purple} size="small" />
                        ) : (
                          <Text style={authStyles.resendOtpText}>Resend Otp</Text>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                <TouchableOpacity
                  style={[
                    authStyles.primaryButton,
                    (creating || mobileOtp.length !== 6) &&
                      authStyles.primaryButtonDisabled,
                  ]}
                  onPress={() => void handleCreateAccount()}
                  disabled={creating || mobileOtp.length !== 6}
                  activeOpacity={0.8}
                >
                  {creating ? (
                    <ActivityIndicator color={AUTH_COLORS.white} size="small" />
                  ) : (
                    <Text style={authStyles.primaryButtonText}>Create Account</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={authStyles.legalFooter}>
            <LegalFooter />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
