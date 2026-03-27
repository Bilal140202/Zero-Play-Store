import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
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

  const loadFiles = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        setRecentFiles(JSON.parse(stored));
      }
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

  useEffect(() => {
    loadFiles();
  }, []);

  const pickPDF = useCallback(async () => {
    if (picking) return;
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setPicking(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled || !result.assets?.length) {
        setPicking(false);
        return;
      }

      const asset = result.assets[0];
      const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
      const newFile: RecentFile = {
        id,
        name: asset.name,
        size: formatBytes(asset.size ?? 0),
        uri: asset.uri,
        pages: 1,
        lastOpened: new Date().toISOString(),
      };

      const updated = [
        newFile,
        ...recentFiles.filter((f) => f.uri !== asset.uri),
      ].slice(0, 20);

      setRecentFiles(updated);
      await saveFiles(updated);

      router.push({
        pathname: "/viewer",
        params: { fileId: id, fileName: asset.name, fileUri: asset.uri, pages: 1 },
      });
    } catch (e) {
      Alert.alert("Error", "Could not open the file. Please try again.");
      console.error(e);
    } finally {
      setPicking(false);
    }
  }, [picking, recentFiles, router]);

  const handleRecentPress = (file: RecentFile) => {
    const updated = recentFiles.map((f) =>
      f.id === file.id ? { ...f, lastOpened: new Date().toISOString() } : f
    );
    setRecentFiles(updated);
    saveFiles(updated);
    router.push({
      pathname: "/viewer",
      params: { fileId: file.id, fileName: file.name, fileUri: file.uri, pages: file.pages },
    });
  };

  const handleFileAction = (file: RecentFile) => {
    Alert.alert(file.name, "Choose an action", [
      { text: "Open", onPress: () => handleRecentPress(file) },
      {
        text: "Remove from recents",
        style: "destructive",
        onPress: async () => {
          const updated = recentFiles.filter((f) => f.id !== file.id);
          setRecentFiles(updated);
          await saveFiles(updated);
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const topPad =
    Platform.OS === "web" ? 67 : Math.max(insets.top, 24);
  const botPad =
    Platform.OS === "web" ? 34 : Math.max(insets.bottom, 16);

  return (
    <View
      style={[
        styles.container,
        { paddingTop: topPad, paddingBottom: botPad },
      ]}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.logo}>
            PDF<Text style={styles.logoAccent}>X</Text>
          </Text>
          <Text style={styles.statsRow}>
            {recentFiles.length} file{recentFiles.length !== 1 ? "s" : ""} · Free · No internet needed
          </Text>
        </View>
        <Pressable
          onPress={() => router.push("/settings")}
          style={styles.settingsBtn}
        >
          <Ionicons
            name="settings-outline"
            size={24}
            color={Colors.dark.textPrimary}
          />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          style={({ pressed }) => [
            styles.uploadCard,
            pressed && styles.uploadCardPressed,
            picking && styles.uploadCardDisabled,
          ]}
          onPress={pickPDF}
          disabled={picking}
        >
          <View style={styles.uploadIconContainer}>
            <Ionicons
              name={picking ? "hourglass-outline" : "folder-open-outline"}
              size={36}
              color={Colors.dark.accent}
            />
          </View>
          <Text style={styles.uploadTitle}>
            {picking ? "Opening…" : "Open PDF"}
          </Text>
          <Text style={styles.uploadSubtitle}>
            {Platform.OS === "web"
              ? "Tap to choose a PDF from your device"
              : "Browse files, Downloads or cloud storage"}
          </Text>
        </Pressable>

        {recentFiles.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Files</Text>
              <Pressable
                onPress={() => {
                  Alert.alert(
                    "Clear recents",
                    "Remove all files from your recent list? (Files on your device are not deleted)",
                    [
                      {
                        text: "Clear all",
                        style: "destructive",
                        onPress: async () => {
                          setRecentFiles([]);
                          await saveFiles([]);
                        },
                      },
                      { text: "Cancel", style: "cancel" },
                    ]
                  );
                }}
              >
                <Text style={styles.clearBtn}>Clear all</Text>
              </Pressable>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.recentList}
            >
              {recentFiles.map((file) => (
                <RecentFileCard
                  key={file.id}
                  {...file}
                  onPress={() => handleRecentPress(file)}
                  onLongPress={() => handleFileAction(file)}
                />
              ))}
            </ScrollView>
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons
              name="documents-outline"
              size={56}
              color={Colors.dark.border}
            />
            <Text style={styles.emptyTitle}>No recent files</Text>
            <Text style={styles.emptySub}>
              Tap "Open PDF" above to pick a file from your device
            </Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tools</Text>
          <View style={styles.toolsGrid}>
            <ToolCard icon="copy-outline" label="Merge PDFs" onPress={() => router.push("/merge")} />
            <ToolCard icon="cut-outline" label="Split PDF" onPress={() => router.push("/split")} />
            <ToolCard icon="archive-outline" label="Compress" onPress={() => router.push("/compress")} />
            <ToolCard icon="create-outline" label="Sign" onPress={() => router.push("/sign")} />
            <ToolCard icon="lock-closed-outline" label="Protect" onPress={() => router.push("/protect")} />
            <ToolCard icon="water-outline" label="Watermark" onPress={() => router.push("/watermark")} />
            <ToolCard icon="documents-outline" label="Page Manager" onPress={() => router.push("/pages")} />
            <ToolCard icon="list-outline" label="Fill Form" onPress={() => router.push("/forms")} />
            <ToolCard icon="bookmark-outline" label="Bookmarks" onPress={() => router.push("/bookmarks")} />
          </View>
        </View>

        <View style={styles.tipCard}>
          <Ionicons name="bulb-outline" size={20} color={Colors.dark.warning} />
          <View style={styles.tipContent}>
            <Text style={styles.tipTitle}>Tip</Text>
            <Text style={styles.tipText}>
              Long-press any recent file to remove it from history. Your files stay safe on your device.
            </Text>
          </View>
        </View>
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
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  logo: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    color: Colors.dark.textPrimary,
  },
  logoAccent: {
    color: Colors.dark.accent,
  },
  statsRow: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: Colors.dark.textSecondary,
    marginTop: 4,
  },
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.dark.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 48,
    gap: 32,
  },
  uploadCard: {
    backgroundColor: Colors.dark.surface,
    borderWidth: 2,
    borderColor: Colors.dark.accent + "55",
    borderStyle: "dashed",
    borderRadius: 24,
    padding: 36,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  uploadCardPressed: {
    opacity: 0.75,
    backgroundColor: Colors.dark.surface2,
  },
  uploadCardDisabled: {
    opacity: 0.5,
  },
  uploadIconContainer: {
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
  section: {
    gap: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 20,
    color: Colors.dark.textPrimary,
  },
  clearBtn: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: Colors.dark.textSecondary,
  },
  recentList: {
    gap: 12,
    paddingRight: 8,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 12,
  },
  emptyTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 18,
    color: Colors.dark.textSecondary,
  },
  emptySub: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.dark.border,
    textAlign: "center",
    paddingHorizontal: 24,
    lineHeight: 20,
  },
  toolsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  tipCard: {
    flexDirection: "row",
    backgroundColor: "rgba(245,158,11,0.08)",
    padding: 16,
    borderRadius: 16,
    gap: 12,
    alignItems: "flex-start",
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.18)",
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: Colors.dark.warning,
    marginBottom: 4,
  },
  tipText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.dark.textPrimary,
    lineHeight: 18,
  },
});
