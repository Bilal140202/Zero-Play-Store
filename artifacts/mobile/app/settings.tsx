import React, { useEffect, useState } from "react";
import {
  Alert,
  Linking,
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
import * as FileSystem from "expo-file-system/legacy";

const RECENT_KEY = "pdfx_recent_files_v2";
const BOOKMARKS_KEY = "pdfx_bookmarks_v1";
const APP_VERSION = "1.0.3";
const PRIVACY_POLICY_URL = "https://sites.google.com/view/pdfx-privacy/home";
const GITHUB_URL = "https://github.com/bilal1402/pdfx";

function formatBytes(bytes: number): string {
  if (!bytes || bytes < 0) return "0 KB";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

async function getDirSize(dirUri: string | null): Promise<number> {
  if (!dirUri) return 0;
  try {
    const info = await FileSystem.getInfoAsync(dirUri);
    if (!info.exists) return 0;
    const items = await FileSystem.readDirectoryAsync(dirUri);
    let total = 0;
    for (const item of items) {
      const fi = await FileSystem.getInfoAsync(dirUri + item);
      if (fi.exists && !fi.isDirectory && fi.size) total += fi.size;
    }
    return total;
  } catch {
    return 0;
  }
}

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [cacheSize, setCacheSize] = useState<string | null>(null);
  const [recentCount, setRecentCount] = useState<number>(0);

  useEffect(() => {
    (async () => {
      const [size, stored] = await Promise.all([
        getDirSize(FileSystem.cacheDirectory),
        AsyncStorage.getItem(RECENT_KEY),
      ]);
      setCacheSize(formatBytes(size));
      setRecentCount(stored ? (JSON.parse(stored) as any[]).length : 0);
    })();
  }, []);

  const handleClearRecents = () => {
    Alert.alert(
      "Clear Recent Files",
      `Remove ${recentCount} file${recentCount !== 1 ? "s" : ""} from your recent list?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            await AsyncStorage.removeItem(RECENT_KEY);
            setRecentCount(0);
            Alert.alert("Done", "Recent files list cleared.");
          },
        },
      ]
    );
  };

  const handleClearBookmarks = () => {
    Alert.alert("Clear Bookmarks", "Remove all saved bookmarks?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear",
        style: "destructive",
        onPress: async () => {
          await AsyncStorage.setItem(BOOKMARKS_KEY, "[]");
          Alert.alert("Done", "Bookmarks cleared.");
        },
      },
    ]);
  };

  const handlePrivacyPolicy = async () => {
    try {
      await Linking.openURL(PRIVACY_POLICY_URL);
    } catch {
      Alert.alert("Error", "Could not open the privacy policy URL.");
    }
  };

  const handleGithub = async () => {
    try {
      await Linking.openURL(GITHUB_URL);
    } catch {
      Alert.alert("Error", "Could not open the URL.");
    }
  };

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
    >
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.dark.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Settings</Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Privacy */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={20}
                  color={Colors.dark.success}
                />
                <Text style={styles.rowText}>100% Offline</Text>
              </View>
              <Text style={styles.valueText}>No uploads</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <Ionicons
                  name="cloud-offline-outline"
                  size={20}
                  color={Colors.dark.textPrimary}
                />
                <Text style={styles.rowText}>No Account Required</Text>
              </View>
              <View style={styles.greenDot} />
            </View>
          </View>
        </View>

        {/* Storage */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Storage</Text>
          <View style={styles.card}>
            <Pressable style={styles.row} onPress={handleClearRecents}>
              <View style={styles.rowLeft}>
                <Ionicons
                  name="time-outline"
                  size={20}
                  color={Colors.dark.warning}
                />
                <Text style={styles.rowText}>Recent Files</Text>
              </View>
              <Text style={styles.valueText}>
                {recentCount > 0 ? `${recentCount} files` : "Empty"}
              </Text>
            </Pressable>
            <View style={styles.divider} />
            <Pressable style={styles.row} onPress={handleClearBookmarks}>
              <View style={styles.rowLeft}>
                <Ionicons
                  name="bookmark-outline"
                  size={20}
                  color={Colors.dark.warning}
                />
                <Text style={styles.rowText}>Clear Bookmarks</Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={Colors.dark.textSecondary}
              />
            </Pressable>
            <View style={styles.divider} />
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <Ionicons
                  name="server-outline"
                  size={20}
                  color={Colors.dark.textPrimary}
                />
                <Text style={styles.rowText}>App Cache</Text>
              </View>
              <Text style={styles.valueText}>
                {cacheSize ?? "Calculating…"}
              </Text>
            </View>
          </View>
          <Text style={styles.hint}>
            Tap a row to clear it. Processed PDFs are saved via the share
            sheet — not stored in the app.
          </Text>
        </View>

        {/* About */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.rowText}>App Name</Text>
              <Text style={styles.valueText}>PDFX</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.row}>
              <Text style={styles.rowText}>Version</Text>
              <Text style={styles.valueText}>{APP_VERSION}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.row}>
              <Text style={styles.rowText}>Platform</Text>
              <Text style={styles.valueText}>{Platform.OS}</Text>
            </View>
            <View style={styles.divider} />
            <Pressable style={styles.row} onPress={handlePrivacyPolicy}>
              <Text style={styles.rowText}>Privacy Policy</Text>
              <Ionicons
                name="open-outline"
                size={18}
                color={Colors.dark.textSecondary}
              />
            </Pressable>
            <View style={styles.divider} />
            <Pressable style={styles.row} onPress={handleGithub}>
              <Text style={styles.rowText}>Source Code</Text>
              <Ionicons
                name="logo-github"
                size={18}
                color={Colors.dark.textSecondary}
              />
            </Pressable>
          </View>
        </View>

        {/* Tip */}
        <View style={styles.tipCard}>
          <Ionicons
            name="information-circle-outline"
            size={18}
            color={Colors.dark.accent}
          />
          <Text style={styles.tipText}>
            PDFX works entirely offline. Your documents are never uploaded to
            any server. Processed files are saved locally via your device's
            share sheet.
          </Text>
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
    padding: 20,
    gap: 28,
    paddingBottom: 40,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontFamily: "Inter_600SemiBold",
    color: Colors.dark.textSecondary,
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  card: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  rowText: {
    fontFamily: "Inter_500Medium",
    color: Colors.dark.textPrimary,
    fontSize: 15,
  },
  valueText: {
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textSecondary,
    fontSize: 14,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.dark.border,
    marginLeft: 48,
  },
  greenDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.dark.success,
  },
  hint: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.dark.textSecondary,
    lineHeight: 17,
    paddingHorizontal: 4,
  },
  tipCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: Colors.dark.accent + "10",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.dark.accent + "25",
  },
  tipText: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.dark.textSecondary,
    lineHeight: 19,
  },
});
