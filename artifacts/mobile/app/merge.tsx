import React, { useState } from "react";
import {
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
import Animated, { FadeIn, FadeOut, SlideInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import * as DocumentPicker from "expo-document-picker";

interface MergeItem {
  id: string;
  name: string;
  uri: string;
  size: string;
}

function formatBytes(bytes: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export default function MergeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [files, setFiles] = useState<MergeItem[]>([]);
  const [isSuccess, setIsSuccess] = useState(false);
  const [picking, setPicking] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : Math.max(insets.top, 0);
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const handleAddFiles = async () => {
    if (picking) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPicking(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: false,
        multiple: true,
      });

      if (result.canceled || !result.assets?.length) return;

      const newItems: MergeItem[] = result.assets
        .filter((a) => !files.some((f) => f.uri === a.uri))
        .map((a) => ({
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          name: a.name,
          uri: a.uri,
          size: formatBytes(a.size ?? 0),
        }));

      setFiles((prev) => [...prev, ...newItems]);
    } catch (e) {
      Alert.alert("Error", "Could not open files. Please try again.");
    } finally {
      setPicking(false);
    }
  };

  const handleRemove = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleMerge = () => {
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setIsSuccess(true);
    setTimeout(() => {
      router.back();
    }, 2200);
  };

  return (
    <View
      style={[
        styles.container,
        { paddingTop: topPad, paddingBottom: botPad },
      ]}
    >
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.dark.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Merge PDFs</Text>
        <View style={{ width: 48 }} />
      </View>

      {isSuccess ? (
        <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.successState}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark" size={48} color={Colors.dark.success} />
          </View>
          <Text style={styles.successTitle}>Merged Successfully!</Text>
          <Text style={styles.successSub}>
            {files.length} files combined into one PDF
          </Text>
        </Animated.View>
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.content}>
            {files.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons
                  name="documents-outline"
                  size={64}
                  color={Colors.dark.border}
                />
                <Text style={styles.emptyTitle}>No Files Selected</Text>
                <Text style={styles.emptySub}>
                  Add 2 or more PDFs to combine them into one
                </Text>
                <Pressable
                  style={[styles.addBtn, picking && styles.btnDisabled]}
                  onPress={handleAddFiles}
                  disabled={picking}
                >
                  <Ionicons name="folder-open-outline" size={20} color="#FFF" />
                  <Text style={styles.addBtnText}>
                    {picking ? "Opening…" : "Choose PDF Files"}
                  </Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.fileList}>
                <Text style={styles.listHint}>
                  {files.length} file{files.length !== 1 ? "s" : ""} selected · drag to reorder
                </Text>
                {files.map((f, i) => (
                  <Animated.View
                    entering={SlideInDown.delay(i * 60)}
                    key={f.id}
                    style={styles.fileItem}
                  >
                    <View style={styles.fileIconWrap}>
                      <Ionicons
                        name="document-text"
                        size={22}
                        color={Colors.dark.accent}
                      />
                    </View>
                    <View style={styles.fileMeta}>
                      <Text style={styles.fileName} numberOfLines={1}>
                        {f.name}
                      </Text>
                      {!!f.size && (
                        <Text style={styles.fileSize}>{f.size}</Text>
                      )}
                    </View>
                    <Pressable
                      onPress={() => handleRemove(f.id)}
                      style={styles.removeBtn}
                    >
                      <Ionicons
                        name="close-circle"
                        size={20}
                        color={Colors.dark.textSecondary}
                      />
                    </Pressable>
                  </Animated.View>
                ))}

                <Pressable
                  style={[styles.addMoreBtn, picking && styles.btnDisabled]}
                  onPress={handleAddFiles}
                  disabled={picking}
                >
                  <Ionicons
                    name="add-circle-outline"
                    size={22}
                    color={Colors.dark.accent}
                  />
                  <Text style={styles.addMoreText}>
                    {picking ? "Opening…" : "Add more files"}
                  </Text>
                </Pressable>
              </View>
            )}
          </ScrollView>

          {files.length >= 2 && (
            <View style={styles.footer}>
              <Pressable style={styles.mergeBtn} onPress={handleMerge}>
                <Ionicons name="git-merge-outline" size={20} color="#FFF" />
                <Text style={styles.mergeBtnText}>
                  Merge {files.length} Files
                </Text>
              </Pressable>
            </View>
          )}

          {files.length === 1 && (
            <View style={styles.footer}>
              <Text style={styles.mergeHint}>Add at least 2 PDFs to merge</Text>
            </View>
          )}
        </>
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
    padding: 24,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 80,
    gap: 12,
  },
  emptyTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 18,
    color: Colors.dark.textPrimary,
    marginTop: 8,
  },
  emptySub: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.dark.textSecondary,
    textAlign: "center",
    marginBottom: 8,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.dark.accent,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
    gap: 10,
    marginTop: 8,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  addBtnText: {
    fontFamily: "Inter_600SemiBold",
    color: "#FFF",
    fontSize: 16,
  },
  listHint: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.dark.textSecondary,
    marginBottom: 8,
  },
  fileList: {
    gap: 10,
  },
  fileItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.dark.surface,
    padding: 14,
    borderRadius: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  fileIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.dark.accent + "22",
    alignItems: "center",
    justifyContent: "center",
  },
  fileMeta: {
    flex: 1,
  },
  fileName: {
    fontFamily: "Inter_500Medium",
    color: Colors.dark.textPrimary,
    fontSize: 14,
  },
  fileSize: {
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  removeBtn: {
    padding: 4,
  },
  addMoreBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    borderWidth: 1.5,
    borderColor: Colors.dark.accent + "66",
    borderStyle: "dashed",
    borderRadius: 14,
    gap: 8,
    marginTop: 4,
  },
  addMoreText: {
    fontFamily: "Inter_500Medium",
    color: Colors.dark.accent,
    fontSize: 15,
  },
  footer: {
    padding: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
    alignItems: "center",
  },
  mergeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.dark.accent,
    padding: 16,
    borderRadius: 16,
    gap: 10,
    width: "100%",
  },
  mergeBtnText: {
    fontFamily: "Inter_600SemiBold",
    color: "#FFF",
    fontSize: 16,
  },
  mergeHint: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.dark.textSecondary,
  },
  successState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  successIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  successTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 24,
    color: Colors.dark.textPrimary,
  },
  successSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: Colors.dark.textSecondary,
  },
});
