import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  Image,
  ActivityIndicator,
  Pressable,
} from "react-native";
import Animated, { FadeIn, FadeOut, SlideInUp, SlideOutDown } from "react-native-reanimated";
import { Search, Image as ImageIcon, X } from "lucide-react-native";
import { useThemeColors } from "../../hooks/use-theme";

const API_BASE = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

interface GifItem {
  id: string;
  url: string;
  preview: string;
}

interface GiphyPickerProps {
  onGifSelect: (url: string) => void;
}

export function GiphyPicker({ onGifSelect }: GiphyPickerProps) {
  const colors = useThemeColors();
  const [visible, setVisible] = useState(false);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<GifItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const requestRef = useRef(0);

  const load = (q: string) => {
    const id = ++requestRef.current;
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ type: "gifs", offset: "0" });
    if (q.trim()) {
      params.set("q", q);
    } else {
      params.set("trending", "1");
    }
    fetch(`${API_BASE}/api/giphy?${params}`)
      .then((r) => r.json())
      .then((data: { error?: string; items?: GifItem[] }) => {
        if (id !== requestRef.current) return;
        if (data.error) {
          setError(data.error);
          setItems([]);
        } else {
          setItems(data.items || []);
        }
      })
      .catch(() => {
        if (id === requestRef.current) {
          setError("Failed to load GIFs");
          setItems([]);
        }
      })
      .finally(() => {
        if (id === requestRef.current) setLoading(false);
      });
  };

  const handleOpen = () => {
    setVisible(true);
    load(query);
  };

  return (
    <>
      <TouchableOpacity onPress={handleOpen} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <ImageIcon size={22} color={colors.muted} />
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="none" onRequestClose={() => setVisible(false)}>
        <Pressable style={styles.overlay} activeOpacity={1} onPress={() => setVisible(false)}>
          <Animated.View
            entering={SlideInUp.duration(300)}
            exiting={SlideOutDown.duration(200)}
            style={[styles.container, { backgroundColor: colors.card, borderTopColor: colors.border }]}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.text }]}>GIFs</Text>
              <TouchableOpacity onPress={() => setVisible(false)}>
                <X size={20} color={colors.muted} />
              </TouchableOpacity>
            </View>

            <View style={[styles.searchBar, { backgroundColor: colors.inputBg }]}>
              <Search size={16} color={colors.muted} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Search GIFs..."
                placeholderTextColor={colors.muted}
                value={query}
                onChangeText={(t) => {
                  setQuery(t);
                  if (t.trim()) load(t);
                }}
              />
            </View>

            {error ? <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text> : null}

            {loading && items.length === 0 ? (
              <ActivityIndicator style={{ padding: 32 }} color={colors.primary} />
            ) : items.length === 0 && !error ? (
              <Text style={[styles.empty, { color: colors.muted }]}>No GIFs found</Text>
            ) : (
              <FlatList
                data={items}
                keyExtractor={(item) => item.id}
                numColumns={2}
                contentContainerStyle={styles.grid}
                renderItem={({ item }) => (
                  <Pressable
                    onPress={() => {
                      onGifSelect(item.url);
                      setVisible(false);
                    }}
                    style={styles.gifItem}
                  >
                    <Image source={{ uri: item.preview }} style={styles.gifImage} resizeMode="cover" />
                  </Pressable>
                )}
              />
            )}
          </Animated.View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  container: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "60%",
    paddingBottom: 34,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  title: { fontSize: 16, fontWeight: "600" },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    height: 40,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14 },
  error: { fontSize: 12, paddingHorizontal: 16, marginBottom: 4 },
  empty: { fontSize: 13, textAlign: "center", paddingVertical: 32 },
  grid: { paddingHorizontal: 16 },
  gifItem: {
    flex: 1,
    margin: 4,
    borderRadius: 12,
    overflow: "hidden",
    aspectRatio: 1.5,
  },
  gifImage: { width: "100%", height: "100%" },
});
