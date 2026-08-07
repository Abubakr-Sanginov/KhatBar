import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
} from "react-native";
import { Smile } from "lucide-react-native";
import { useThemeColors } from "../../hooks/use-theme";

const EMOJI_CATEGORIES = [
  {
    name: "Smileys",
    emojis: ["😀", "😂", "🥹", "😊", "😍", "🤩", "😎", "🤗", "😶", "😤", "😱", "🥳"],
  },
  {
    name: "Gestures",
    emojis: ["👍", "👎", "👏", "🙌", "🤝", "💪", "✌️", "🤟", "👋", "🖐️", "🤙", "👌"],
  },
  {
    name: "Hearts",
    emojis: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "💝", "💖", "💗", "💘"],
  },
  {
    name: "Objects",
    emojis: ["🎉", "🎊", "✨", "🔥", "⭐", "💯", "🎯", "🎁", "💎", "🔮", "📎", "🖇️"],
  },
];

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
}

export function EmojiPicker({ onEmojiSelect }: EmojiPickerProps) {
  const colors = useThemeColors();
  const [visible, setVisible] = useState(false);
  const [category, setCategory] = useState(0);

  return (
    <>
      <TouchableOpacity
        onPress={() => setVisible(true)}
        style={styles.trigger}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Smile size={22} color={colors.muted} />
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={() => setVisible(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setVisible(false)}
        >
          <View
            style={[styles.container, { backgroundColor: colors.card, borderTopColor: colors.border }]}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.categories}>
              {EMOJI_CATEGORIES.map((cat, i) => (
                <TouchableOpacity
                  key={cat.name}
                  onPress={() => setCategory(i)}
                  style={[
                    styles.categoryTab,
                    {
                      backgroundColor: category === i ? colors.primary : "transparent",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.categoryText,
                      {
                        color: category === i ? colors.onPrimary : colors.muted,
                      },
                    ]}
                  >
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <ScrollView style={styles.emojiGrid} contentContainerStyle={styles.emojiGridContent}>
              {EMOJI_CATEGORIES[category].emojis.map((emoji) => (
                <TouchableOpacity
                  key={emoji}
                  onPress={() => {
                    onEmojiSelect(emoji);
                    setVisible(false);
                  }}
                  style={styles.emojiButton}
                >
                  <Text style={styles.emoji}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    padding: 4,
  },
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  container: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 34,
    maxHeight: "45%",
  },
  categories: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingTop: 12,
    gap: 6,
  },
  categoryTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  categoryText: {
    fontSize: 12,
    fontWeight: "600",
  },
  emojiGrid: {
    marginTop: 8,
  },
  emojiGridContent: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 12,
  },
  emojiButton: {
    width: "16.66%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emoji: {
    fontSize: 28,
  },
});
