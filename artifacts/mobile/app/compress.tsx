import React, { useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import { compressPdf } from "@/lib/pdfEngine";

function formatBytes(b: number) {
  if (!b) return "—";
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(2)} MB`;
}

export default function CompressScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();

  const [fileUri, setFileUri] = useState((params.fileUri as string) || "");
  const [fileName, setFileName] = useState((params.fileName as string) || "");
  const [originalSize, setOriginalSize] = useState(0);

  const [level, setLevel] = useState(1);
  const [optMetadata, setOptMetadata] = useState(true);

  const [isCompressing, setIsCompressing] = useState(false);
  const [result, setResult] = useState<{ original: number; compressed: number } | null>(null);

  const progress = useSharedValue(0);
  const pStyle = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` as any }));

  const topPad = Platform.OS === "web" ? 67 : Math.max(insets.top, 0);
  const botPad = Platform.OS === "web" ? 34 : Math.max(insets.bottom, 16);

  const pickFile = async () => {
    const res = await DocumentPicker.getDocumentAsync({
      type: "application/pdf",
      copyToCacheDirectory: true,
    });
    if (res.canceled || !res.assets?.length) return;
    const asset = res.assets[0];
    setFileUri(asset.uri);
    setFileName(asset.name);
    const info = await FileSystem.getInfoAsync(asset.uri);
    setOriginalSize((info as any).size ?? 0);
    setResult(null);
  };

  const handleCompress = async () => {
    if (!fileUri) return pickFile();
    setIsCompressing(true);
    setResult(null);

    progress.value = withSequence(
      withTiming(0.35, { duration: 600 }),
      withTiming(0.75, { duration: 900 })
    );

    try {
      if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const out = await compressPdf(
        fileUri,
        fileName.replace(".pdf", "_compressed.pdf") || "compressed.pdf"
      );
      progress.value = withTiming(1, { duration: 300 }, () => {
        runOnJS(setResult)({ original: out.originalSize, compressed: out.compressedSize });
        runOnJS(setIsCompressing)(false);
      });
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      progress.value = withTiming(0, { duration: 200 });
      setIsCompressing(false);
      Alert.alert("Error", e?.message || "Compression failed.");
    }
  };

  const saved = result ? result.original - result.compressed : 0;
  const savedPct = result ? Math.round((saved / result.original) * 100) : 0;

  return (
    <View style={[styles.container, { paddingTop: topPad, paddingBottom: botPad }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.dark.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Compress PDF</Text>
        <View style={{ width: 48 }} />
      </View>

      <View style={styles.content}>
        {/* File picker card */}
        <Pressable style={styles.fileCard} onPress={pickFile}>
          <View style={styles.fileIconWrap}>
            <Ionicons
              name={fileUri ? "document-text" : "folder-open-outline"}
              size={28}
              color={Colors.dark.accent}
            />
          </View>
          <View style={styles.fileMeta}>
            <Text style={styles.fileNameText} numberOfLines={1}>
              {fileName || "Choose a PDF file"}
            </Text>
            {originalSize > 0 && (
              <Text style={styles.fileSizeText}>{formatBytes(originalSize)}</Text>
            )}
          </View>
          <Ionicons name="chevron-forward" size={18} color={Colors.dark.textSecondary} />
        </Pressable>

        {/* Quality levels */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Quality</Text>
          {["High quality (mild compression)", "Balanced (recommended)", "Smallest file (aggressive)"].map(
            (label, i) => (
              <Pressable
                key={i}
                style={[styles.levelRow, level === i && styles.levelRowActive]}
                onPress={() => setLevel(i)}
              >
                <View style={[styles.radio, level === i && styles.radioActive]}>
                  {level === i && <View style={styles.radioDot} />}
                </View>
                <Text style={[styles.levelLabel, level === i && styles.levelLabelActive]}>
                  {label}
                </Text>
              </Pressable>
            )
          )}
        </View>

        {/* Options */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Options</Text>
          <View style={styles.optRow}>
            <Text style={styles.optLabel}>Remove metadata</Text>
            <Switch
              value={optMetadata}
              onValueChange={setOptMetadata}
              trackColor={{ true: Colors.dark.accent }}
              thumbColor="#FFF"
            />
          </View>
        </View>

        {/* Progress bar */}
        {isCompressing && (
          <Animated.View entering={FadeIn} style={styles.progressWrap}>
            <View style={styles.progressTrack}>
              <Animated.View style={[styles.progressFill, pStyle]} />
            </View>
            <Text style={styles.progressLabel}>Compressing…</Text>
          </Animated.View>
        )}

        {/* Result */}
        {result && (
          <Animated.View entering={FadeIn} style={styles.resultCard}>
            <View style={styles.resultIcon}>
              <Ionicons name="checkmark" size={32} color={Colors.dark.success} />
            </View>
            <Text style={styles.resultTitle}>
              Saved {formatBytes(saved)} ({savedPct}%)
            </Text>
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Original</Text>
                <Text style={styles.statValue}>{formatBytes(result.original)}</Text>
              </View>
              <Ionicons name="arrow-forward" size={18} color={Colors.dark.textSecondary} />
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Compressed</Text>
                <Text style={[styles.statValue, { color: Colors.dark.success }]}>
                  {formatBytes(result.compressed)}
                </Text>
              </View>
            </View>
          </Animated.View>
        )}
      </View>

      {/* Compress button */}
      <View style={styles.footer}>
        <Pressable
          style={[styles.compressBtn, (isCompressing || !fileUri) && styles.compressBtnDisabled]}
          onPress={handleCompress}
          disabled={isCompressing}
        >
          <Ionicons name="archive-outline" size={20} color="#FFF" />
          <Text style={styles.compressBtnText}>
            {!fileUri ? "Choose File to Compress" : isCompressing ? "Compressing…" : "Compress & Save"}
          </Text>
        </Pressable>
      </View>
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
  content: { flex: 1, padding: 20, gap: 20 },
  fileCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: Colors.dark.surface, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: Colors.dark.accent + "55",
  },
  fileIconWrap: {
    width: 48, height: 48, borderRadius: 12,
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
  levelRow: {
    flexDirection: "row", alignItems: "center", gap: 12, padding: 12,
    borderRadius: 10, backgroundColor: Colors.dark.surface2,
  },
  levelRowActive: { backgroundColor: Colors.dark.accent + "22" },
  radio: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 2,
    borderColor: Colors.dark.border, alignItems: "center", justifyContent: "center",
  },
  radioActive: { borderColor: Colors.dark.accent },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.dark.accent },
  levelLabel: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.dark.textSecondary },
  levelLabelActive: { color: Colors.dark.textPrimary },
  optRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  },
  optLabel: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.dark.textPrimary },
  progressWrap: { gap: 8 },
  progressTrack: {
    height: 8, backgroundColor: Colors.dark.surface2, borderRadius: 4, overflow: "hidden",
  },
  progressFill: { height: "100%", backgroundColor: Colors.dark.accent, borderRadius: 4 },
  progressLabel: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.dark.textSecondary, textAlign: "center" },
  resultCard: {
    backgroundColor: Colors.dark.surface, borderRadius: 14, padding: 20,
    alignItems: "center", gap: 12, borderWidth: 1, borderColor: Colors.dark.success + "55",
  },
  resultIcon: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: "rgba(16,185,129,0.12)", alignItems: "center", justifyContent: "center",
  },
  resultTitle: { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.dark.textPrimary },
  statsRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  statBox: { alignItems: "center", gap: 4 },
  statLabel: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.dark.textSecondary },
  statValue: { fontFamily: "Inter_700Bold", fontSize: 16, color: Colors.dark.textPrimary },
  footer: {
    padding: 20, borderTopWidth: 1, borderTopColor: Colors.dark.border,
  },
  compressBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: Colors.dark.accent, padding: 16, borderRadius: 14, gap: 10,
  },
  compressBtnDisabled: { opacity: 0.5 },
  compressBtnText: { fontFamily: "Inter_600SemiBold", color: "#FFF", fontSize: 16 },
});
