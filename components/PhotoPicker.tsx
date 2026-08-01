import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, ScrollView } from "react-native";
import { useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from "../constants/theme";

interface PhotoPickerProps {
  label: string;
  photos: string[];
  onPhotosChange: (photos: string[]) => void;
  maxPhotos?: number;
}

export function PhotoPicker({ label, photos, onPhotosChange, maxPhotos = 5 }: PhotoPickerProps) {
  const [loading, setLoading] = useState(false);

  const requestPermissions = async () => {
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
    const { status: libraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (cameraStatus !== "granted" || libraryStatus !== "granted") {
      Alert.alert("Permission Required", "Please grant camera and photo library permissions.");
      return false;
    }
    return true;
  };

  const handleTakePhoto = async () => {
    if (photos.length >= maxPhotos) {
      Alert.alert("Limit Reached", `Maximum ${maxPhotos} photos allowed`);
      return;
    }

    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    setLoading(true);
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: "images",
        allowsEditing: true,
        quality: 0.8,
        aspect: [4, 3],
      });

      if (!result.canceled && result.assets[0]) {
        onPhotosChange([...photos, result.assets[0].uri]);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to take photo");
    } finally {
      setLoading(false);
    }
  };

  const handlePickFromLibrary = async () => {
    if (photos.length >= maxPhotos) {
      Alert.alert("Limit Reached", `Maximum ${maxPhotos} photos allowed`);
      return;
    }

    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    setLoading(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images",
        allowsEditing: true,
        quality: 0.8,
        aspect: [4, 3],
      });

      if (!result.canceled && result.assets[0]) {
        onPhotosChange([...photos, result.assets[0].uri]);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to pick photo");
    } finally {
      setLoading(false);
    }
  };

  const handleRemovePhoto = (index: number) => {
    Alert.alert("Remove Photo", "Are you sure you want to remove this photo?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => {
          const newPhotos = photos.filter((_, i) => i !== index);
          onPhotosChange(newPhotos);
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photosScroll}>
        {photos.map((photo, index) => (
          <View key={index} style={styles.photoContainer}>
            <Image source={{ uri: photo }} style={styles.photo} />
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => handleRemovePhoto(index)}
            >
              <Text style={styles.removeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
        ))}

        {photos.length < maxPhotos && (
          <View style={styles.addButtons}>
            <TouchableOpacity
              style={styles.addButton}
              onPress={handleTakePhoto}
              disabled={loading}
            >
              <Text style={styles.addButtonIcon}>📷</Text>
              <Text style={styles.addButtonText}>Camera</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.addButton}
              onPress={handlePickFromLibrary}
              disabled={loading}
            >
              <Text style={styles.addButtonIcon}>🖼️</Text>
              <Text style={styles.addButtonText}>Gallery</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <Text style={styles.hint}>
        {photos.length}/{maxPhotos} photos added
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    fontWeight: "600",
    marginBottom: SPACING.sm,
  },
  photosScroll: {
    marginBottom: SPACING.sm,
  },
  photoContainer: {
    position: "relative",
    marginRight: SPACING.md,
  },
  photo: {
    width: 80,
    height: 80,
    borderRadius: BORDER_RADIUS.md,
  },
  removeButton: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: COLORS.error,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  removeButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  addButtons: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  addButton: {
    width: 80,
    height: 80,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f5f5f7",
  },
  addButtonIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  addButtonText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
  },
  hint: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
  },
});
