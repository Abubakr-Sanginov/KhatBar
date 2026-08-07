import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import { useCallStore } from "../../stores/call-store";
import { useCall } from "../../hooks/use-call";
import { useThemeColors, useThemedStyles } from "../../hooks/use-theme";
import type { ThemeColors } from "../../theme/colors";
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff } from "lucide-react-native";

export default function CallScreen({ navigation }: any) {
  const styles = useThemedStyles(makeStyles);
  const colors = useThemeColors();
  const {
    phase,
    chatName,
    mode,
    isMicOn,
    isCameraOn,
    participants,
    answeredAt,
  } = useCallStore();
  const { hangUp, toggleMic, toggleCamera, acceptCall, declineCall } = useCall();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!answeredAt) return;
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - answeredAt) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [answeredAt]);

  const formatElapsed = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const participantList = Object.values(participants);

  return (
    <SafeAreaView style={styles.container}>
      {phase === "incoming" && (
        <View style={styles.incomingContainer}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarText}>
              {chatName?.charAt(0)?.toUpperCase() || "?"}
            </Text>
          </View>
          <Text style={styles.callerName}>{chatName}</Text>
          <Text style={styles.incomingLabel}>
            Incoming {mode === "video" ? "video" : "voice"} call
          </Text>

          <View style={styles.incomingActions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.declineButton]}
              onPress={declineCall}
            >
              <View style={[styles.actionCircle, { backgroundColor: "#EF4444" }]}>
                <PhoneOff size={28} color="#fff" />
              </View>
              <Text style={styles.actionLabel}>Decline</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.acceptButton]}
              onPress={acceptCall}
            >
              <View style={[styles.actionCircle, { backgroundColor: "#22C55E" }]}>
                {mode === "video" ? (
                  <Video size={28} color="#fff" />
                ) : (
                  <Phone size={28} color="#fff" />
                )}
              </View>
              <Text style={styles.actionLabel}>Accept</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {phase === "outgoing" && (
        <View style={styles.activeContainer}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarText}>
              {chatName?.charAt(0)?.toUpperCase() || "?"}
            </Text>
          </View>
          <Text style={styles.callerName}>{chatName}</Text>
          <Text style={styles.statusText}>Calling...</Text>
        </View>
      )}

      {phase === "active" && (
        <View style={styles.activeContainer}>
          {participantList.length > 0 ? (
            participantList.map((p) => (
              <View key={p.id} style={styles.participantTile}>
                <View style={styles.participantAvatar}>
                  <Text style={styles.participantAvatarText}>
                    {p.displayName?.charAt(0)?.toUpperCase() || "?"}
                  </Text>
                </View>
                <Text style={styles.participantName}>
                  {p.displayName || "Unknown"}
                </Text>
                <Text style={styles.participantStatus}>
                  {p.connection === "connected" ? "Connected" : p.connection}
                </Text>
              </View>
            ))
          ) : (
            <>
              <View style={styles.avatarLarge}>
                <Text style={styles.avatarText}>
                  {chatName?.charAt(0)?.toUpperCase() || "?"}
                </Text>
              </View>
              <Text style={styles.callerName}>{chatName}</Text>
            </>
          )}

          {answeredAt != null && answeredAt > 0 && (
            <Text style={styles.timer}>{formatElapsed(elapsed)}</Text>
          )}
        </View>
      )}

      {(phase === "active" || phase === "outgoing") && (
        <View style={styles.controls}>
          <TouchableOpacity
            style={[styles.controlButton, !isMicOn && styles.controlButtonOff]}
            onPress={toggleMic}
          >
            <View style={[styles.controlCircle, { backgroundColor: !isMicOn ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.25)" }]}>
              {isMicOn ? <Mic size={24} color="#fff" /> : <MicOff size={24} color="#fff" />}
            </View>
            <Text style={styles.controlLabel}>{isMicOn ? "Mute" : "Unmute"}</Text>
          </TouchableOpacity>

          {mode === "video" && (
            <TouchableOpacity
              style={[styles.controlButton, !isCameraOn && styles.controlButtonOff]}
              onPress={toggleCamera}
            >
              <View style={[styles.controlCircle, { backgroundColor: !isCameraOn ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.25)" }]}>
                {isCameraOn ? <Video size={24} color="#fff" /> : <VideoOff size={24} color="#fff" />}
              </View>
              <Text style={styles.controlLabel}>
                {isCameraOn ? "Camera" : "Camera Off"}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.controlButton, styles.hangUpButton]}
            onPress={() => {
              hangUp();
              navigation.goBack();
            }}
          >
            <View style={[styles.controlCircle, { backgroundColor: "#EF4444" }]}>
              <PhoneOff size={24} color="#fff" />
            </View>
            <Text style={styles.controlLabel}>End</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.immersive,
    },
    incomingContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    activeContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarLarge: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 20,
    },
    avatarText: {
      color: colors.onPrimary,
      fontSize: 48,
      fontWeight: "bold",
    },
    callerName: {
      fontSize: 24,
      fontWeight: "bold",
      color: colors.onImmersive,
      marginBottom: 8,
    },
    incomingLabel: {
      fontSize: 16,
      color: colors.onImmersive,
      opacity: 0.65,
      marginBottom: 40,
    },
    statusText: {
      fontSize: 16,
      color: colors.onImmersive,
      opacity: 0.65,
    },
    timer: {
      fontSize: 18,
      color: colors.primary,
      marginTop: 16,
      fontWeight: "500",
    },
    incomingActions: {
      flexDirection: "row",
      gap: 60,
    },
    actionButton: {
      alignItems: "center",
      gap: 12,
    },
    declineButton: {},
    acceptButton: {},
    actionCircle: {
      width: 64,
      height: 64,
      borderRadius: 32,
      alignItems: "center",
      justifyContent: "center",
    },
    actionLabel: {
      color: colors.onImmersive,
      fontSize: 14,
      fontWeight: "500",
    },
    controls: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      gap: 32,
      paddingBottom: 40,
      paddingHorizontal: 20,
    },
    controlButton: {
      alignItems: "center",
      width: 72,
    },
    controlButtonOff: {
      opacity: 0.7,
    },
    hangUpButton: {},
    controlCircle: {
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 6,
    },
    controlLabel: {
      color: colors.onImmersive,
      fontSize: 12,
      fontWeight: "500",
    },
    participantTile: {
      alignItems: "center",
      marginBottom: 24,
    },
    participantAvatar: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.muted,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 8,
    },
    participantAvatarText: {
      color: colors.onImmersive,
      fontSize: 32,
      fontWeight: "bold",
    },
    participantName: {
      color: colors.onImmersive,
      fontSize: 16,
      fontWeight: "500",
    },
    participantStatus: {
      color: colors.onImmersive,
      opacity: 0.65,
      fontSize: 13,
      marginTop: 2,
    },
  });
