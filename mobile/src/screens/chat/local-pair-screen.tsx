import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  FlatList,
} from "react-native";
import { useThemeColors, useThemedStyles } from "../../hooks/use-theme";
import type { ThemeColors } from "../../theme/colors";
import { useLocalChat } from "../../hooks/use-local-chat";
import type { LocalPeer } from "../../lib/local-chat/types";

export default function LocalPairScreen({ navigation }: any) {
  const colors = useThemeColors();
  const styles = useThemedStyles(makeStyles);
  const { peers, pair, createOffer, acceptOffer, acceptAnswer } = useLocalChat();
  const [mode, setMode] = useState<"discover" | "enter-code">("discover");
  const [code, setCode] = useState("");
  const [offerData, setOfferData] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"idle" | "offer-created" | "waiting-answer" | "enter-offer" | "offer-entered">("idle");

  const onlinePeers = Object.values(peers).filter((p) => p.online);

  const handleCreateOffer = async () => {
    setLoading(true);
    try {
      const result = await createOffer();
      if (result) {
        setCode(result.code);
        setOfferData(JSON.stringify(result.offer));
        setStep("offer-created");
      }
    } catch (err: any) {
      Alert.alert("Error", err.message);
    }
    setLoading(false);
  };

  const handleAcceptAnswer = async () => {
    if (!offerData) return;
    setLoading(true);
    try {
      Alert.alert("Enter Answer", "Ask the other device for their answer code and paste it below", [
        { text: "Cancel", style: "cancel" },
        {
          text: "OK",
          onPress: () => {
            setStep("enter-offer");
          },
        },
      ]);
    } catch (err: any) {
      Alert.alert("Error", err.message);
    }
    setLoading(false);
  };

  const handlePairWithPeer = async (peer: LocalPeer) => {
    await pair(peer);
    Alert.alert("Paired!", `You can now chat with ${peer.name}`);
    navigation.goBack();
  };

  const handleEnterOffer = async () => {
    setMode("enter-code");
    setStep("enter-offer");
  };

  const handleAcceptOfferAndSendAnswer = async () => {
    if (!code || !offerData) return;
    setLoading(true);
    try {
      const offer = JSON.parse(offerData);
      const answer = await acceptOffer(code, offer);
      if (answer) {
        Alert.alert(
          "Send this answer",
          "Copy the answer below and paste it on the other device",
          [
            { text: "Copy & Done", onPress: () => navigation.goBack() },
          ]
        );
        setOfferData(JSON.stringify(answer));
      }
    } catch (err: any) {
      Alert.alert("Error", err.message);
    }
    setLoading(false);
  };

  const handleFinishPairing = async () => {
    if (!code) return;
    setLoading(true);
    try {
      const answer = JSON.parse(offerData);
      await acceptAnswer(code, answer);
      Alert.alert("Paired!", "You can now chat locally");
      navigation.goBack();
    } catch (err: any) {
      Alert.alert("Error", err.message);
    }
    setLoading(false);
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Local Chat</Text>
        <Text style={styles.headerSubtitle}>Chat without internet on the same Wi-Fi</Text>
      </View>

      {onlinePeers.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Discovered Devices</Text>
          {onlinePeers.map((peer) => (
            <TouchableOpacity
              key={peer.id}
              style={[styles.peerCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => handlePairWithPeer(peer)}
            >
              <View style={[styles.peerAvatar, { backgroundColor: colors.primary }]}>
                <Text style={styles.peerAvatarText}>{peer.name.charAt(0)}</Text>
              </View>
              <View style={styles.peerInfo}>
                <Text style={[styles.peerName, { color: colors.text }]}>{peer.name}</Text>
                <Text style={[styles.peerId, { color: colors.muted }]}>{peer.id.slice(0, 12)}...</Text>
              </View>
              <View style={[styles.onlineDot, { backgroundColor: "#22C55E" }]} />
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Pair Manually</Text>

        <View style={styles.modeRow}>
          <TouchableOpacity
            style={[styles.modeButton, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => { setMode("discover"); setStep("idle"); }}
          >
            <Text style={[styles.modeText, { color: mode === "discover" ? colors.primary : colors.text }]}>
              Create Code
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeButton, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={handleEnterOffer}
          >
            <Text style={[styles.modeText, { color: mode === "enter-code" ? colors.primary : colors.text }]}>
              Enter Code
            </Text>
          </TouchableOpacity>
        </View>

        {mode === "discover" && step === "idle" && (
          <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.primary }]} onPress={handleCreateOffer} disabled={loading}>
            {loading ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={[styles.actionText, { color: colors.onPrimary }]}>Create Pairing Code</Text>}
          </TouchableOpacity>
        )}

        {mode === "discover" && step === "offer-created" && (
          <View style={[styles.codeBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.codeLabel, { color: colors.textSecondary }]}>Share this code with the other device:</Text>
            <Text style={[styles.codeValue, { color: colors.primary }]}>{code}</Text>
            <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.primary }]} onPress={handleFinishPairing} disabled={loading}>
              {loading ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={[styles.actionText, { color: colors.onPrimary }]}>Enter Their Answer</Text>}
            </TouchableOpacity>
          </View>
        )}

        {mode === "enter-code" && (
          <View>
            <Text style={[styles.codeLabel, { color: colors.textSecondary }]}>Enter the 8-character code from the other device:</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
              value={code}
              onChangeText={setCode}
              placeholder="XXXXXXXX"
              placeholderTextColor={colors.muted}
              autoCapitalize="characters"
              maxLength={8}
            />
            <Text style={[styles.codeLabel, { color: colors.textSecondary, marginTop: 12 }]}>Paste their SDP offer JSON:</Text>
            <TextInput
              style={[styles.input, styles.jsonInput, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
              value={offerData}
              onChangeText={setOfferData}
              placeholder='{"type":"offer","sdp":"..."}'
              placeholderTextColor={colors.muted}
              multiline
            />
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.primary }]}
              onPress={handleAcceptOfferAndSendAnswer}
              disabled={loading || !code || !offerData}
            >
              {loading ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={[styles.actionText, { color: colors.onPrimary }]}>Generate Answer</Text>}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 12 },
    headerTitle: { fontSize: 28, fontWeight: "bold", color: colors.text },
    headerSubtitle: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
    section: { marginTop: 20, paddingHorizontal: 16 },
    sectionTitle: { fontSize: 13, fontWeight: "600", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 },
    peerCard: { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 8 },
    peerAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", marginRight: 12 },
    peerAvatarText: { color: "#fff", fontSize: 18, fontWeight: "600" },
    peerInfo: { flex: 1 },
    peerName: { fontSize: 15, fontWeight: "600" },
    peerId: { fontSize: 12, marginTop: 2 },
    onlineDot: { width: 10, height: 10, borderRadius: 5 },
    modeRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
    modeButton: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, alignItems: "center" },
    modeText: { fontSize: 14, fontWeight: "600" },
    actionButton: { paddingVertical: 14, borderRadius: 12, alignItems: "center", marginTop: 8 },
    actionText: { fontSize: 16, fontWeight: "600" },
    codeBox: { padding: 16, borderRadius: 14, borderWidth: 1, marginTop: 8 },
    codeLabel: { fontSize: 13, marginBottom: 8 },
    codeValue: { fontSize: 28, fontWeight: "bold", letterSpacing: 4, textAlign: "center", marginBottom: 16 },
    input: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, marginBottom: 8 },
    jsonInput: { minHeight: 100, textAlignVertical: "top", fontSize: 13, fontFamily: "monospace" },
  });
