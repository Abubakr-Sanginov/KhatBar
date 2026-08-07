import React from "react";
import { TouchableOpacity, Alert, StyleSheet } from "react-native";
import * as ImagePickerLib from "expo-image-picker";
import { Camera, Image as ImageIcon } from "lucide-react-native";
import { useThemeColors } from "../../hooks/use-theme";

interface MediaPickerProps {
  onPick: (uri: string, type: "image" | "video") => void;
}

export function MediaPicker({ onPick }: MediaPickerProps) {
  const colors = useThemeColors();

  const pickFromLibrary = async () => {
    const { status } = await ImagePickerLib.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Allow access to your photos to send media.");
      return;
    }

    const result = await ImagePickerLib.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      allowsEditing: true,
      quality: 0.8,
      videoMaxDuration: 60,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      onPick(asset.uri, asset.type === "video" ? "video" : "image");
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePickerLib.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Allow camera access to take photos.");
      return;
    }

    const result = await ImagePickerLib.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      onPick(result.assets[0].uri, "image");
    }
  };

  const showOptions = () => {
    Alert.alert("Send media", "Choose an option", [
      { text: "Take Photo", onPress: takePhoto },
      { text: "Choose from Library", onPress: pickFromLibrary },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  return (
    <TouchableOpacity
      onPress={showOptions}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={styles.trigger}
    >
      <ImageIcon size={22} color={colors.muted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  trigger: {
    padding: 4,
  },
});
