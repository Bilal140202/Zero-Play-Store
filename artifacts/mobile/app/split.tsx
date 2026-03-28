import React, { useEffect, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import * as DocumentPicker from "expo-document-picker";
import { splitPdfByRanges, splitPdfEveryN, getPdfPageCount } from "@/lib/pdfEngine";

type Method = "range" | "fixed";

export default function SplitScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();

  const [fileUri, setFileUri] = useState((params.fileUri as string) || "");
  const [fileName, setFileName] = useState((params.fileName as string) || "");
  const [totalPages, setTotalPages] = useState(0);

  const [method, setMethod] = useState<Method>("range");
  const [ranges, setRanges] = useState([{ start: "1", end: "5" }]);
  const [fixedCount, setFixedCount] = useState("5");

  const [isSplitting, setIsSplitting] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [splitCount, setSplitCount] = useState(0);

  const topPad = Platform.OS === "web" ? 67 : Math.max(insets.top, 0);
  const botPad = Platform.OS === "web" ? 34 : Math.max(insets.bottom, 16);

  useEffect(() => {
    if (fileUri) loadPageCount();
  }, [fileUri]);

  const loadPageCount = async () => {
    try {
      const count = await getPdfPageCount(fileUri);
      setTotalPages(count);
      setRanges([{ start: "1", end: String(Math.min(count, 5)) }]);
    } catch (_) {}
  };

  const pickFile = async () => {
    const res = await DocumentPicker.getDocumentAsync({
      type: "application/pdf",
      copyToCacheDirectory: true,
    });
    if (res.canceled || !res.assets?.length) return;
    setFileUri(res.assets[0].uri);
    setFileName(res.assets[0].name);
    setIsDone(false);
  };

  const addRange = () => {
    const lastEnd = parseInt(ranges[ranges.length - 1].end) || 0;
    setRanges([...ranges, { start: String(lastEnd + 1), end: String(Math.min(lastEnd + 5, totalPages || 99)) }]);
  };

  const removeRange = (i: number) => setRanges(ranges.filter((_, idx) => idx !== i));

  const handleSplit = async () => {
    if (!fileUri) return pickFile();
    setIsSplitting(true);
    try {
      if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const baseName = fileName.replace(".pdf", "") || "split";

      if (method === "fixed") {
        const n = parseInt(fixedCount);
        if (!n || n < 1) throw new Error("Enter a valid page count");
        setSplitCount(totalPages ? Math.ceil(totalPages / n) : 1);
        await splitPdfEveryN(fileUri, n, baseName);
      } else {
        const parsedRanges = ranges.map((r) => [
          parseInt(r.start) || 1,
          parseInt(r.end) || 1,
        ] as [number, number]);
        setSplitCount(parsedRanges.length);
        await splitPdfByRanges(fileUri, parsedRanges, baseName);
      }

      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setIsDone(true);
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Split failed. Please try again.");
    } finally {
      setIsSplitting(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: topPad, paddingBottom: botPad }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.dark.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Split PDF</Text>
        <View style={{ width: 48 }} />
      </View>

      {isDone ? (
        <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.successState}>
          <View style={styles.successIcon}>
            <Ionicons name="cut" size={48} color={Colors.dark.success} />
          </View>
          <Text style={styles.successTitle}>Split into {splitCount} files</Text>
          <Text style={styles.successSub}>Files saved via share sheet</Text>
          <Pressable style={styles.doneBtn} onPress={() => setIsDone(false)}>
            <Text style={styles.doneBtnText}>Split another file</Text>
          </Pressable>
        </Animated.View>
      ) : (
        <>
          <View style={styles.tabs}>
            {(["range", "fixed"] as Method[]).map((m) => (
              <Pressable
                key={m}
                style={[styles.tab, method === m && styles.activeTab]}
                onPress={() => setMethod(m)}
              >
                <Text style={[styles.tabText, method === m && styles.activeTabText]}>
                  {m === "range" ? "By Page Range" : "Every N Pages"}
                </Text>
              </Pressable>
            ))}
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            {/* File card */}
            <Pressable style={styles.fileCard} onPress={pickFile}>
              <View style={styles.fileIconWrap}>
                <Ionicons
                  name={fileUri ? "document-text" : "folder-open-outline"}
                  size={24}
                  color={Colors.dark.accent}
                />
              </View>
              <View style={styles.fileMeta}>
                <Text style={styles.fileNameText} numberOfLines={1}>
                  {fileName || "Choose a PDF file"}
                </Text>
                {totalPages > 0 && (
                  <Text style={styles.fileSizeText}>{totalPages} pages</Text>
                )}
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.dark.textSecondary} />
            </Pressable>

            {method === "range" ? (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Page Ranges</Text>
                {ranges.map((r, i) => (
                  <View key={i} style={styles.rangeRow}>
                    <Text style={styles.rangeLabel}>Part {i + 1}</Text>
                    <TextInput
                      style={styles.rangeInput}
                      value={r.start}
                      onChangeText={(v) =>
                        setRanges(ranges.map((x, idx) => idx === i ? { ...x, start: v } : x))
                      }
                      keyboardType="number-pad"
                      placeholder="1"
                      placeholderTextColor={Colors.dark.textSecondary}
                    />
                    <Text style={styles.rangeSep}>–</Text>
                    <TextInput
                      style={styles.rangeInput}
                      value={r.end}
                      onChangeText={(v) =>
                        setRanges(ranges.map((x, idx) => idx === i ? { ...x, end: v } : x))
                      }
                      keyboardType="number-pad"
                      placeholder="5"
                      placeholderTextColor={Colors.dark.textSecondary}
                    />
                    {ranges.length > 1 && (
                      <Pressable onPress={() => removeRange(i)} style={styles.removeBtn}>
                        <Ionicons name="close-circle" size={20} color={Colors.dark.textSecondary} />
                      </Pressable>
                    )}
                  </View>
                ))}
                <Pressable style={styles.addRangeBtn} onPress={addRange}>
                  <Ionicons name="add-circle-outline" size={18} color={Colors.dark.accent} />
                  <Text style={styles.addRangeBtnText}>Add range</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Pages per part</Text>
                <View style={styles.fixedRow}>
                  <TextInput
                    style={styles.fixedInput}
                    value={fixedCount}
                    onChangeText={setFixedCount}
                    keyboardType="number-pad"
                    placeholder="5"
                    placeholderTextColor={Colors.dark.textSecondary}
                  />
                  <Text style={styles.fixedLabel}>
                    {totalPages
                      ? `→ ${Math.ceil(totalPages / (parseInt(fixedCount) || 1))} files`
                      : "pages per file"}
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <Pressable
              style={[styles.splitBtn, (isSplitting || !fileUri) && styles.splitBtnDisabled]}
              onPress={handleSplit}
              disabled={isSplitting}
            >
              <Ionicons name="cut-outline" size={20} color="#FFF" />
              <Text style={styles.splitBtnText}>
                {!fileUri
                  ? "Choose File to Split"
                  : isSplitting
                  ? "Splitting…"
                  : "Split PDF"}
              </Text>
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 8, height: 56,
  },
  iconBtn: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  title: { fontFamily: "Inter_600SemiBold", fontSize: 18, color: Colors.dark.textPrimary },
  tabs: { flexDirection: "row", marginHorizontal: 16, marginVertical: 8, borderRadius: 12, overflow: "hidden", backgroundColor: Colors.dark.surface },
  tab: { flex: 1, paddingVertical: 10, alignItems: "center" },
  activeTab: { backgroundColor: Colors.dark.accent },
  tabText: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.dark.textSecondary },
  activeTabText: { color: "#FFF" },
  content: { padding: 16, gap: 16, paddingBottom: 8 },
  fileCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: Colors.dark.surface, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: Colors.dark.accent + "55",
  },
  fileIconWrap: {
    width: 44, height: 44, borderRadius: 10,
    backgroundColor: Colors.dark.accent + "22", alignItems: "center", justifyContent: "center",
  },
  fileMeta: { flex: 1 },
  fileNameText: { fontFamily: "Inter_500Medium", fontSize: 14, color: Colors.dark.textPrimary },
  fileSizeText: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.dark.textSecondary, marginTop: 2 },
  section: {
    backgroundColor: Colors.dark.surface, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: Colors.dark.border, gap: 12,
  },
  sectionLabel: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.dark.textSecondary },
  rangeRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  rangeLabel: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.dark.textSecondary, width: 44 },
  rangeInput: {
    flex: 1, backgroundColor: Colors.dark.surface2, borderRadius: 8, padding: 10,
    color: Colors.dark.textPrimary, fontFamily: "Inter_500Medium", fontSize: 14,
    textAlign: "center", borderWidth: 1, borderColor: Colors.dark.border,
  },
  rangeSep: { fontFamily: "Inter_600SemiBold", color: Colors.dark.textSecondary },
  removeBtn: { padding: 4 },
  addRangeBtn: {
    flexDirection: "row", alignItems: "center", gap: 6, justifyContent: "center",
    paddingVertical: 8,
  },
  addRangeBtnText: { fontFamily: "Inter_500Medium", fontSize: 14, color: Colors.dark.accent },
  fixedRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  fixedInput: {
    width: 80, backgroundColor: Colors.dark.surface2, borderRadius: 8, padding: 12,
    color: Colors.dark.textPrimary, fontFamily: "Inter_700Bold", fontSize: 20,
    textAlign: "center", borderWidth: 1, borderColor: Colors.dark.border,
  },
  fixedLabel: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.dark.textSecondary },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: Colors.dark.border },
  splitBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: Colors.dark.accent, padding: 16, borderRadius: 14, gap: 10,
  },
  splitBtnDisabled: { opacity: 0.5 },
  splitBtnText: { fontFamily: "Inter_600SemiBold", color: "#FFF", fontSize: 16 },
  successState: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14 },
  successIcon: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: "rgba(16,185,129,0.12)", alignItems: "center", justifyContent: "center",
  },
  successTitle: { fontFamily: "Inter_700Bold", fontSize: 22, color: Colors.dark.textPrimary },
  successSub: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.dark.textSecondary },
  doneBtn: {
    marginTop: 8, backgroundColor: Colors.dark.surface, borderRadius: 12,
    paddingHorizontal: 24, paddingVertical: 12, borderWidth: 1, borderColor: Colors.dark.border,
  },
  doneBtnText: { fontFamily: "Inter_500Medium", fontSize: 14, color: Colors.dark.textPrimary },
});
