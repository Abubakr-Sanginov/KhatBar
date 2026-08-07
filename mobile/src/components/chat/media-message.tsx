import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { FileText, Play, Pause } from "lucide-react-native";
import { useThemeColors } from "../../hooks/use-theme";
import type { Message } from "../../types";

let Audio: any = null;
try {
  Audio = require("expo-av").Audio;
} catch {}

const API_BASE = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

function ImageMessage({ message, isOwn }: { message: Message; isOwn: boolean }) {
  const colors = useThemeColors();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const uri = message.mediaUrl?.startsWith("http")
    ? message.mediaUrl
    : `${API_BASE}${message.mediaUrl}`;

  if (error) {
    return (
      <View style={[styles.mediaPlaceholder, { backgroundColor: isOwn ? "rgba(255,255,255,0.15)" : colors.inputBg }]}>
        <FileText size={24} color={colors.muted} />
        <Text style={[styles.mediaPlaceholderText, { color: colors.muted }]}>Image unavailable</Text>
      </View>
    );
  }

  return (
    <View>
      {loading && (
        <View style={[styles.mediaPlaceholder, { backgroundColor: isOwn ? "rgba(255,255,255,0.15)" : colors.inputBg }]}>
          <ActivityIndicator size="small" color={isOwn ? "#fff" : colors.primary} />
        </View>
      )}
      <Image
        source={{ uri }}
        style={[styles.image, loading && { display: "none" }]}
        resizeMode="cover"
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        onError={() => { setLoading(false); setError(true); }}
      />
    </View>
  );
}

function GifMessage({ message, isOwn }: { message: Message; isOwn: boolean }) {
  const colors = useThemeColors();
  const uri = message.mediaUrl?.startsWith("http")
    ? message.mediaUrl
    : `${API_BASE}${message.mediaUrl}`;

  return (
    <Image
      source={{ uri }}
      style={styles.gif}
      resizeMode="contain"
    />
  );
}

function StickerMessage({ message }: { message: Message }) {
  const uri = message.mediaUrl?.startsWith("http")
    ? message.mediaUrl
    : `${API_BASE}${message.mediaUrl}`;

  return (
    <Image
      source={{ uri }}
      style={styles.sticker}
      resizeMode="contain"
    />
  );
}

function VideoMessage({ message }: { message: Message }) {
  const colors = useThemeColors();
  const uri = message.mediaUrl?.startsWith("http")
    ? message.mediaUrl
    : `${API_BASE}${message.mediaUrl}`;

  return (
    <View style={[styles.videoContainer, { backgroundColor: colors.inputBg }]}>
      <Image
        source={{ uri: message.thumbnailUrl || uri }}
        style={styles.videoThumbnail}
        resizeMode="cover"
      />
      <View style={styles.videoOverlay}>
        <View style={[styles.playButton, { backgroundColor: "rgba(0,0,0,0.6)" }]}>
          <Play size={20} color="#fff" fill="#fff" />
        </View>
      </View>
      {message.mediaDuration != null && (
        <Text style={[styles.videoDuration, { color: "#fff" }]}>
          {Math.floor(message.mediaDuration / 60)}:{String(Math.floor(message.mediaDuration % 60)).padStart(2, "0")}
        </Text>
      )}
    </View>
  );
}

function AudioMessage({ message, isOwn }: { message: Message; isOwn: boolean }) {
  const colors = useThemeColors();
  const [sound, setSound] = useState<any>(null);
  const [playing, setPlaying] = useState(false);

  const uri = message.mediaUrl?.startsWith("http")
    ? message.mediaUrl
    : `${API_BASE}${message.mediaUrl}`;

  const togglePlay = async () => {
    if (!Audio) return;

    if (playing && sound) {
      await sound.stopAsync();
      setPlaying(false);
      return;
    }

    try {
      if (!sound) {
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri },
          { shouldPlay: true }
        );
        newSound.setOnPlaybackStatusUpdate((status: any) => {
          if (status.isLoaded && status.didJustFinish) {
            setPlaying(false);
          }
        });
        setSound(newSound);
        setPlaying(true);
      } else {
        await sound.playAsync();
        setPlaying(true);
      }
    } catch {}
  };

  const duration = message.mediaDuration || 0;
  const minutes = Math.floor(duration / 60);
  const seconds = Math.floor(duration % 60);

  return (
    <View style={styles.audioContainer}>
      <TouchableOpacity
        onPress={togglePlay}
        style={[styles.audioPlayButton, { backgroundColor: isOwn ? "rgba(255,255,255,0.2)" : colors.primary }]}
      >
        {playing ? (
          <Pause size={16} color={isOwn ? "#fff" : colors.onPrimary} fill={isOwn ? "#fff" : colors.onPrimary} />
        ) : (
          <Play size={16} color={isOwn ? "#fff" : colors.onPrimary} fill={isOwn ? "#fff" : colors.onPrimary} />
        )}
      </TouchableOpacity>
      <View style={styles.audioInfo}>
        <View style={[styles.audioWaveform, { backgroundColor: isOwn ? "rgba(255,255,255,0.2)" : colors.border }]}>
          <View
            style={[
              styles.audioProgress,
              {
                backgroundColor: isOwn ? "#fff" : colors.primary,
                width: playing ? "60%" : "0%",
              },
            ]}
          />
        </View>
        <Text style={[styles.audioDuration, { color: isOwn ? "rgba(255,255,255,0.7)" : colors.muted }]}>
          {minutes}:{String(seconds).padStart(2, "0")}
        </Text>
      </View>
    </View>
  );
}

function FileMessage({ message, isOwn }: { message: Message; isOwn: boolean }) {
  const colors = useThemeColors();

  return (
    <View style={[styles.fileContainer, { borderColor: isOwn ? "rgba(255,255,255,0.2)" : colors.border }]}>
      <View style={[styles.fileIcon, { backgroundColor: isOwn ? "rgba(255,255,255,0.15)" : colors.inputBg }]}>
        <FileText size={20} color={isOwn ? "#fff" : colors.primary} />
      </View>
      <Text
        style={[styles.fileName, { color: isOwn ? "#fff" : colors.text }]}
        numberOfLines={1}
      >
        {message.content || "File"}
      </Text>
    </View>
  );
}

export function MediaMessage({ message, isOwn }: { message: Message; isOwn: boolean }) {
  switch (message.type) {
    case "IMAGE":
      return <ImageMessage message={message} isOwn={isOwn} />;
    case "GIF":
      return <GifMessage message={message} isOwn={isOwn} />;
    case "STICKER":
      return <StickerMessage message={message} />;
    case "VIDEO":
      return <VideoMessage message={message} />;
    case "AUDIO":
      return <AudioMessage message={message} isOwn={isOwn} />;
    case "FILE":
      return <FileMessage message={message} isOwn={isOwn} />;
    default:
      return null;
  }
}

const styles = StyleSheet.create({
  image: {
    width: 220,
    height: 220,
    borderRadius: 14,
  },
  gif: {
    width: 200,
    height: 200,
    borderRadius: 14,
  },
  sticker: {
    width: 140,
    height: 140,
  },
  mediaPlaceholder: {
    width: 220,
    height: 160,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  mediaPlaceholderText: {
    fontSize: 13,
  },
  videoContainer: {
    width: 220,
    height: 160,
    borderRadius: 14,
    overflow: "hidden",
  },
  videoThumbnail: {
    width: "100%",
    height: "100%",
  },
  videoOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  playButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  videoDuration: {
    position: "absolute",
    bottom: 6,
    right: 8,
    fontSize: 11,
    fontWeight: "600",
  },
  audioContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minWidth: 180,
  },
  audioPlayButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  audioInfo: {
    flex: 1,
    gap: 4,
  },
  audioWaveform: {
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  audioProgress: {
    height: "100%",
    borderRadius: 2,
  },
  audioDuration: {
    fontSize: 11,
  },
  fileContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  fileIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  fileName: {
    flex: 1,
    fontSize: 14,
  },
});
