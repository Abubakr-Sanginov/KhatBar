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
  Pressable,
} from "react-native";
import Animated, {
  FadeInDown,
  FadeInUp,
  FadeIn,
  SlideInRight,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useChatStore } from "../../stores/chat-store";
import { useAuthStore } from "../../stores/auth-store";
import { useThemeColors, useThemedStyles } from "../../hooks/use-theme";
import type { ThemeColors } from "../../theme/colors";
import { formatTime, getInitials } from "../../lib/utils";
import type { Chat, Message } from "../../types";
import { Wifi, Plus } from "lucide-react-native";

const EMPTY_ARRAY: string[] = [];

type ChatItem = Chat & { lastMessage?: Message | null; unreadCount: number; typingUserIds?: string[]; memberPresence?: Record<string, string> };

function ChatAvatar({ chat, online }: { chat: Chat; online?: boolean }) {
  const styles = useThemedStyles(makeStyles);

  if (chat.avatarUrl) {
    return (
      <View>
        <Image source={{ uri: chat.avatarUrl }} style={styles.avatar} />
        {online && <View style={[styles.statusDot, { backgroundColor: "#22C55E" }]} />}
      </View>
    );
  }
  return (
    <View>
      <View style={[styles.avatar, styles.avatarFallback]}>
        <Text style={styles.avatarText}>{getInitials(chat.name || "C")}</Text>
      </View>
      {online && <View style={[styles.statusDot, { backgroundColor: "#22C55E" }]} />}
    </View>
  );
}

function ChatListItem({
  chat,
  onPress,
  index,
}: {
  chat: ChatItem;
  onPress: () => void;
  index: number;
}) {
  const styles = useThemedStyles(makeStyles);
  const colors = useThemeColors();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 15, stiffness: 400 });
  };
  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
  };

  const lastMsg = chat.lastMessage;
  const isTyping = (chat.typingUserIds?.length || 0) > 0;
  const isOnline = chat.memberPresence && Object.values(chat.memberPresence).some((s) => s === "ONLINE");

  const preview = isTyping
    ? "typing..."
    : lastMsg
      ? lastMsg.isDeleted
        ? "Message deleted"
        : lastMsg.type === "IMAGE" ? "Photo"
          : lastMsg.type === "VIDEO" ? "Video"
            : lastMsg.type === "AUDIO" ? "Voice message"
              : lastMsg.type === "GIF" ? "GIF"
                : lastMsg.type === "STICKER" ? "Sticker"
                  : lastMsg.type === "FILE" ? "File"
                    : lastMsg.type === "CALL" ? "Call"
                      : lastMsg.content
      : "No messages yet";

  return (
    <Animated.View entering={FadeInDown.delay(index * 50).duration(300)}>
      <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut} onPress={onPress}>
        <Animated.View style={[styles.chatItem, animatedStyle]}>
          <ChatAvatar chat={chat} online={isOnline} />
          <View style={styles.chatContent}>
            <View style={styles.chatHeader}>
              <Text style={[styles.chatName, { color: colors.text }]} numberOfLines={1}>
                {chat.name || "Private Chat"}
              </Text>
              {lastMsg && (
                <Text style={[styles.chatTime, { color: colors.muted }]}>{formatTime(lastMsg.createdAt)}</Text>
              )}
            </View>
            <View style={styles.chatFooter}>
              <Text
                style={[
                  styles.chatPreview,
                  { color: colors.textSecondary },
                  isTyping && { color: colors.primary, fontStyle: "italic" },
                ]}
                numberOfLines={1}
              >
                {preview}
              </Text>
              {(chat.unreadCount || 0) > 0 && (
                <Animated.View entering={ZoomIn.duration(300)} style={[styles.badge, { backgroundColor: colors.primary }]}>
                  <Text style={[styles.badgeText, { color: colors.onPrimary }]}>
                    {chat.unreadCount > 99 ? "99+" : chat.unreadCount}
                  </Text>
                </Animated.View>
              )}
            </View>
          </View>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

function FAB({ onPress, colors }: { onPress: () => void; colors: ThemeColors }) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.9, { damping: 15, stiffness: 400 });
  };
  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
  };

  return (
    <Animated.View entering={FadeInUp.delay(200).springify()}>
      <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut} onPress={onPress}>
        <Animated.View style={[styles.fab, { backgroundColor: colors.primary }, animatedStyle]}>
          <Plus size={24} color={colors.onPrimary} />
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

export default function ChatListScreen({ navigation }: any) {
  const chats = useChatStore((s) => s.chats);
  const isLoading = useChatStore((s) => s.isLoading);
  const isRefreshing = useChatStore((s) => s.isRefreshing);
  const fetchChats = useChatStore((s) => s.fetchChats);
  const refreshChats = useChatStore((s) => s.refreshChats);
  const user = useAuthStore((s) => s.user);
  const colors = useThemeColors();
  const styles = useThemedStyles(makeStyles);
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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>KhatBar</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate("LocalChats")}
          style={[styles.localButton, { backgroundColor: colors.card }]}
        >
          <Wifi size={18} color={colors.primary} />
        </TouchableOpacity>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(100).duration(400)}>
        <View style={styles.searchContainer}>
          <TextInput
            style={[styles.searchInput, { backgroundColor: colors.inputBg, color: colors.text }]}
            placeholder="Search chats..."
            placeholderTextColor={colors.muted}
            value={search}
            onChangeText={handleSearch}
            autoCapitalize="none"
          />
        </View>
      </Animated.View>

      <FlatList
        data={displayChats as ChatItem[]}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <ChatListItem
            chat={item}
            index={index}
            onPress={() => navigation.navigate("Chat", { chatId: item.id, chatName: item.name })}
          />
        )}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refreshChats}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          !isLoading ? (
            <Animated.View entering={FadeIn.duration(500)} style={styles.empty}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {search ? "No chats found" : "No conversations yet"}
              </Text>
              {!search && (
                <Text style={[styles.emptyHint, { color: colors.muted }]}>
                  Tap + to start a new chat
                </Text>
              )}
            </Animated.View>
          ) : null
        }
      />

      <FAB onPress={() => navigation.navigate("NewChat")} colors={colors} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 12,
  },
  headerTitle: { fontSize: 32, fontWeight: "bold" },
  localButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  searchContainer: { paddingHorizontal: 16, paddingBottom: 8 },
  searchInput: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
  },
  chatItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatar: { width: 52, height: 52, borderRadius: 26, marginRight: 12 },
  avatarFallback: { alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontSize: 18, fontWeight: "600" },
  statusDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
  },
  chatContent: { flex: 1 },
  chatHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  chatName: { fontSize: 16, fontWeight: "600", flex: 1 },
  chatTime: { fontSize: 12, marginLeft: 8 },
  chatFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  chatPreview: { fontSize: 14, flex: 1 },
  badge: {
    borderRadius: 12,
    minWidth: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    marginLeft: 8,
  },
  badgeText: { fontSize: 12, fontWeight: "600" },
  empty: { alignItems: "center", marginTop: 80 },
  emptyText: { fontSize: 16 },
  emptyHint: { fontSize: 14, marginTop: 8, textAlign: "center", paddingHorizontal: 40 },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
});

function makeStyles(colors: ThemeColors) {
  return {
    container: styles.container,
    header: styles.header,
    headerTitle: [styles.headerTitle, { color: colors.text }],
    localButton: [styles.localButton, { backgroundColor: colors.card }],
    searchContainer: styles.searchContainer,
    searchInput: [styles.searchInput, { backgroundColor: colors.inputBg, color: colors.text }],
    chatItem: styles.chatItem,
    avatar: styles.avatar,
    avatarFallback: [styles.avatarFallback, { backgroundColor: colors.primary }],
    avatarText: styles.avatarText,
    statusDot: styles.statusDot,
    chatContent: styles.chatContent,
    chatHeader: styles.chatHeader,
    chatName: [styles.chatName, { color: colors.text }],
    chatTime: [styles.chatTime, { color: colors.muted }],
    chatFooter: styles.chatFooter,
    chatPreview: styles.chatPreview,
    badge: [styles.badge, { backgroundColor: colors.primary }],
    badgeText: [styles.badgeText, { color: colors.onPrimary }],
    empty: styles.empty,
    emptyText: [styles.emptyText, { color: colors.textSecondary }],
    emptyHint: [styles.emptyHint, { color: colors.muted }],
    fab: [styles.fab, { backgroundColor: colors.primary }],
  };
}
