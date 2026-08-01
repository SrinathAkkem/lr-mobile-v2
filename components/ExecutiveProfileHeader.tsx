import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { COLORS, FONT_SIZES } from "../constants/theme";
import { FONTS } from "../constants/fonts";
import { ExecutiveStatGrid } from "./dashboard/ExecutiveStatGrid";
import { CloseIcon, UserIcon, CheckmarkIcon, CreateOutlineIcon } from "./icons";

type ExecutiveProfileHeaderProps = {
  name: string;
  executiveId: string;
  isEditing: boolean;
  editName: string;
  onEditNameChange: (value: string) => void;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  stats: { totalLr: number; delivered: number; thisMonth: number };
};

export function ExecutiveProfileHeader({
  name,
  executiveId,
  isEditing,
  editName,
  onEditNameChange,
  onEdit,
  onSave,
  onCancel,
  stats,
}: ExecutiveProfileHeaderProps) {
  return (
    <View style={styles.header}>
      <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <LinearGradient id="execProfileGradient" x1="0%" y1="100%" x2="0%" y2="0%">
            <Stop offset="4.79%" stopColor={COLORS.primaryGradientEnd} />
            <Stop offset="65.55%" stopColor={COLORS.primaryGradientEnd} />
            <Stop offset="100%" stopColor={COLORS.primaryGradientStart} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#execProfileGradient)" />
      </Svg>

      <SafeAreaView edges={["top"]}>
        <View style={styles.profileHeaderRow}>
          <View style={styles.profileLeft}>
            <View style={styles.avatar}>
              <UserIcon size={28} color="#FFFFFF" />
            </View>

            <View style={styles.profileInfo}>
              {isEditing ? (
                <TextInput
                  style={styles.nameInput}
                  value={editName}
                  onChangeText={onEditNameChange}
                  placeholder="Name"
                  placeholderTextColor="rgba(255,255,255,0.6)"
                  selectionColor="#FFFFFF"
                />
              ) : (
                <Text style={styles.name}>{name}</Text>
              )}
              <Text style={styles.subtitle}>Executive · ID: {executiveId}</Text>
            </View>
          </View>

          {isEditing ? (
            <View style={styles.editActions}>
              <Pressable
                style={({ pressed }) => [
                  styles.iconActionButton,
                  pressed && styles.pressed,
                ]}
                onPress={onSave}
              >
                <CheckmarkIcon size={15} color="#FFFFFF" />
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.cancelButton,
                  pressed && styles.pressed,
                ]}
                onPress={onCancel}
              >
                <CloseIcon size={14} color="#FFFFFF" />
              </Pressable>
            </View>
          ) : (
            <Pressable
              style={({ pressed }) => [
                styles.editButton,
                pressed && styles.pressed,
              ]}
              onPress={onEdit}
            >
              <CreateOutlineIcon size={15} color="#FFFFFF" />
              <Text style={styles.editButtonText}>Edit</Text>
            </Pressable>
          )}
        </View>

        <ExecutiveStatGrid
          totalLrs={stats.totalLr}
          delivered={stats.delivered}
          thisMonth={stats.thisMonth}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    overflow: "hidden",
    zIndex: 2,
  },
  profileHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 24,
    marginBottom: 20,
    paddingTop: 8,
  },
  profileLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  avatar: {
    padding: 17,
    borderRadius: 83,
    backgroundColor: COLORS.headerAvatarBg,
    alignItems: "center",
    justifyContent: "center",
  },
  profileInfo: {
    flex: 1,
    gap: 8,
  },
  name: {
    fontSize: FONT_SIZES.xl,
    fontFamily: FONTS.semiBold,
    color: COLORS.white,
  },
  nameInput: {
    fontSize: FONT_SIZES.xl,
    fontFamily: FONTS.semiBold,
    color: COLORS.white,
    padding: 0,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.white,
  },
  subtitle: {
    fontSize: FONT_SIZES.lg,
    fontFamily: FONTS.regular,
    color: COLORS.white,
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 8,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.07)",
  },
  editButtonText: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.regular,
    color: COLORS.white,
  },
  editActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconActionButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.07)",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.85,
  },
});
