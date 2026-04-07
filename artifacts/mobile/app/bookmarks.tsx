import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";

export const BOOKMARKS_KEY = "pdfx_bookmarks_v1";

export interface Bookmark {
  id: string;
  fileUri: string;
  fileName: string;
  date: string;
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    const diff = (Date.now() - d.getTime()) / 1000;
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 86400 * 2) return "Yesterday";
    return d.toLocaleDateString();
  } catch {
    return "";
  }
}

export default function BookmarksScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);

  const loadBookmarks = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(BOOKMARKS_KEY);
      setBookmarks(stored ? JSON.parse(stored) : []);
    } catch {
      setBookmarks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBookmarks();
  }, [loadBookmarks]);

  const removeBookmark = async (id: string) => {
    const updated = bookmarks.filter((b) => b.id !== id);
    setBookmarks(updated);
    await AsyncStorage.setItem(BOOKMARKS_KEY, JSON.stringify(updated));
    if (Platform.OS !== "web")
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handlePress = (b: Bookmark) => {
    router.push({
      pathname: "/viewer",
      params: { fileUri: b.fileUri, fileName: b.fileName },
    });
  };

  const handleLongPress = (b: Bookmark) => {
    if (Platform.OS !== "web")
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(b.fileName, "Remove this bookmark?", [
      {
        text: "Remove",
        style: "destructive",
        onPress: () => removeBookmark(b.id),
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const clearAll = () => {
    Alert.alert("Clear All", "Remove all bookmarks?", [
      {
        text: "Clear All",
        style: "destructive",
        onPress: async () => {
          setBookmarks([]);
          await AsyncStorage.setItem(BOOKMARKS_KEY, "[]");
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.dark.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Bookmarks</Text>
        {bookmarks.length > 0 ? (
          <Pressable onPress={clearAll} style={styles.iconBtn}>
            <Ionicons name="trash-outline" size={20} color={Colors.dark.warning} />
          </Pressable>
        ) : (
          <View style={{ width: 48 }} />
        )}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.dark.accent} />
        </View>
      ) : bookmarks.length > 0 ? (
        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        >
          {bookmarks.map((b) => (
            <Pressable
              key={b.id}
              style={styles.item}
              onPress={() => handlePress(b)}
              onLongPress={() => handleLongPress(b)}
            >
              <View style={styles.iconWrap}>
                <Ionicons name="bookmark" size={22} color={Colors.dark.accent} />
              </View>
              <View style={styles.info}>
                <Text style={styles.fileName} numberOfLines={2}>
                  {b.fileName}
                </Text>
                <Text style={styles.dateText}>Saved {formatDate(b.date)}</Text>
              </View>
              <Pressable
                style={styles.removeBtn}
                onPress={() => removeBookmark(b.id)}
                hitSlop={10}
              >
                <Ionicons
                  name="close-circle"
                  size={20}
                  color={Colors.dark.textSecondary}
                />
              </Pressable>
            </Pressable>
          ))}
          <View style={{ height: insets.bottom + 16 }} />
        </ScrollView>
      ) : (
        <View style={styles.center}>
          <Ionicons
            name="bookmark-outline"
            size={64}
            color={Colors.dark.border}
          />
          <Text style={styles.emptyTitle}>No Bookmarks Yet</Text>
          <Text style={styles.emptySub}>
            Open a PDF and tap the bookmark icon in the top bar to save it
            here.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  iconBtn: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 18,
    color: Colors.dark.textPrimary,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    gap: 16,
  },
  emptyTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 20,
    color: Colors.dark.textPrimary,
  },
  emptySub: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.dark.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  list: {
    padding: 16,
    gap: 10,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.dark.surface,
    borderRadius: 14,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: Colors.dark.accent + "18",
    alignItems: "center",
    justifyContent: "center",
  },
  info: {
    flex: 1,
    gap: 4,
  },
  fileName: {
    fontFamily: "Inter_500Medium",
    fontSize: 15,
    color: Colors.dark.textPrimary,
    lineHeight: 20,
  },
  dateText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.dark.textSecondary,
  },
  removeBtn: {
    padding: 4,
  },
});
