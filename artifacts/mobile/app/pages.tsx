import React, { useEffect, useState } from "react";
import { View, StyleSheet, Text, Pressable, ScrollView, Platform, Dimensions, Alert, ActivityIndicator } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import * as Haptics from "expo-haptics";
import Animated, { FadeIn, FadeOut, SlideInDown } from "react-native-reanimated";
import * as DocumentPicker from "expo-document-picker";
import { applyPageOperations, extractPages, getPdfPageCount } from "@/lib/pdfEngine";

interface PageItem {
  id: string;
  pageNumber: number;
  originalIndex: number;
  rotationDegree: 0 | 90 | 180 | 270;
  isSelected: boolean;
}

const SCREEN_WIDTH = Dimensions.get("window").width;
const COLUMNS = 3;
const SPACING = 16;
const CARD_WIDTH = (SCREEN_WIDTH - (SPACING * (COLUMNS + 1))) / COLUMNS;
const CARD_HEIGHT = CARD_WIDTH * 1.414;

export default function PagesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();

  const [fileUri, setFileUri] = useState((params.fileUri as string) || "");
  const [fileName, setFileName] = useState((params.fileName as string) || "");
  const [pages, setPages] = useState<PageItem[]>([]);
  const [deletedOriginalIndices, setDeletedOriginalIndices] = useState<number[]>([]);
  const [loadingPages, setLoadingPages] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [selectionMode, setSelectionMode] = useState(false);
  const [showFabMenu, setShowFabMenu] = useState(false);

  useEffect(() => {
    if (fileUri) loadPdf();
  }, [fileUri]);

  const loadPdf = async () => {
    setLoadingPages(true);
    try {
      const count = await getPdfPageCount(fileUri);
      setPages(
        Array.from({ length: count }).map((_, i) => ({
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9) + i,
          pageNumber: i + 1,
          originalIndex: i,
          rotationDegree: 0,
          isSelected: false,
        }))
      );
      setDeletedOriginalIndices([]);
    } catch (e) {
      Alert.alert("Error", "Could not read this PDF.");
    } finally {
      setLoadingPages(false);
    }
  };

  const pickFile = async () => {
    const res = await DocumentPicker.getDocumentAsync({
      type: "application/pdf",
      copyToCacheDirectory: true,
    });
    if (res.canceled || !res.assets?.length) return;
    setFileUri(res.assets[0].uri);
    setFileName(res.assets[0].name);
  };

  const handleSave = async () => {
    if (!fileUri) return Alert.alert("No file", "Open a PDF first.");
    setIsSaving(true);
    try {
      if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const rotations: Record<number, 0 | 90 | 180 | 270> = {};
      pages.forEach((p) => {
        if (p.rotationDegree !== 0) rotations[p.originalIndex] = p.rotationDegree;
      });
      await applyPageOperations(
        fileUri,
        rotations,
        deletedOriginalIndices,
        fileName.replace(".pdf", "_edited.pdf") || "edited.pdf"
      );
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Saved", "PDF saved successfully via share sheet.");
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Could not save PDF.");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleSelectionMode = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (selectionMode) {
      setPages(pages.map(p => ({ ...p, isSelected: false })));
    }
    setSelectionMode(!selectionMode);
  };

  const togglePageSelection = (id: string) => {
    if (Platform.OS !== 'web') Haptics.selectionAsync();
    setPages(pages.map(p => p.id === id ? { ...p, isSelected: !p.isSelected } : p));
  };

  const handlePageLongPress = (id: string) => {
    if (!selectionMode) {
      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setSelectionMode(true);
      setPages(pages.map(p => p.id === id ? { ...p, isSelected: true } : p));
    }
  };

  const selectedCount = pages.filter(p => p.isSelected).length;

  const handleDelete = () => {
    if (selectedCount === 0) return;
    Alert.alert("Delete Pages", `Delete ${selectedCount} page${selectedCount !== 1 ? "s" : ""} from the PDF?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          const toDelete = pages.filter((p) => p.isSelected).map((p) => p.originalIndex);
          setDeletedOriginalIndices((prev) => [...prev, ...toDelete]);
          setPages(pages.filter((p) => !p.isSelected).map((p, i) => ({ ...p, pageNumber: i + 1 })));
          setSelectionMode(false);
        },
      },
    ]);
  };

  const handleRotate = (direction: 'left' | 'right') => {
    setPages(pages.map(p => {
      if (p.isSelected) {
        let newRot = p.rotationDegree + (direction === 'right' ? 90 : -90);
        if (newRot >= 360) newRot = 0;
        if (newRot < 0) newRot = 270;
        return { ...p, rotationDegree: newRot as any };
      }
      return p;
    }));
  };

  const handleAddPage = () => {
    setShowFabMenu(!showFabMenu);
  };

  const insertPage = () => {
    const newPage: PageItem = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      pageNumber: pages.length + 1,
      originalIndex: -1,
      rotationDegree: 0,
      isSelected: false,
    };
    setPages([...pages, newPage]);
    setShowFabMenu(false);
  };

  const handleExtract = async () => {
    if (!fileUri) return Alert.alert("No file", "Open a PDF first.");
    const selected = pages.filter((p) => p.isSelected && p.originalIndex >= 0);
    if (!selected.length) return Alert.alert("No pages selected", "Select pages to extract.");
    setIsSaving(true);
    try {
      if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await extractPages(
        fileUri,
        selected.map((p) => p.originalIndex),
        fileName.replace(".pdf", "_extracted.pdf") || "extracted.pdf"
      );
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSelectionMode(false);
      setPages(pages.map((p) => ({ ...p, isSelected: false })));
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Could not extract pages.");
    } finally {
      setIsSaving(false);
    }
  };

  const topPad = Platform.OS === "web" ? 67 : Math.max(insets.top, 0);
  const botPad = Platform.OS === "web" ? 34 : Math.max(insets.bottom, 16);

  return (
    <View style={[styles.container, { paddingTop: topPad, paddingBottom: botPad }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.dark.textPrimary} />
        </Pressable>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{selectionMode ? `${selectedCount} Selected` : "Page Manager"}</Text>
          {!selectionMode && pages.length > 0 && (
            <Text style={styles.subtitle}>{pages.length} pages</Text>
          )}
        </View>
        <View style={styles.headerRight}>
          {pages.length > 0 && !selectionMode && (
            <Pressable onPress={handleSave} style={styles.saveBtn} disabled={isSaving}>
              {isSaving ? (
                <ActivityIndicator size="small" color={Colors.dark.success} />
              ) : (
                <Ionicons name="save-outline" size={20} color={Colors.dark.success} />
              )}
            </Pressable>
          )}
          <Pressable onPress={toggleSelectionMode} style={styles.headerAction}>
            <Text style={styles.headerActionText}>{selectionMode ? "Cancel" : "Select"}</Text>
          </Pressable>
        </View>
      </View>

      {/* File picker card when no file loaded */}
      {!fileUri && (
        <View style={styles.pickFileWrap}>
          <Pressable style={styles.pickFileCard} onPress={pickFile}>
            <Ionicons name="folder-open-outline" size={36} color={Colors.dark.accent} />
            <Text style={styles.pickFileTitle}>Open a PDF to edit pages</Text>
            <Text style={styles.pickFileSub}>Rotate, delete & extract pages, then save</Text>
          </Pressable>
        </View>
      )}

      {loadingPages && (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={Colors.dark.accent} />
          <Text style={styles.loadingText}>Reading PDF…</Text>
        </View>
      )}

      {fileUri && !loadingPages && pages.length > 0 && (
        <Pressable style={styles.fileChip} onPress={pickFile}>
          <Ionicons name="document-text" size={14} color={Colors.dark.accent} />
          <Text style={styles.fileChipText} numberOfLines={1}>
            {fileName || "PDF loaded"}
          </Text>
          <Ionicons name="swap-horizontal" size={14} color={Colors.dark.textSecondary} />
        </Pressable>
      )}

      <ScrollView contentContainerStyle={styles.grid}>
        {pages.map((page, index) => (
          <Animated.View key={page.id} entering={SlideInDown.delay(index * 50)} style={styles.cardContainer}>
            <Pressable
              style={[
                styles.pageCard,
                { transform: [{ rotate: `${page.rotationDegree}deg` }] },
                page.isSelected && styles.pageCardSelected
              ]}
              onPress={() => selectionMode ? togglePageSelection(page.id) : null}
              onLongPress={() => handlePageLongPress(page.id)}
            >
              <View style={styles.pageContent} />
              {selectionMode && (
                <View style={styles.checkboxContainer}>
                  <View style={[styles.checkbox, page.isSelected && styles.checkboxSelected]}>
                    {page.isSelected && <Ionicons name="checkmark" size={14} color="#FFF" />}
                  </View>
                </View>
              )}
            </Pressable>
            <Text style={styles.pageNumber}>{page.pageNumber}</Text>
          </Animated.View>
        ))}
      </ScrollView>

      {selectionMode ? (
        <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.actionBar}>
          <Pressable style={styles.actionBtn} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={24} color={Colors.dark.warning} />
            <Text style={styles.actionText}>Delete</Text>
          </Pressable>
          <Pressable style={styles.actionBtn} onPress={() => handleRotate('left')}>
            <Ionicons name="refresh-outline" size={24} color={Colors.dark.textPrimary} style={{ transform: [{ scaleX: -1 }] }} />
            <Text style={styles.actionText}>Left</Text>
          </Pressable>
          <Pressable style={styles.actionBtn} onPress={() => handleRotate('right')}>
            <Ionicons name="refresh-outline" size={24} color={Colors.dark.textPrimary} />
            <Text style={styles.actionText}>Right</Text>
          </Pressable>
          <Pressable style={styles.actionBtn} onPress={handleExtract}>
            <Ionicons name="log-out-outline" size={24} color={Colors.dark.textPrimary} />
            <Text style={styles.actionText}>Extract</Text>
          </Pressable>
        </Animated.View>
      ) : (
        <>
          {showFabMenu && (
            <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.fabMenu}>
              <Pressable style={styles.fabMenuItem} onPress={insertPage}>
                <Text style={styles.fabMenuText}>Insert Blank Page</Text>
                <View style={styles.fabMenuIcon}>
                  <Ionicons name="document-outline" size={20} color={Colors.dark.textPrimary} />
                </View>
              </Pressable>
            </Animated.View>
          )}
          <Pressable style={styles.fab} onPress={handleAddPage}>
            <Ionicons name={showFabMenu ? "close" : "add"} size={32} color="#FFF" />
          </Pressable>
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
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  iconBtn: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  titleContainer: {
    alignItems: "center",
  },
  title: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: Colors.dark.textPrimary,
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.dark.textSecondary,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  saveBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerAction: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  headerActionText: {
    fontFamily: "Inter_500Medium",
    fontSize: 15,
    color: Colors.dark.accent,
  },
  pickFileWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  pickFileCard: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    gap: 12,
    width: "100%",
    borderWidth: 2,
    borderColor: Colors.dark.accent + "44",
    borderStyle: "dashed",
  },
  pickFileTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: Colors.dark.textPrimary,
    textAlign: "center",
  },
  pickFileSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.dark.textSecondary,
    textAlign: "center",
  },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.dark.textSecondary,
  },
  fileChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: Colors.dark.surface,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  fileChipText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: Colors.dark.textSecondary,
    maxWidth: 200,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: SPACING,
    paddingTop: 24,
  },
  cardContainer: {
    width: CARD_WIDTH,
    marginBottom: 24,
    marginRight: SPACING,
    alignItems: "center",
  },
  pageCard: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 8,
    overflow: "hidden",
  },
  pageCardSelected: {
    borderWidth: 3,
    borderColor: Colors.dark.accent,
  },
  pageContent: {
    flex: 1,
    margin: 8,
    backgroundColor: "#F8FAFC",
    borderRadius: 4,
  },
  checkboxContainer: {
    position: "absolute",
    bottom: 8,
    right: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.dark.border,
    backgroundColor: "rgba(0,0,0,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxSelected: {
    backgroundColor: Colors.dark.accent,
    borderColor: Colors.dark.accent,
  },
  pageNumber: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: Colors.dark.textSecondary,
  },
  actionBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.dark.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
    flexDirection: "row",
    paddingBottom: 34,
    paddingTop: 16,
    justifyContent: "space-around",
  },
  actionBtn: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 70,
  },
  actionText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: Colors.dark.textPrimary,
    marginTop: 4,
  },
  fab: {
    position: "absolute",
    bottom: 40,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.dark.accent,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.dark.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabMenu: {
    position: "absolute",
    bottom: 120,
    right: 24,
    alignItems: "flex-end",
    gap: 16,
  },
  fabMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  fabMenuText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: Colors.dark.textPrimary,
    backgroundColor: Colors.dark.surface2,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    overflow: "hidden",
  },
  fabMenuIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.dark.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
});
