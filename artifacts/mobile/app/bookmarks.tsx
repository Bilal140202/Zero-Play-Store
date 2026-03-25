import React from "react";
import { View, StyleSheet, Text, Pressable, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";

const BOOKMARKS = [
  { id: '1', page: 3, title: "Executive Summary", date: "Today" },
  { id: '2', page: 12, title: "Financial Overview Q3", date: "Yesterday" },
  { id: '3', page: 24, title: "Appendix & References", date: "Oct 12" }
];

export default function BookmarksScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.dark.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Bookmarks</Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {BOOKMARKS.length > 0 ? (
          <View style={styles.list}>
            {BOOKMARKS.map((b) => (
              <Pressable key={b.id} style={styles.bookmarkItem} onPress={() => router.back()}>
                <View style={styles.pageBadge}>
                  <Text style={styles.pageText}>{b.page}</Text>
                </View>
                <View style={styles.bookmarkInfo}>
                  <Text style={styles.bookmarkTitle}>{b.title}</Text>
                  <Text style={styles.bookmarkDate}>Saved {b.date}</Text>
                </View>
                <Pressable style={styles.moreBtn}>
                  <Ionicons name="ellipsis-vertical" size={20} color={Colors.dark.textSecondary} />
                </Pressable>
              </Pressable>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="bookmark-outline" size={64} color={Colors.dark.surface2} />
            <Text style={styles.emptyTitle}>No Bookmarks</Text>
            <Text style={styles.emptySub}>Tap the bookmark icon while viewing a page to save it here.</Text>
          </View>
        )}
      </ScrollView>
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
  content: {
    flexGrow: 1,
  },
  list: {
    padding: 16,
    gap: 12,
  },
  bookmarkItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.dark.surface,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  pageBadge: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "rgba(99, 102, 241, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  pageText: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: Colors.dark.accent,
  },
  bookmarkInfo: {
    flex: 1,
  },
  bookmarkTitle: {
    fontFamily: "Inter_500Medium",
    fontSize: 16,
    color: Colors.dark.textPrimary,
    marginBottom: 4,
  },
  bookmarkDate: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.dark.textSecondary,
  },
  moreBtn: {
    padding: 8,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    marginTop: 100,
  },
  emptyTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 20,
    color: Colors.dark.textPrimary,
    marginTop: 24,
    marginBottom: 8,
  },
  emptySub: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.dark.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
});
