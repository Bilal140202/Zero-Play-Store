import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, RefreshControl, Pressable, Alert, Platform } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Colors from "@/constants/colors";
import { RecentFileCard } from "@/components/RecentFileCard";
import { ToolCard } from "@/components/ToolCard";

interface RecentFile {
  id: string;
  name: string;
  size: string;
  pages: number;
  lastOpened: string;
}

const DEFAULT_FILES: RecentFile[] = [
  { id: '1', name: 'Project_Proposal.pdf', size: '2.3 MB', pages: 12, lastOpened: new Date(Date.now() - 3600000).toISOString() },
  { id: '2', name: 'Invoice_March.pdf', size: '1.1 MB', pages: 3, lastOpened: new Date(Date.now() - 86400000).toISOString() },
  { id: '3', name: 'Resume_v4.pdf', size: '4.8 MB', pages: 2, lastOpened: new Date(Date.now() - 172800000).toISOString() },
  { id: '4', name: 'Contract_2024.pdf', size: '8.2 MB', pages: 24, lastOpened: new Date(Date.now() - 604800000).toISOString() },
];

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([]);

  const loadFiles = async () => {
    try {
      const stored = await AsyncStorage.getItem('pdfx_recent_files');
      if (stored) {
        setRecentFiles(JSON.parse(stored));
      } else {
        await AsyncStorage.setItem('pdfx_recent_files', JSON.stringify(DEFAULT_FILES));
        setRecentFiles(DEFAULT_FILES);
      }
    } catch (e) {
      console.error(e);
      setRecentFiles(DEFAULT_FILES);
    }
  };

  useEffect(() => {
    loadFiles();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadFiles();
    setRefreshing(false);
  };

  const handleOpenPDF = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    Alert.alert("Open File", "File picker would open device storage.");
    router.push({
      pathname: "/viewer",
      params: { fileId: "new", fileName: "New_Document.pdf", pages: 5 }
    });
  };

  const handleRecentPress = (file: RecentFile) => {
    router.push({
      pathname: "/viewer",
      params: { fileId: file.id, fileName: file.name, pages: file.pages }
    });
  };

  const handleDeleteRecent = async (id: string) => {
    Alert.alert("Delete", "Remove from recent files?", [
      { text: "Cancel", style: "cancel" },
      { 
        text: "Delete", 
        style: "destructive",
        onPress: async () => {
          const newFiles = recentFiles.filter(f => f.id !== id);
          setRecentFiles(newFiles);
          await AsyncStorage.setItem('pdfx_recent_files', JSON.stringify(newFiles));
        }
      }
    ]);
  };

  return (
    <View style={[styles.container, { paddingTop: Platform.OS === 'web' ? 67 : Math.max(insets.top, 24), paddingBottom: Platform.OS === 'web' ? 34 : insets.bottom }]}>
      <View style={styles.header}>
        <Text style={styles.logo}>PDF<Text style={styles.logoAccent}>X</Text></Text>
        <Pressable onPress={() => router.push("/settings")} style={styles.settingsBtn}>
          <Ionicons name="settings-outline" size={24} color={Colors.dark.textPrimary} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.dark.accent} />}
      >
        <Pressable 
          style={({ pressed }) => [
            styles.uploadCard,
            pressed && styles.uploadCardPressed
          ]} 
          onPress={handleOpenPDF}
        >
          <View style={styles.uploadIconContainer}>
            <Ionicons name="cloud-upload-outline" size={32} color={Colors.dark.accent} />
          </View>
          <Text style={styles.uploadTitle}>Open PDF</Text>
          <Text style={styles.uploadSubtitle}>Tap to browse device files</Text>
        </Pressable>

        {!!recentFiles.length && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Files</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recentList}>
              {recentFiles.map(file => (
                <RecentFileCard
                  key={file.id}
                  {...file}
                  onPress={() => handleRecentPress(file)}
                  onLongPress={() => handleDeleteRecent(file.id)}
                />
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tools</Text>
          <View style={styles.toolsGrid}>
            <ToolCard icon="copy-outline" label="Merge PDFs" onPress={() => router.push("/merge")} />
            <ToolCard icon="cut-outline" label="Split PDF" onPress={() => {}} />
            <ToolCard icon="archive-outline" label="Compress" onPress={() => router.push("/compress")} />
            <ToolCard icon="create-outline" label="Sign" onPress={() => router.push("/sign")} />
            <ToolCard icon="lock-closed-outline" label="Protect" onPress={() => {}} />
            <ToolCard icon="document-text-outline" label="Page Numbers" onPress={() => {}} />
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
    paddingBottom: 40,
    gap: 32,
  },
  uploadCard: {
    backgroundColor: Colors.dark.surface,
    borderWidth: 2,
    borderColor: Colors.dark.border,
    borderStyle: "dashed",
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  uploadCardPressed: {
    opacity: 0.8,
    backgroundColor: Colors.dark.surface2,
  },
  uploadIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.dark.surface2,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  uploadTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 18,
    color: Colors.dark.textPrimary,
    marginBottom: 8,
  },
  uploadSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.dark.textSecondary,
  },
  section: {
    gap: 16,
  },
  sectionTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 20,
    color: Colors.dark.textPrimary,
  },
  recentList: {
    paddingRight: 24,
  },
  toolsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
});
