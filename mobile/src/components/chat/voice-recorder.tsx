import React, { useState, useRef } from "react";
import { TouchableOpacity, StyleSheet, Text, View, Alert } from "react-native";
import { Mic, Square } from "lucide-react-native";
import { useThemeColors } from "../../hooks/use-theme";

let Audio: any = null;
try {
  Audio = require("expo-av").Audio;
} catch {}

let Haptics: any = null;
try {
  Haptics = require("expo-haptics");
} catch {}

interface VoiceRecorderProps {
  onRecord: (uri: string, duration: number) => void;
}

export function VoiceRecorder({ onRecord }: VoiceRecorderProps) {
  const colors = useThemeColors();
  const [recording, setRecording] = useState<any>(null);
  const [duration, setDuration] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startRecording = async () => {
    if (!Audio) {
      Alert.alert("Not available", "Voice recording requires a dev build. Run: npx expo prebuild && npx expo run:android");
      return;
    }
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") return;

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(newRecording);
      setDuration(0);
      Haptics?.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      Alert.alert("Error", "Could not start recording");
    }
  };

  const stopRecording = async () => {
    if (!recording || !Audio) return;

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    try {
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

      const uri = recording.getURI();
      Haptics?.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      if (uri) {
        onRecord(uri, duration);
      }
    } catch {}

    setRecording(null);
    setDuration(0);
  };

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  if (recording) {
    return (
      <View style={styles.recordingContainer}>
        <Text style={[styles.recordingTimer, { color: colors.destructive }]}>
          {formatDuration(duration)}
        </Text>
        <TouchableOpacity onPress={stopRecording} style={styles.stopButton}>
          <Square size={18} color="#fff" fill="#fff" />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <TouchableOpacity
      onPress={startRecording}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={styles.trigger}
    >
      <Mic size={22} color={colors.muted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  trigger: {
    padding: 4,
  },
  recordingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  recordingTimer: {
    fontSize: 14,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  stopButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
  },
});
