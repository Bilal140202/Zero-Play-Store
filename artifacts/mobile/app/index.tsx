import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as DocumentPicker from "expo-document-picker";
import Colors from "@/constants/colors";
import { RecentFileCard } from "@/components/RecentFileCard";
import { ToolCard } from "@/components/ToolCard";

interface RecentFile {
  id: string;
  name: string;
  size: string;
  uri: string;
  pages: number;
  lastOpened: string;
}

const STORAGE_KEY = "pdfx_recent_files_v2";

function formatBytes(bytes: number): string {
  if (!bytes) return "Unknown size";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([]);
  const [picking, setPicking] = useState(false);
  const [activeTab, setActiveTab] = useState<"home" | "tools" | "recents" | "settings">("home");

  const loadFiles = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) setRecentFiles(JSON.parse(stored));
    } catch (e) {
      console.error("Failed to load recent files", e);
    }
  };

  const saveFiles = async (files: RecentFile[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(files));
    } catch (e) {
      console.error("Failed to save recent files", e);
    }
  };

  useEffect(() => { loadFiles(); }, []);

  const pickPDF = useCallback(async () => {
    if (picking) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPicking(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled || !result.assets?.length) { setPicking(false); return; }

      const asset = result.assets[0];
      const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
      const newFile: RecentFile = {
        id, name: asset.name, size: formatBytes(asset.size ?? 0),
        uri: asset.uri, pages: 1, lastOpened: new Date().toISOString(),
      };

      const updated = [newFile, ...recentFiles.filter((f) => f.uri !== asset.uri)].slice(0, 20);
      setRecentFiles(updated);
      await saveFiles(updated);

      router.push({ pathname: "/viewer", params: { fileId: id, fileName: asset.name, fileUri: asset.uri, pages: 1 } });
    } catch (e) {
      Alert.alert("Error", "Could not open the file. Please try again.");
      console.error(e);
    } finally {
      setPicking(false); }
  }, [picking, recentFiles, router]);

  const handleRecentPress = (file: RecentFile) => {
    const updated = recentFiles.map((f) =>
      f.id === file.id ? { ...f, lastOpened: new Date().toISOString() } : f
    );
    setRecentFiles(updated);
    saveFiles(updated);
    router.push({ pathname: "/viewer", params: { fileId: file.id, fileName: file.name, fileUri: file.uri, pages: file.pages } });
  };

  const handleFileAction = (file: RecentFile) => {
    Alert.alert(file.name, "Choose an action", [
      { text: "Open", onPress: () => handleRecentPress(file) },
      {
        text: "Remove from recents", style: "destructive",
        onPress: async () => {
          const updated = recentFiles.filter((f) => f.id !== file.id);
          setRecentFiles(updated);
          await saveFiles(updated);
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const topInset = Platform.OS === "web" ? 0 : insets.top;
  const botInset = Platform.OS === "web" ? 0 : insets.bottom;

  const handleTabPress = (tab: typeof activeTab) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTab(tab);
    if (tab === "settings") router.push("/settings");
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.dark.surface} />

      {/* ── TOP BAR ── */}
      <View style={[styles.topBar, { paddingTop: topInset + 10 }]}>
        <View style={styles.topBarLeft}>
          <Text style={styles.logo}>PDF<Text style={styles.logoAccent}>X</Text></Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>FREE</Text>
          </View>
        </View>
        <View style={styles.topBarRight}>
          <Pressable style={styles.iconBtn} onPress={() => router.push("/settings")}>
            <Ionicons name="settings-outline" size={22} color={Colors.dark.textSecondary} />
          </Pressable>
        </View>
      </View>

      {/* ── SCROLL CONTENT ── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Open PDF card */}
        <Pressable
          style={({ pressed }) => [
            styles.uploadCard,
            pressed && styles.uploadCardPressed,
            picking && styles.uploadCardDisabled,
          ]}
          onPress={pickPDF}
          disabled={picking}
        >
          <View style={styles.uploadIconRing}>
            <Ionicons
              name={picking ? "hourglass-outline" : "folder-open-outline"}
              size={36}
              color={Colors.dark.accent}
            />
          </View>
          <Text style={styles.uploadTitle}>{picking ? "Opening…" : "Open PDF"}</Text>
          <Text style={styles.uploadSubtitle}>
            {Platform.OS === "web"
              ? "Tap to choose a PDF from your device"
              : "Browse files, Downloads, WhatsApp or cloud"}
          </Text>
        </Pressable>

        {/* Recent files */}
        {recentFiles.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Files</Text>
              <Pressable onPress={() => {
                Alert.alert("Clear recents", "Remove all files from your recent list?", [
                  { text: "Clear all", style: "destructive", onPress: async () => { setRecentFiles([]); await saveFiles([]); } },
                  { text: "Cancel", style: "cancel" },
                ]);
              }}>
                <Text style={styles.clearBtn}>Clear all</Text>
              </Pressable>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recentList}>
              {recentFiles.map((file) => (
                <RecentFileCard
                  key={file.id} {...file}
                  onPress={() => handleRecentPress(file)}
                  onLongPress={() => handleFileAction(file)}
                />
              ))}
            </ScrollView>
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="documents-outline" size={56} color={Colors.dark.border} />
            <Text style={styles.emptyTitle}>No recent files</Text>
            <Text style={styles.emptySub}>Tap "Open PDF" above to pick a file from your device</Text>
          </View>
        )}

        {/* Tools grid */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tools</Text>
          <View style={styles.toolsGrid}>
            <ToolCard icon="copy-outline"        label="Merge PDFs"    onPress={() => router.push("/merge")} />
            <ToolCard icon="cut-outline"         label="Split PDF"     onPress={() => router.push("/split")} />
            <ToolCard icon="archive-outline"     label="Compress"      onPress={() => router.push("/compress")} />
            <ToolCard icon="create-outline"      label="Sign"          onPress={() => router.push("/sign")} />
            <ToolCard icon="lock-closed-outline" label="Protect"       onPress={() => router.push("/protect")} />
            <ToolCard icon="water-outline"       label="Watermark"     onPress={() => router.push("/watermark")} />
            <ToolCard icon="documents-outline"   label="Page Manager"  onPress={() => router.push("/pages")} />
            <ToolCard icon="list-outline"        label="Fill Form"     onPress={() => router.push("/forms")} />
            <ToolCard icon="bookmark-outline"    label="Bookmarks"     onPress={() => router.push("/bookmarks")} />
          </View>
        </View>

        {/* Tip card */}
        <View style={styles.tipCard}>
          <Ionicons name="shield-checkmark-outline" size={20} color={Colors.dark.success} />
          <View style={styles.tipContent}>
            <Text style={styles.tipTitle}>100% Private</Text>
            <Text style={styles.tipText}>
              Your files never leave your device. No uploads, no cloud, no account needed.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* ── BOTTOM NAV BAR ── */}
      <View style={[styles.bottomBar, { paddingBottom: botInset + 6 }]}>
        <Pressable style={styles.tabItem} onPress={() => handleTabPress("home")}>
          <Ionicons
            name={activeTab === "home" ? "home" : "home-outline"}
            size={24}
            color={activeTab === "home" ? Colors.dark.accent : Colors.dark.textSecondary}
          />
          <Text style={[styles.tabLabel, activeTab === "home" && styles.tabLabelActive]}>Home</Text>
        </Pressable>

        <Pressable style={styles.tabItem} onPress={() => { handleTabPress("tools"); }}>
          <Ionicons
            name={activeTab === "tools" ? "build" : "build-outline"}
            size={24}
            color={activeTab === "tools" ? Colors.dark.accent : Colors.dark.textSecondary}
          />
          <Text style={[styles.tabLabel, activeTab === "tools" && styles.tabLabelActive]}>Tools</Text>
        </Pressable>

        <Pressable style={styles.tabOpenBtn} onPress={pickPDF} disabled={picking}>
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </Pressable>

        <Pressable style={styles.tabItem} onPress={() => router.push("/bookmarks")}>
          <Ionicons name="bookmark-outline" size={24} color={Colors.dark.textSecondary} />
          <Text style={styles.tabLabel}>Saved</Text>
        </Pressable>

        <Pressable style={styles.tabItem} onPress={() => { handleTabPress("settings"); }}>
          <Ionicons
            name={activeTab === "settings" ? "settings" : "settings-outline"}
            size={24}
            color={activeTab === "settings" ? Colors.dark.accent : Colors.dark.textSecondary}
          />
          <Text style={[styles.tabLabel, activeTab === "settings" && styles.tabLabelActive]}>Settings</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },

  // ── Top Bar ──
  topBar: {
    backgroundColor: Colors.dark.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  topBarLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  topBarRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  logo: {
    fontFamily: "Inter_700Bold",
    fontSize: 26,
    color: Colors.dark.textPrimary,
    letterSpacing: -0.5,
  },
  logoAccent: {
    color: Colors.dark.accent,
  },
  badge: {
    backgroundColor: Colors.dark.accent + "22",
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: Colors.dark.accent + "44",
  },
  badgeText: {
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    color: Colors.dark.accent,
    letterSpacing: 0.5,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Scroll ──
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 16,
    gap: 28,
  },

  // ── Upload card ──
  uploadCard: {
    backgroundColor: Colors.dark.surface,
    borderWidth: 2,
    borderColor: Colors.dark.accent + "55",
    borderStyle: "dashed",
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    gap: 12,
  },
  uploadCardPressed: { opacity: 0.75, backgroundColor: Colors.dark.surface2 },
  uploadCardDisabled: { opacity: 0.5 },
  uploadIconRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.dark.accent + "22",
    alignItems: "center",
    justifyContent: "center",
  },
  uploadTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    color: Colors.dark.textPrimary,
  },
  uploadSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.dark.textSecondary,
    textAlign: "center",
  },

  // ── Section ──
  section: { gap: 16 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 18,
    color: Colors.dark.textPrimary,
  },
  clearBtn: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: Colors.dark.textSecondary,
  },
  recentList: { gap: 12, paddingRight: 8 },

  // ── Empty state ──
  emptyState: { alignItems: "center", paddingVertical: 24, gap: 12 },
  emptyTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: Colors.dark.textSecondary,
  },
  emptySub: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.dark.border,
    textAlign: "center",
    paddingHorizontal: 24,
  },

  // ── Tools grid ──
  toolsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 14 },

  // ── Tip card ──
  tipCard: {
    flexDirection: "row",
    backgroundColor: "rgba(16,185,129,0.08)",
    padding: 16,
    borderRadius: 16,
    gap: 12,
    alignItems: "flex-start",
    borderWidth: 1,
    borderColor: "rgba(16,185,129,0.18)",
  },
  tipContent: { flex: 1 },
  tipTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: Colors.dark.success,
    marginBottom: 4,
  },
  tipText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.dark.textPrimary,
    lineHeight: 18,
  },

  // ── Bottom Nav Bar ──
  bottomBar: {
    backgroundColor: Colors.dark.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingTop: 10,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    gap: 3,
  },
  tabLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 10,
    color: Colors.dark.textSecondary,
  },
  tabLabelActive: {
    color: Colors.dark.accent,
  },
  tabOpenBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.dark.accent,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -14,
    shadowColor: Colors.dark.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
});
