import React, { useState } from "react";
import { View, StyleSheet, Text, Pressable, ScrollView, Platform } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import Animated, { FadeIn, FadeOut, SlideInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

interface MergeItem {
  id: string;
  name: string;
}

export default function MergeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [files, setFiles] = useState<MergeItem[]>([]);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleAddFiles = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const newFiles = [
      { id: Date.now().toString(), name: `Document_${files.length + 1}.pdf` },
      { id: (Date.now() + 1).toString(), name: `Report_Final.pdf` }
    ];
    setFiles([...files, ...newFiles]);
  };

  const handleMerge = () => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setIsSuccess(true);
    setTimeout(() => {
      router.back();
    }, 2000);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
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
        </Animated.View>
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.content}>
            {files.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="documents-outline" size={64} color={Colors.dark.surface2} />
                <Text style={styles.emptyTitle}>No Files Selected</Text>
                <Text style={styles.emptySub}>Add PDF files you want to combine</Text>
                <Pressable style={styles.addBtn} onPress={handleAddFiles}>
                  <Ionicons name="add" size={20} color="#FFF" />
                  <Text style={styles.addBtnText}>Add Files</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.fileList}>
                {files.map((f, i) => (
                  <Animated.View entering={SlideInDown.delay(i * 100)} key={f.id} style={styles.fileItem}>
                    <Ionicons name="document-text" size={24} color={Colors.dark.accent} />
                    <Text style={styles.fileName}>{f.name}</Text>
                    <Ionicons name="reorder-two" size={24} color={Colors.dark.textSecondary} />
                  </Animated.View>
                ))}
                
                <Pressable style={styles.addMoreBtn} onPress={handleAddFiles}>
                  <Ionicons name="add-circle-outline" size={24} color={Colors.dark.accent} />
                  <Text style={styles.addMoreText}>Add more files</Text>
                </Pressable>
              </View>
            )}
          </ScrollView>

          {!!files.length && (
            <View style={styles.footer}>
              <Pressable style={styles.mergeBtn} onPress={handleMerge}>
                <Text style={styles.mergeBtnText}>Merge {files.length} Files</Text>
              </Pressable>
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
    marginTop: 100,
  },
  emptyTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 18,
    color: Colors.dark.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySub: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.dark.textSecondary,
    marginBottom: 24,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.dark.accent,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  addBtnText: {
    fontFamily: "Inter_600SemiBold",
    color: "#FFF",
    fontSize: 16,
  },
  fileList: {
    gap: 12,
  },
  fileItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.dark.surface,
    padding: 16,
    borderRadius: 16,
    gap: 12,
  },
  fileName: {
    flex: 1,
    fontFamily: "Inter_500Medium",
    color: Colors.dark.textPrimary,
    fontSize: 15,
  },
  addMoreBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderStyle: "dashed",
    borderRadius: 16,
    gap: 8,
    marginTop: 8,
  },
  addMoreText: {
    fontFamily: "Inter_500Medium",
    color: Colors.dark.accent,
    fontSize: 15,
  },
  footer: {
    padding: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
  },
  mergeBtn: {
    backgroundColor: Colors.dark.accent,
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  mergeBtnText: {
    fontFamily: "Inter_600SemiBold",
    color: "#FFF",
    fontSize: 16,
  },
  successState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  successIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  successTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 24,
    color: Colors.dark.textPrimary,
  },
});
