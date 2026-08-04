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
} from "react-native";
import { useMessageStore } from "../../stores/message-store";
import { useChatStore } from "../../stores/chat-store";
import { useAuthStore } from "../../stores/auth-store";
import { useSocket } from "../../hooks/use-socket";
import { Colors } from "../../theme/colors";
import { formatMessageTime, displayName } from "../../lib/utils";
import type { Message } from "../../types";

function MessageBubble({ message, isOwn }: { message: Message; isOwn: boolean }) {
  if (message.type === "SYSTEM") {
    return (
      <View style={styles.systemMessage}>
        <Text style={styles.systemText}>{message.content}</Text>
      </View>
    );
  }

  if (message.isDeleted) {
    return (
      <View style={[styles.messageBubble, isOwn ? styles.ownBubble : styles.otherBubble]}>
        <Text style={styles.deletedText}>Message deleted</Text>
      </View>
    );
  }

  return (
    <View style={[styles.messageBubble, isOwn ? styles.ownBubble : styles.otherBubble]}>
      {message.type === "IMAGE" && (
        <Text style={styles.mediaText}>📷 Photo</Text>
      )}
      {message.type === "VIDEO" && (
        <Text style={styles.mediaText}>🎬 Video</Text>
      )}
      {message.type === "AUDIO" && (
        <Text style={styles.mediaText}>🎤 Voice message</Text>
      )}
      {message.type === "FILE" && (
        <Text style={styles.mediaText}>📎 File</Text>
      )}
      {message.type === "STICKER" && (
        <Text style={styles.mediaText}>Sticker</Text>
      )}
      {message.type === "GIF" && (
        <Text style={styles.mediaText}>GIF</Text>
      )}
      {(message.type === "TEXT" || message.type === "CALL") && (
        <Text style={styles.messageText}>{message.content}</Text>
      )}
      <Text style={styles.messageTime}>{formatMessageTime(message.createdAt)}</Text>
    </View>
  );
}

export default function ChatScreen({ route, navigation }: any) {
  const { chatId, chatName } = route.params;
  const user = useAuthStore((s) => s.user);
  const { messagesByChat, isLoadingByChat, hasMoreByChat, loadMessages, loadMore } = useMessageStore();
  const chatMessages = messagesByChat[chatId] || [];
  const isLoading = isLoadingByChat[chatId];
  const hasMore = hasMoreByChat[chatId];
  const { joinChat, leaveChat, sendMessage, markRead, sendTyping } = useSocket();
  const [input, setInput] = useState("");
  const flatListRef = useRef<FlatList>(null);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    loadMessages(chatId);
    joinChat(chatId);
    markRead(chatId);

    return () => {
      leaveChat(chatId);
    };
  }, [chatId]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isSending) return;

    setIsSending(true);
    setInput("");
    try {
      sendMessage({ chatId, content: text, type: "TEXT" });
    } catch {}
    setIsSending(false);
  }, [input, chatId, isSending, sendMessage]);

  const handleTyping = useCallback(
    (text: string) => {
      setInput(text);
      if (text.length > 0) {
        sendTyping(chatId, true);
      } else {
        sendTyping(chatId, false);
      }
    },
    [chatId, sendTyping]
  );

  const renderItem = useCallback(
    ({ item }: { item: Message }) => (
      <MessageBubble message={item} isOwn={item.senderId === user?.id} />
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
      <FlatList
        ref={flatListRef}
        data={chatMessages}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        inverted
        contentContainerStyle={styles.messagesList}
        ListFooterComponent={
          isLoading ? (
            <ActivityIndicator style={{ padding: 16 }} color={Colors.dark.primary} />
          ) : hasMore ? (
            <TouchableOpacity
              style={styles.loadMore}
              onPress={() => loadMore(chatId)}
            >
              <Text style={styles.loadMoreText}>Load older messages</Text>
            </TouchableOpacity>
          ) : null
        }
        onEndReached={() => {}}
        onEndReachedThreshold={0.5}
      />

      <View style={styles.inputBar}>
        <TextInput
          style={styles.textInput}
          placeholder="Message..."
          placeholderTextColor={Colors.dark.muted}
          value={input}
          onChangeText={handleTyping}
          multiline
          maxLength={4000}
        />
        <TouchableOpacity
          style={[styles.sendButton, !input.trim() && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!input.trim() || isSending}
        >
          <Text style={styles.sendIcon}>↑</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  messagesList: {
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  messageBubble: {
    maxWidth: "78%",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    marginVertical: 3,
  },
  ownBubble: {
    backgroundColor: Colors.dark.primary,
    alignSelf: "flex-end",
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: Colors.dark.card,
    alignSelf: "flex-start",
    borderBottomLeftRadius: 4,
  },
  systemMessage: {
    alignItems: "center",
    paddingVertical: 8,
  },
  systemText: {
    color: Colors.dark.muted,
    fontSize: 13,
    fontStyle: "italic",
  },
  messageText: {
    color: "#fff",
    fontSize: 15,
    lineHeight: 20,
  },
  mediaText: {
    color: "#fff",
    fontSize: 14,
  },
  deletedText: {
    color: Colors.dark.muted,
    fontSize: 14,
    fontStyle: "italic",
  },
  messageTime: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 11,
    marginTop: 4,
    alignSelf: "flex-end",
  },
  loadMore: {
    alignItems: "center",
    paddingVertical: 12,
  },
  loadMoreText: {
    color: Colors.dark.primary,
    fontSize: 14,
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 8,
    paddingBottom: Platform.OS === "ios" ? 24 : 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.dark.border,
    backgroundColor: Colors.dark.background,
  },
  textInput: {
    flex: 1,
    backgroundColor: Colors.dark.inputBg,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: Colors.dark.text,
    maxHeight: 100,
    marginRight: 8,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.dark.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
  sendIcon: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
});
