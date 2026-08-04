import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  TextInput,
  Image,
  ActivityIndicator,
} from "react-native";
import { useChatStore } from "../../stores/chat-store";
import { useAuthStore } from "../../stores/auth-store";
import { Colors } from "../../theme/colors";
import { formatTime, displayName, getInitials } from "../../lib/utils";
import type { Chat, Message } from "../../types";

type ChatItem = Chat & { lastMessage?: Message | null; unreadCount: number };

function ChatAvatar({ chat }: { chat: Chat }) {
  if (chat.avatarUrl) {
    return <Image source={{ uri: chat.avatarUrl }} style={styles.avatar} />;
  }
  return (
    <View style={[styles.avatar, styles.avatarFallback]}>
      <Text style={styles.avatarText}>
        {getInitials(chat.name || "C")}
      </Text>
    </View>
  );
}

function ChatListItem({
  chat,
  onPress,
}: {
  chat: ChatItem;
  onPress: () => void;
}) {
  const lastMsg = chat.lastMessage;
  const preview = lastMsg
    ? lastMsg.isDeleted
      ? "Message deleted"
      : lastMsg.type === "IMAGE"
        ? "📷 Photo"
        : lastMsg.type === "VIDEO"
          ? "🎬 Video"
          : lastMsg.type === "AUDIO"
            ? "🎤 Voice message"
            : lastMsg.type === "GIF"
              ? "GIF"
              : lastMsg.type === "STICKER"
                ? "Sticker"
                : lastMsg.type === "FILE"
                  ? "📎 File"
                  : lastMsg.type === "CALL"
                    ? "📞 Call"
                    : lastMsg.content
    : "No messages yet";

  return (
    <TouchableOpacity style={styles.chatItem} onPress={onPress} activeOpacity={0.7}>
      <ChatAvatar chat={chat} />
      <View style={styles.chatContent}>
        <View style={styles.chatHeader}>
          <Text style={styles.chatName} numberOfLines={1}>
            {chat.name || "Private Chat"}
          </Text>
          {lastMsg && (
            <Text style={styles.chatTime}>{formatTime(lastMsg.createdAt)}</Text>
          )}
        </View>
        <View style={styles.chatFooter}>
          <Text style={styles.chatPreview} numberOfLines={1}>
            {preview}
          </Text>
          {(chat.unreadCount || 0) > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {chat.unreadCount > 99 ? "99+" : chat.unreadCount}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function ChatListScreen({ navigation }: any) {
  const { chats, isLoading, isRefreshing, fetchChats, refreshChats } = useChatStore();
  const user = useAuthStore((s) => s.user);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Chat[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    fetchChats();
  }, []);

  const handleSearch = useCallback(
    async (query: string) => {
      setSearch(query);
      if (query.length < 2) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }
      setIsSearching(true);
      try {
        const results = await useChatStore.getState().searchChats(query);
        setSearchResults(results);
      } catch {}
      setIsSearching(false);
    },
    []
  );

  const displayChats = search
    ? searchResults.map((c) => ({ ...c, unreadCount: 0 }))
    : chats;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>KhatBar</Text>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search chats..."
          placeholderTextColor={Colors.dark.muted}
          value={search}
          onChangeText={handleSearch}
          autoCapitalize="none"
        />
      </View>

      <FlatList
        data={displayChats as ChatItem[]}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ChatListItem
            chat={item}
            onPress={() => navigation.navigate("Chat", { chatId: item.id, chatName: item.name })}
          />
        )}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refreshChats}
            tintColor={Colors.dark.primary}
          />
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                {search ? "No chats found" : "No conversations yet"}
              </Text>
              {!search && (
                <Text style={styles.emptyHint}>
                  Tap + to start a new chat
                </Text>
              )}
            </View>
          ) : null
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate("NewChat")}
        activeOpacity={0.8}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 12,
    backgroundColor: Colors.dark.background,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: Colors.dark.text,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  searchInput: {
    backgroundColor: Colors.dark.inputBg,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: Colors.dark.text,
  },
  chatItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.dark.border,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    marginRight: 12,
  },
  avatarFallback: {
    backgroundColor: Colors.dark.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  chatContent: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  chatName: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.dark.text,
    flex: 1,
  },
  chatTime: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
    marginLeft: 8,
  },
  chatFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  chatPreview: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    flex: 1,
  },
  badge: {
    backgroundColor: Colors.dark.primary,
    borderRadius: 12,
    minWidth: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    marginLeft: 8,
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  empty: {
    alignItems: "center",
    marginTop: 80,
  },
  emptyText: {
    color: Colors.dark.textSecondary,
    fontSize: 16,
  },
  emptyHint: {
    color: Colors.dark.muted,
    fontSize: 14,
    marginTop: 8,
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.dark.primary,
    alignItems: "center",
    justifyContent: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  fabText: {
    color: "#fff",
    fontSize: 28,
    lineHeight: 30,
  },
});
