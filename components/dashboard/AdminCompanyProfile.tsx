import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { ImageOutlineIcon, SaveOutlineIcon } from "../icons";
import { COLORS, SPACING } from "../../constants/theme";
import { FONTS } from "../../constants/fonts";
import { useAuth } from "../../lib/auth";
import { api, absUrl } from "../../lib/api";
import { ProfileHeader } from "../ProfileHeader";
import { AdminAccountCard } from "../AdminAccountCard";
import { useContentBottomPadding } from "../../hooks/useScreenInsets";
import { useKeyboardAwareScroll } from "../../hooks/useKeyboardAwareScroll";

export function AdminCompanyProfile() {
  const { user, refreshUser } = useAuth();
  const contentBottom = useContentBottomPadding();
  const { scrollRef, contentPaddingBottom, onInputFocus, onScroll, scrollEventThrottle } =
    useKeyboardAwareScroll({
      footerHeight: 120,
      extraPadding: 32,
    });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [stampUrl, setStampUrl] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<string | null>(null);
  const [stampFile, setStampFile] = useState<string | null>(null);

  useEffect(() => {
    loadCompanyData();
  }, [user?.companyId]);

  async function loadCompanyData() {
    if (!user?.companyId) return;

    setLoading(true);
    const response = await api.getCompanyProfile();
    if (response.success && response.data) {
      const company = response.data;
      setCompanyName(company.name || "");
      setCompanyAddress(company.address || "");
      setGstNumber(company.gstNumber || "");
      setLogoUrl(company.logoUrl || null);
      setStampUrl(company.stampUrl || null);
    } else if (response.error) {
      Alert.alert("Error", response.error);
    }
    setLoading(false);
  }

  async function handlePickImage(type: "logo" | "stamp") {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert("Permission Required", "Please allow access to your photo library");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images" as any,
      allowsEditing: true,
      aspect: type === "logo" ? [1, 1] : [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      if (type === "logo") {
        setLogoFile(result.assets[0].uri);
      } else {
        setStampFile(result.assets[0].uri);
      }
    }
  }

  async function handleSave() {
    if (!companyName.trim()) {
      Alert.alert("Validation Error", "Company name is required");
      return;
    }

    if (!gstNumber.trim()) {
      Alert.alert("Validation Error", "GST number is required");
      return;
    }

    if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gstNumber)) {
      Alert.alert("Validation Error", "Please enter a valid GST number");
      return;
    }

    setSaving(true);
    try {
      let newLogoUrl = logoUrl;
      let newStampUrl = stampUrl;

      if (logoFile) {
        const uploadResponse = await api.uploadLogo(logoFile);
        if (uploadResponse.success && uploadResponse.data) {
          newLogoUrl = uploadResponse.data.url;
        } else {
          Alert.alert("Error", uploadResponse.error || "Failed to upload logo");
          setSaving(false);
          return;
        }
      }

      if (stampFile) {
        const uploadResponse = await api.uploadStamp(stampFile);
        if (uploadResponse.success && uploadResponse.data) {
          newStampUrl = uploadResponse.data.url;
        } else {
          Alert.alert("Error", uploadResponse.error || "Failed to upload stamp");
          setSaving(false);
          return;
        }
      }

      const updateData: Record<string, string> = {
        name: companyName.trim(),
        address: companyAddress.trim(),
        gstNumber: gstNumber.trim(),
      };

      if (newLogoUrl) updateData.logoUrl = newLogoUrl;
      if (newStampUrl) updateData.stampUrl = newStampUrl;

      const response = await api.updateCompanyProfile(updateData);

      if (response.success) {
        if (user?.company) {
          await refreshUser({
            company: {
              ...user.company,
              name: companyName.trim(),
            },
          });
        }
        Alert.alert("Success", "Company profile updated successfully", [
          { text: "OK", onPress: () => router.back() },
        ]);
      } else {
        Alert.alert("Error", response.error || "Failed to update company profile");
      }
    } catch {
      Alert.alert("Error", "Failed to update company profile");
    } finally {
      setSaving(false);
    }
  }

  const subtitle = `${user?.company?.name || "Rono"} · ${user?.branch?.name || "ABC"}`;
  const logoPreview = logoFile || (logoUrl ? absUrl(logoUrl) : null);
  const stampPreview = stampFile || (stampUrl ? absUrl(stampUrl) : null);

  if (loading && !companyName) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <ProfileHeader
        name={user?.name || "User"}
        subtitle={subtitle}
        showBack
        onBack={() => router.back()}
        showEdit
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
      <ScrollView
        ref={scrollRef}
        style={styles.sheet}
        contentContainerStyle={[
          styles.sheetContent,
          { paddingBottom: contentPaddingBottom },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        onScroll={onScroll}
        scrollEventThrottle={scrollEventThrottle}
      >
        <View style={styles.formGroup}>
          <Text style={styles.label}>Company Name</Text>
          <TextInput
            style={styles.input}
            value={companyName}
            onChangeText={setCompanyName}
            placeholder="Sr Transport"
            placeholderTextColor={COLORS.textSecondary}
            onFocus={onInputFocus}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Company Address</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={companyAddress}
            onChangeText={setCompanyAddress}
            placeholder="Plot 8B, Industries Park, Hyderabad - 500032, Telangana"
            placeholderTextColor={COLORS.textSecondary}
            multiline
            numberOfLines={3}
            onFocus={onInputFocus}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>GST Number</Text>
          <TextInput
            style={styles.input}
            value={gstNumber}
            onChangeText={setGstNumber}
            placeholder="36AABCA1234M1ZX"
            placeholderTextColor={COLORS.textSecondary}
            autoCapitalize="characters"
            maxLength={15}
            onFocus={onInputFocus}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Company Logo</Text>
          <Pressable
            style={styles.uploadContainer}
            onPress={() => handlePickImage("logo")}
          >
            {logoPreview ? (
              <Image source={{ uri: logoPreview }} style={styles.uploadedImage} />
            ) : (
              <View style={styles.uploadPlaceholder}>
                <ImageOutlineIcon size={24} color={COLORS.primary} />
                <Text style={styles.uploadText}>Tap to Upload PNG/JPG</Text>
                <Text style={styles.uploadHint}>Recommended: 200x200 px</Text>
              </View>
            )}
          </Pressable>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Company Stamp</Text>
          <Pressable
            style={styles.uploadContainer}
            onPress={() => handlePickImage("stamp")}
          >
            {stampPreview ? (
              <Image source={{ uri: stampPreview }} style={styles.uploadedImage} />
            ) : (
              <View style={styles.uploadPlaceholder}>
                <ImageOutlineIcon size={24} color={COLORS.primary} />
                <Text style={styles.uploadText}>Tap to Upload Stamp Image</Text>
                <Text style={styles.uploadHint}>Used on Every LR PDF</Text>
              </View>
            )}
          </Pressable>
        </View>

        <AdminAccountCard
          name={user?.name || "User"}
          mobile={user?.mobile || ""}
          companyName={companyName || user?.company?.name || "SR Transport"}
        />
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: contentBottom }]}>
        <Pressable
          onPress={handleSave}
          disabled={saving}
          style={({ pressed }) => [
            styles.saveButton,
            saving && styles.saveButtonDisabled,
            pressed && !saving && styles.pressed,
          ]}
        >
          {saving ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <>
              <SaveOutlineIcon size={18} color={COLORS.white} />
              <Text style={styles.saveButtonText}>Save Company Profile</Text>
            </>
          )}
        </Pressable>

        <Pressable
          onPress={() => router.back()}
          disabled={saving}
          style={({ pressed }) => [styles.cancelButton, pressed && styles.pressed]}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </Pressable>
      </View>
      </KeyboardAvoidingView>
    </View>
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
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  sheet: {
    flex: 1,
    marginTop: -20,
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  sheetContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    gap: 16,
  },
  formGroup: {
    gap: 8,
  },
  label: {
    fontFamily: FONTS.regular,
    fontSize: 16,
    color: COLORS.black,
  },
  input: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontFamily: FONTS.regular,
    fontSize: 16,
    color: COLORS.textSecondary,
    minHeight: 54,
  },
  textArea: {
    minHeight: 88,
    textAlignVertical: "top",
  },
  uploadContainer: {
    backgroundColor: COLORS.backgroundSecondary,
    borderWidth: 1,
    borderColor: COLORS.primaryDark,
    borderStyle: "dashed",
    borderRadius: 16,
    minHeight: 112,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  uploadPlaceholder: {
    alignItems: "center",
    gap: 4,
    padding: SPACING.lg,
  },
  uploadText: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.black,
  },
  uploadHint: {
    fontFamily: FONTS.regular,
    fontSize: 10,
    color: COLORS.textSecondary,
  },
  uploadedImage: {
    width: "100%",
    height: 112,
    resizeMode: "contain",
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    backgroundColor: COLORS.background,
    gap: 8,
  },
  saveButton: {
    backgroundColor: COLORS.buttonPrimary,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 25,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
    minHeight: 50,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontFamily: FONTS.regular,
    fontSize: 16,
    color: COLORS.white,
    lineHeight: 18,
  },
  cancelButton: {
    paddingVertical: 16,
    alignItems: "center",
    minHeight: 50,
    justifyContent: "center",
  },
  cancelButtonText: {
    fontFamily: FONTS.regular,
    fontSize: 16,
    color: COLORS.black,
    lineHeight: 18,
  },
  pressed: {
    opacity: 0.85,
  },
});
