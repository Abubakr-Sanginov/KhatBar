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
import { Colors } from "../../theme/colors";

export default function CallScreen({ navigation }: any) {
  const {
    phase,
    chatName,
    mode,
    isMicOn,
    isCameraOn,
    participants,
    answeredAt,
  } = useCallStore();
  const { hangUp, toggleMic, toggleCamera, acceptCall, declineCall, setMinimized } =
    useCall();
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
              <Text style={styles.actionIcon}>📞</Text>
              <Text style={styles.actionLabel}>Decline</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.acceptButton]}
              onPress={acceptCall}
            >
              <Text style={styles.actionIcon}>
                {mode === "video" ? "📹" : "📞"}
              </Text>
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
            <Text style={styles.controlIcon}>{isMicOn ? "🎤" : "🔇"}</Text>
            <Text style={styles.controlLabel}>{isMicOn ? "Mute" : "Unmute"}</Text>
          </TouchableOpacity>

          {mode === "video" && (
            <TouchableOpacity
              style={[styles.controlButton, !isCameraOn && styles.controlButtonOff]}
              onPress={toggleCamera}
            >
              <Text style={styles.controlIcon}>{isCameraOn ? "📹" : "📷"}</Text>
              <Text style={styles.controlLabel}>
                {isCameraOn ? "Camera On" : "Camera Off"}
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
            <Text style={styles.controlIcon}>📞</Text>
            <Text style={styles.controlLabel}>End</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
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
    backgroundColor: Colors.dark.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  avatarText: {
    color: "#fff",
    fontSize: 48,
    fontWeight: "bold",
  },
  callerName: {
    fontSize: 24,
    fontWeight: "bold",
    color: Colors.dark.text,
    marginBottom: 8,
  },
  incomingLabel: {
    fontSize: 16,
    color: Colors.dark.textSecondary,
    marginBottom: 40,
  },
  statusText: {
    fontSize: 16,
    color: Colors.dark.textSecondary,
  },
  timer: {
    fontSize: 18,
    color: Colors.dark.primary,
    marginTop: 16,
    fontWeight: "500",
  },
  incomingActions: {
    flexDirection: "row",
    gap: 40,
  },
  actionButton: {
    alignItems: "center",
    gap: 8,
  },
  declineButton: {},
  acceptButton: {},
  actionIcon: {
    fontSize: 32,
  },
  actionLabel: {
    color: Colors.dark.text,
    fontSize: 14,
  },
  controls: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 24,
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
  controlIcon: {
    fontSize: 28,
    marginBottom: 4,
  },
  controlLabel: {
    color: Colors.dark.text,
    fontSize: 12,
  },
  participantTile: {
    alignItems: "center",
    marginBottom: 24,
  },
  participantAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.dark.muted,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  participantAvatarText: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "bold",
  },
  participantName: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: "500",
  },
  participantStatus: {
    color: Colors.dark.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
});
