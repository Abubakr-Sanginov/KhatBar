import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert } from "react-native";
import { useThemeColors, useThemedStyles } from "../../hooks/use-theme";
import type { ThemeColors } from "../../theme/colors";
import { useLocalChat } from "../../hooks/use-local-chat";
import type { LocalPeer } from "../../lib/local-chat/types";

export default function LocalPairScreen({ navigation }: any) {
  const colors = useThemeColors();
  const styles = useThemedStyles(makeStyles);
  const { peers, pair, createPairingCode, joinPairingCode } = useLocalChat();
  const [code, setCode] = useState("");
  const [ownCode, setOwnCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const onlinePeers = Object.values(peers).filter((peer) => peer.online);

  const createCode = async () => {
    setLoading(true);
    try {
      setOwnCode(await createPairingCode());
    } catch (error) {
      Alert.alert("Error", error instanceof Error ? error.message : "Could not create pairing code");
    } finally {
      setLoading(false);
    }
  };

  const connect = () => {
    try {
      joinPairingCode(code);
      Alert.alert("Connecting", "The offer and answer are exchanged automatically. Keep this screen open briefly.");
    } catch (error) {
      Alert.alert("Error", error instanceof Error ? error.message : "Could not join pairing code");
    }
  };

  const pairPeer = async (peer: LocalPeer) => {
    await pair(peer);
    Alert.alert("Paired!", `You can now chat with ${peer.name}`);
    navigation.goBack();
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Local Chat</Text>
        <Text style={styles.headerSubtitle}>Pair automatically with a short server code</Text>
      </View>

      {onlinePeers.length > 0 && <View style={styles.section}>
        <Text style={styles.sectionTitle}>Discovered Devices</Text>
        {onlinePeers.map((peer) => <TouchableOpacity key={peer.id} style={[styles.peerCard, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => void pairPeer(peer)}>
          <View style={[styles.peerAvatar, { backgroundColor: colors.primary }]}><Text style={styles.peerAvatarText}>{peer.name.charAt(0)}</Text></View>
          <View style={styles.peerInfo}><Text style={[styles.peerName, { color: colors.text }]}>{peer.name}</Text><Text style={[styles.peerId, { color: colors.muted }]}>{peer.id.slice(0, 12)}...</Text></View>
          <View style={styles.onlineDot} />
        </TouchableOpacity>)}
      </View>}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Pairing Code</Text>
        <View style={[styles.codeBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.codeLabel, { color: colors.textSecondary }]}>Create a code and share it with the other device.</Text>
          {ownCode && <Text style={[styles.codeValue, { color: colors.primary }]}>{ownCode}</Text>}
          <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.primary }]} onPress={() => void createCode()} disabled={loading}>
            {loading ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={[styles.actionText, { color: colors.onPrimary }]}>{ownCode ? "Create New Code" : "Create Pairing Code"}</Text>}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Connect to Another Device</Text>
        <Text style={[styles.codeLabel, { color: colors.textSecondary }]}>Enter its 8-character code. SDP offer and answer exchange automatically.</Text>
        <TextInput style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]} value={code} onChangeText={(value) => setCode(value.toUpperCase().replace(/[^A-Z2-9]/g, ""))} placeholder="XXXXXXXX" placeholderTextColor={colors.muted} autoCapitalize="characters" maxLength={8} />
        <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.primary }, code.length !== 8 && styles.disabled]} onPress={connect} disabled={code.length !== 8}>
          <Text style={[styles.actionText, { color: colors.onPrimary }]}>Connect</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background }, header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 12 }, headerTitle: { fontSize: 28, fontWeight: "bold", color: colors.text }, headerSubtitle: { fontSize: 14, color: colors.textSecondary, marginTop: 4 }, section: { marginTop: 20, paddingHorizontal: 16 }, sectionTitle: { fontSize: 13, fontWeight: "600", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }, peerCard: { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 8 }, peerAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", marginRight: 12 }, peerAvatarText: { color: "#fff", fontSize: 18, fontWeight: "600" }, peerInfo: { flex: 1 }, peerName: { fontSize: 15, fontWeight: "600" }, peerId: { fontSize: 12, marginTop: 2 }, onlineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#22C55E" }, actionButton: { paddingVertical: 14, borderRadius: 12, alignItems: "center", marginTop: 8 }, actionText: { fontSize: 16, fontWeight: "600" }, disabled: { opacity: 0.45 }, codeBox: { padding: 16, borderRadius: 14, borderWidth: 1 }, codeLabel: { fontSize: 13, marginBottom: 8 }, codeValue: { fontSize: 28, fontWeight: "bold", letterSpacing: 4, textAlign: "center", marginVertical: 16 }, input: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 12, fontSize: 20, letterSpacing: 4, textAlign: "center" },
});
