import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useThemeColors, useThemedStyles } from "../../hooks/use-theme";
import type { ThemeColors } from "../../theme/colors";
import { useLocalChat } from "../../hooks/use-local-chat";
import { useLocalChatStore } from "../../stores/local-chat-store";
import type { LocalMessage } from "../../lib/local-chat/types";
import { formatMessageTime } from "../../lib/utils";
import { ArrowUp } from "lucide-react-native";

function LocalMessageBubble({ message }: { message: LocalMessage }) {
  const styles = useThemedStyles(makeStyles);
  const colors = useThemeColors();
  const isOwn = message.fromMe;

  return (
    <View style={[styles.bubble, isOwn ? styles.ownBubble : styles.otherBubble]}>
      <Text style={[styles.text, { color: isOwn ? "#fff" : colors.text }]}>{message.content}</Text>
      <View style={styles.meta}>
        <Text style={[styles.time, { color: isOwn ? "rgba(255,255,255,0.5)" : colors.muted }]}>
          {formatMessageTime(new Date(message.createdAt).toISOString())}
        </Text>
        {isOwn && (
          <Text style={[styles.check, { color: message.delivered ? "#22C55E" : "rgba(255,255,255,0.4)" }]}>
            {message.delivered ? "✓✓" : "✓"}
          </Text>
        )}
      </View>
    </View>
  );
}

export default function LocalChatScreen({ route, navigation }: any) {
  const { peerId, peerName } = route.params;
  const colors = useThemeColors();
  const styles = useThemedStyles(makeStyles);
  const { sendLocalMessage, messages, peers } = useLocalChat();
  const chatMessages = messages[peerId] || [];
  const peer = peers[peerId];
  const [input, setInput] = useState("");
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <View>
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: "600" }}>{peerName}</Text>
          {peer && (
            <Text style={{ color: peer.online ? "#22C55E" : colors.muted, fontSize: 12 }}>
              {peer.online ? "Online" : "Offline"}
            </Text>
          )}
        </View>
      ),
    });
  }, [navigation, peerName, peer?.online, colors]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text) return;
    setInput("");
    try {
      await sendLocalMessage(peerId, text);
    } catch (err: any) {
      console.log("Send error:", err.message);
    }
  }, [input, peerId]);

  const renderItem = useCallback(
    ({ item }: { item: LocalMessage }) => <LocalMessageBubble message={item} />,
    []
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={flatListRef}
        data={chatMessages}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        inverted
        contentContainerStyle={styles.list}
      />

      <View style={[styles.inputBar, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
        <TextInput
          style={[styles.textInput, { backgroundColor: colors.inputBg, color: colors.text }]}
          placeholder="Message..."
          placeholderTextColor={colors.muted}
          value={input}
          onChangeText={setInput}
          multiline
          maxLength={4000}
        />
        <TouchableOpacity
          style={[styles.sendButton, { backgroundColor: colors.primary }, !input.trim() && { opacity: 0.4 }]}
          onPress={handleSend}
          disabled={!input.trim()}
        >
          <ArrowUp size={18} color={colors.onPrimary} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    list: { paddingHorizontal: 12, paddingTop: 8 },
    bubble: { maxWidth: "78%", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18, marginVertical: 3 },
    ownBubble: { backgroundColor: colors.primary, alignSelf: "flex-end", borderBottomRightRadius: 4 },
    otherBubble: { backgroundColor: colors.card, alignSelf: "flex-start", borderBottomLeftRadius: 4 },
    text: { fontSize: 15, lineHeight: 20 },
    meta: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: 4, marginTop: 4 },
    time: { fontSize: 11 },
    check: { fontSize: 11, fontWeight: "600" },
    inputBar: { flexDirection: "row", alignItems: "flex-end", paddingHorizontal: 10, paddingVertical: 8, paddingBottom: Platform.OS === "ios" ? 24 : 8, borderTopWidth: StyleSheet.hairlineWidth, gap: 4 },
    textInput: { flex: 1, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, maxHeight: 100 },
    sendButton: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  });
