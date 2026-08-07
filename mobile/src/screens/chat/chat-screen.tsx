import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Pressable,
} from "react-native";
import Animated, {
  FadeInDown,
  FadeInUp,
  FadeIn,
  FadeOut,
  SlideInRight,
  SlideInLeft,
  ZoomIn,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  interpolate,
  Easing,
} from "react-native-reanimated";
import { useMessageStore } from "../../stores/message-store";
import { useChatStore } from "../../stores/chat-store";
import { useAuthStore } from "../../stores/auth-store";
import { useSocket } from "../../hooks/use-socket";
import { useThemeColors, useThemedStyles } from "../../hooks/use-theme";
import type { ThemeColors } from "../../theme/colors";
import { formatMessageTime } from "../../lib/utils";
import type { Message, Chat } from "../../types";
import { ArrowUp } from "lucide-react-native";
import { MediaMessage } from "../../components/chat/media-message";
import { MediaPicker } from "../../components/chat/media-picker";
import { VoiceRecorder } from "../../components/chat/voice-recorder";
import { EmojiPicker } from "../../components/chat/emoji-picker";
import { GiphyPicker } from "../../components/chat/giphy-picker";
import { uploadApi } from "../../api/upload";
import { chatsApi } from "../../api/chats";
import {
  isEncryptedChat,
  decryptPrivateChatMessages,
  encryptForPrivateChat,
} from "../../lib/e2ee";

const EMPTY_ARRAY: string[] = [];

function TypingDots({ color }: { color: string }) {
  const dot1 = useSharedValue(0);
  const dot2 = useSharedValue(0);
  const dot3 = useSharedValue(0);

  useEffect(() => {
    const animate = (sv: any, delay: number) => {
      sv.value = withRepeat(
        withSequence(
          withTiming(-4, { duration: 300, easing: Easing.ease }),
          withTiming(0, { duration: 300, easing: Easing.ease })
        ),
        -1,
        false
      );
    };
    animate(dot1, 0);
    animate(dot2, 150);
    animate(dot3, 300);
  }, []);

  const s1 = useAnimatedStyle(() => ({ transform: [{ translateY: dot1.value }] }));
  const s2 = useAnimatedStyle(() => ({ transform: [{ translateY: dot2.value }] }));
  const s3 = useAnimatedStyle(() => ({ transform: [{ translateY: dot3.value }] }));

  return (
    <View style={typingStyles.container}>
      <Animated.View style={[typingStyles.dot, { backgroundColor: color }, s1]} />
      <Animated.View style={[typingStyles.dot, { backgroundColor: color }, s2]} />
      <Animated.View style={[typingStyles.dot, { backgroundColor: color }, s3]} />
    </View>
  );
}

const typingStyles = StyleSheet.create({
  container: { flexDirection: "row", alignItems: "center", gap: 4, height: 20 },
  dot: { width: 6, height: 6, borderRadius: 3 },
});

function MessageBubble({ message, isOwn, index }: { message: Message; isOwn: boolean; index: number }) {
  const styles = useThemedStyles(makeStyles);
  const colors = useThemeColors();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.96, { damping: 15, stiffness: 400 });
  };
  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
  };

  if (message.type === "SYSTEM") {
    return (
      <Animated.View entering={FadeIn.duration(300)} style={styles.systemMessage}>
        <Text style={[styles.systemText, { color: colors.muted }]}>{message.content}</Text>
      </Animated.View>
    );
  }

  if (message.isDeleted) {
    return (
      <Animated.View
        entering={FadeIn.duration(200)}
        style={[styles.messageBubble, isOwn ? styles.ownBubble : styles.otherBubble]}
      >
        <Text style={[styles.deletedText, { color: isOwn ? "rgba(255,255,255,0.5)" : colors.muted }]}>
          Message deleted
        </Text>
      </Animated.View>
    );
  }

  const isMedia = ["IMAGE", "VIDEO", "AUDIO", "GIF", "STICKER", "FILE"].includes(message.type);
  const hasText = message.content && message.content.trim().length > 0;

  return (
    <Animated.View
      entering={(isOwn ? SlideInRight : SlideInLeft).delay(index * 30).duration(300)}
    >
      <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut}>
        <Animated.View
          style={[
            styles.messageBubble,
            isOwn ? styles.ownBubble : styles.otherBubble,
            isMedia && styles.mediaBubble,
            animatedStyle,
          ]}
        >
          {isMedia && <MediaMessage message={message} isOwn={isOwn} />}
          {hasText && (
            <Text style={[styles.messageText, { color: isOwn ? "#fff" : colors.text }]}>
              {message.content}
            </Text>
          )}
          <Text style={[styles.messageTime, { color: isOwn ? "rgba(255,255,255,0.5)" : colors.muted }]}>
            {formatMessageTime(message.createdAt)}
          </Text>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

function SendButton({ onPress, disabled, colors }: { onPress: () => void; disabled: boolean; colors: ThemeColors }) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.85, { damping: 15, stiffness: 500 });
  };
  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 500 });
  };

  return (
    <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut} onPress={onPress} disabled={disabled}>
      <Animated.View
        style={[
          styles.sendButton,
          { backgroundColor: disabled ? colors.muted : colors.primary },
          animatedStyle,
        ]}
      >
        <ArrowUp size={18} color={colors.onPrimary} />
      </Animated.View>
    </Pressable>
  );
}

export default function ChatScreen({ route, navigation }: any) {
  const { chatId, chatName } = route.params;
  const user = useAuthStore((s) => s.user);
  const colors = useThemeColors();
  const styles = useThemedStyles(makeStyles);
  const chatMessages = useMessageStore((s) => s.messagesByChat[chatId] ?? EMPTY_ARRAY);
  const isLoading = useMessageStore((s) => s.isLoadingByChat[chatId] ?? false);
  const hasMore = useMessageStore((s) => s.hasMoreByChat[chatId] ?? false);
  const loadMessages = useMessageStore((s) => s.loadMessages);
  const loadMore = useMessageStore((s) => s.loadMore);
  const { joinChat, leaveChat, sendMessage, markRead, sendTyping } = useSocket();
  const deleteChat = useChatStore((s) => s.deleteChat);
  const typingUserIds = useChatStore((s) => s.chats.find((c) => c.id === chatId)?.typingUserIds ?? EMPTY_ARRAY);
  const [input, setInput] = useState("");
  const flatListRef = useRef<FlatList>(null);
  const [isSending, setIsSending] = useState(false);
  const [activeChat, setActiveChat] = useState<(Chat & { members: any[] }) | null>(null);

  useEffect(() => {
    chatsApi.get(chatId).then((res) => {
      setActiveChat(res.chat);
    }).catch(() => {});
  }, [chatId]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      await loadMessages(chatId);
      if (cancelled || !activeChat || !user?.id) return;
      const msgs = useMessageStore.getState().messagesByChat[chatId] || [];
      if (isEncryptedChat(activeChat)) {
        const decrypted = await decryptPrivateChatMessages(activeChat, user.id, msgs);
        if (!cancelled) {
          useMessageStore.setState((s) => ({
            messagesByChat: { ...s.messagesByChat, [chatId]: decrypted },
          }));
        }
      }
    }
    load();
    joinChat(chatId);
    markRead(chatId);
    return () => { cancelled = true; leaveChat(chatId); };
  }, [chatId, activeChat?.id]);

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
          <TouchableOpacity
            onPress={() => {
              Alert.alert("Delete chat", "Delete this conversation?", [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Delete",
                  style: "destructive",
                  onPress: () => {
                    void deleteChat(chatId)
                      .then(() => navigation.goBack())
                      .catch((err: any) => Alert.alert("Error", err.message || "Could not delete chat"));
                  },
                },
              ]);
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={{ color: colors.destructive, fontSize: 15 }}>Delete</Text>
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, chatId, deleteChat, colors]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isSending) return;
    setIsSending(true);
    setInput("");
    try {
      let content = text;
      let isEncrypted = false;
      if (activeChat && user?.id && isEncryptedChat(activeChat)) {
        try {
          content = await encryptForPrivateChat(activeChat, user.id, text);
          isEncrypted = true;
        } catch {}
      }
      sendMessage({ chatId, content, type: "TEXT", isEncrypted });
    } catch {}
    setIsSending(false);
  }, [input, chatId, isSending, sendMessage, activeChat, user?.id]);

  const handleMediaSend = useCallback(
    async (uri: string, type: "image" | "video") => {
      if (isSending) return;
      setIsSending(true);
      try {
        const filename = uri.split("/").pop() || `media-${Date.now()}`;
        const ext = filename.split(".").pop()?.toLowerCase() || "";
        const mimeType = type === "video" ? `video/${ext}` : `image/${ext}`;
        await uploadApi.uploadFile(uri, filename, mimeType);
        sendMessage({ chatId, content: "", type: type === "video" ? "VIDEO" : "IMAGE" });
      } catch (err: any) {
        Alert.alert("Error", err.message || "Failed to send media");
      }
      setIsSending(false);
    },
    [chatId, isSending, sendMessage]
  );

  const handleVoiceSend = useCallback(
    async (uri: string, duration: number) => {
      if (isSending) return;
      setIsSending(true);
      try {
        await uploadApi.uploadVoice(uri, duration);
        sendMessage({ chatId, content: "", type: "AUDIO" });
      } catch (err: any) {
        Alert.alert("Error", err.message || "Failed to send voice message");
      }
      setIsSending(false);
    },
    [chatId, isSending, sendMessage]
  );

  const handleGifSend = useCallback(
    (url: string) => {
      if (isSending) return;
      sendMessage({ chatId, content: url, type: "GIF" });
    },
    [chatId, isSending, sendMessage]
  );

  const handleEmojiSelect = useCallback((emoji: string) => {
    setInput((prev) => prev + emoji);
  }, []);

  const handleTyping = useCallback(
    (text: string) => {
      setInput(text);
      sendTyping(chatId, text.length > 0);
    },
    [chatId, sendTyping]
  );

  const handleLoadMore = useCallback(async () => {
    await loadMore(chatId);
    if (activeChat && user?.id && isEncryptedChat(activeChat)) {
      const msgs = useMessageStore.getState().messagesByChat[chatId] || [];
      const decrypted = await decryptPrivateChatMessages(activeChat, user.id, msgs);
      useMessageStore.setState((s) => ({
        messagesByChat: { ...s.messagesByChat, [chatId]: decrypted },
      }));
    }
  }, [chatId, activeChat, user?.id]);

  const renderItem = useCallback(
    ({ item, index }: { item: Message; index: number }) => (
      <MessageBubble message={item} isOwn={item.senderId === user?.id} index={index} />
    ),
    [user?.id]
  );

  const keyExtractor = useCallback((item: Message) => item.id, []);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      <View style={[styles.gradientOverlay, { backgroundColor: colors.background }]} />

      <FlatList
        ref={flatListRef}
        data={chatMessages}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        inverted
        contentContainerStyle={styles.messagesList}
        ListFooterComponent={
          <>
            {typingUserIds.length > 0 && (
              <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} style={styles.typingContainer}>
                <View style={[styles.typingBubble, { backgroundColor: colors.card }]}>
                  <TypingDots color={colors.muted} />
                </View>
              </Animated.View>
            )}
            {isLoading ? (
              <ActivityIndicator style={{ padding: 16 }} color={colors.primary} />
            ) : hasMore ? (
              <TouchableOpacity style={styles.loadMore} onPress={handleLoadMore}>
                <Text style={[styles.loadMoreText, { color: colors.primary }]}>Load older messages</Text>
              </TouchableOpacity>
            ) : null}
          </>
        }
        onEndReached={() => {}}
        onEndReachedThreshold={0.5}
      />

      <Animated.View
        entering={FadeInUp.duration(300)}
        style={[styles.inputBar, { borderTopColor: colors.border, backgroundColor: colors.background }]}
      >
        <MediaPicker onPick={handleMediaSend} />
        <VoiceRecorder onRecord={handleVoiceSend} />
        <EmojiPicker onEmojiSelect={handleEmojiSelect} />
        <GiphyPicker onGifSelect={handleGifSend} />
        <TextInput
          style={[styles.textInput, { backgroundColor: colors.inputBg, color: colors.text }]}
          placeholder="Message..."
          placeholderTextColor={colors.muted}
          value={input}
          onChangeText={handleTyping}
          multiline
          maxLength={4000}
        />
        <SendButton onPress={handleSend} disabled={!input.trim() || isSending} colors={colors} />
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradientOverlay: { ...StyleSheet.absoluteFillObject },
  messagesList: { paddingHorizontal: 12, paddingTop: 8 },
  messageBubble: {
    maxWidth: "78%",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    marginVertical: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  ownBubble: {
    backgroundColor: "#007AFF",
    alignSelf: "flex-end",
    borderBottomRightRadius: 6,
  },
  otherBubble: {
    backgroundColor: "#F2F2F7",
    alignSelf: "flex-start",
    borderBottomLeftRadius: 6,
  },
  mediaBubble: { paddingHorizontal: 6, paddingVertical: 6 },
  systemMessage: { alignItems: "center", paddingVertical: 8 },
  systemText: { fontSize: 13, fontStyle: "italic" },
  messageText: { fontSize: 15, lineHeight: 20, paddingHorizontal: 4 },
  deletedText: { fontSize: 14, fontStyle: "italic" },
  messageTime: { fontSize: 11, marginTop: 4, alignSelf: "flex-end" },
  loadMore: { alignItems: "center", paddingVertical: 12 },
  loadMoreText: { fontSize: 14 },
  typingContainer: { paddingVertical: 4, paddingHorizontal: 4 },
  typingBubble: {
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderBottomLeftRadius: 6,
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 10,
    paddingVertical: 8,
    paddingBottom: Platform.OS === "ios" ? 24 : 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  textInput: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
});

function makeStyles(colors: ThemeColors) {
  return {
    container: styles.container,
    gradientOverlay: styles.gradientOverlay,
    messagesList: styles.messagesList,
    messageBubble: styles.messageBubble,
    ownBubble: [styles.ownBubble, { backgroundColor: colors.primary }],
    otherBubble: [styles.otherBubble, { backgroundColor: colors.card }],
    mediaBubble: styles.mediaBubble,
    systemMessage: styles.systemMessage,
    systemText: styles.systemText,
    messageText: styles.messageText,
    deletedText: styles.deletedText,
    messageTime: styles.messageTime,
    loadMore: styles.loadMore,
    loadMoreText: styles.loadMoreText,
    typingContainer: styles.typingContainer,
    typingBubble: [styles.typingBubble, { backgroundColor: colors.card }],
    inputBar: styles.inputBar,
    textInput: styles.textInput,
    sendButton: styles.sendButton,
  };
}
