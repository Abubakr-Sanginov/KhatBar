import React from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useThemeColors, useThemedStyles } from "../../hooks/use-theme";
import type { ThemeColors } from "../../theme/colors";
import { useLocalChat } from "../../hooks/use-local-chat";
import { formatTime } from "../../lib/utils";
import type { LocalChat } from "../../lib/local-chat/types";

export default function LocalChatsScreen({ navigation }: any) {
  const colors = useThemeColors();
  const styles = useThemedStyles(makeStyles);
  const { chats, messages, peers, deleteChat, setActiveChatId } = useLocalChat();

  const handleOpen = (chat: LocalChat) => {
    setActiveChatId(chat.id);
    navigation.navigate("LocalChat", {
      chatId: chat.id,
      peerId: chat.peerId,
      peerName: chat.peerName,
    });
  };

  const handleDelete = (chatId: string) => {
    deleteChat(chatId);
  };

  const renderItem = ({ item }: { item: LocalChat }) => {
    const peer = peers[item.peerId];
    const lastMsg = messages[item.id]?.slice(-1)[0];

    return (
      <TouchableOpacity
        style={[styles.chatItem, { borderBottomColor: colors.border }]}
        onPress={() => handleOpen(item)}
        onLongPress={() => handleDelete(item.id)}
      >
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Text style={styles.avatarText}>{item.peerName.charAt(0)}</Text>
        </View>
        <View style={styles.chatContent}>
          <View style={styles.chatHeader}>
            <Text style={[styles.chatName, { color: colors.text }]} numberOfLines={1}>
              {item.peerName}
            </Text>
            {lastMsg && (
              <Text style={[styles.chatTime, { color: colors.muted }]}>{formatTime(new Date(lastMsg.createdAt).toISOString())}</Text>
            )}
          </View>
          <View style={styles.chatFooter}>
            <Text style={[styles.chatPreview, { color: colors.textSecondary }]} numberOfLines={1}>
              {peer?.online ? "Online" : "Offline"}
              {lastMsg ? ` · ${lastMsg.content}` : ""}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Local Chats</Text>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={() => navigation.navigate("LocalPair")}
        >
          <Text style={[styles.addButtonText, { color: colors.onPrimary }]}>+ Pair</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={chats}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No local chats yet</Text>
            <Text style={[styles.emptyHint, { color: colors.muted }]}>
              Pair with a device on the same Wi-Fi to start chatting
            </Text>
          </View>
        }
      />
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingTop: 60, paddingBottom: 12 },
    headerTitle: { fontSize: 28, fontWeight: "bold", color: colors.text },
    addButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
    addButtonText: { fontSize: 14, fontWeight: "600" },
    chatItem: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
    avatar: { width: 52, height: 52, borderRadius: 26, marginRight: 12, alignItems: "center", justifyContent: "center" },
    avatarText: { color: "#fff", fontSize: 18, fontWeight: "600" },
    chatContent: { flex: 1 },
    chatHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
    chatName: { fontSize: 16, fontWeight: "600", flex: 1 },
    chatTime: { fontSize: 12, marginLeft: 8 },
    chatFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    chatPreview: { fontSize: 14, flex: 1 },
    empty: { alignItems: "center", marginTop: 80 },
    emptyText: { fontSize: 16 },
    emptyHint: { fontSize: 14, marginTop: 8, textAlign: "center", paddingHorizontal: 40 },
  });
