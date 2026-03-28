import React, { useState } from "react";
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
import { watermarkPdf } from "@/lib/pdfEngine";

const PRESET_COLORS = [
  { hex: "#EF4444", label: "Red" },
  { hex: "#3B82F6", label: "Blue" },
  { hex: "#10B981", label: "Green" },
  { hex: "#94A3B8", label: "Gray" },
  { hex: "#F59E0B", label: "Amber" },
  { hex: "#000000", label: "Black" },
];

const POSITIONS = [
  { key: "diagonal", label: "Diagonal", icon: "arrow-forward-circle-outline" },
  { key: "center", label: "Center", icon: "radio-button-on-outline" },
  { key: "top", label: "Top", icon: "arrow-up-circle-outline" },
  { key: "bottom", label: "Bottom", icon: "arrow-down-circle-outline" },
] as const;

type Position = "diagonal" | "center" | "top" | "bottom";

export default function WatermarkScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();

  const [fileUri, setFileUri] = useState((params.fileUri as string) || "");
  const [fileName, setFileName] = useState((params.fileName as string) || "");

  const [text, setText] = useState("CONFIDENTIAL");
  const [hexColor, setHexColor] = useState("#EF4444");
  const [opacity, setOpacity] = useState(0.35);
  const [position, setPosition] = useState<Position>("diagonal");
  const [fontSize, setFontSize] = useState(48);

  const [isWorking, setIsWorking] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : Math.max(insets.top, 0);
  const botPad = Platform.OS === "web" ? 34 : Math.max(insets.bottom, 16);

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

  const handleApply = async () => {
    if (!fileUri) return pickFile();
    if (!text.trim()) return Alert.alert("Missing text", "Enter watermark text.");
    setIsWorking(true);
    try {
      if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await watermarkPdf(
        fileUri,
        text.trim(),
        { opacity, angleDeg: 45, fontSize, hexColor, position },
        fileName.replace(".pdf", "_watermarked.pdf") || "watermarked.pdf"
      );
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setIsDone(true);
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to apply watermark.");
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: topPad, paddingBottom: botPad }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.dark.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Add Watermark</Text>
        <View style={{ width: 48 }} />
      </View>

      {isDone ? (
        <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.successState}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark" size={48} color={Colors.dark.success} />
          </View>
          <Text style={styles.successTitle}>Watermark Applied!</Text>
          <Text style={styles.successSub}>File saved via share sheet</Text>
          <Pressable style={styles.doneBtn} onPress={() => setIsDone(false)}>
            <Text style={styles.doneBtnText}>Apply to another file</Text>
          </Pressable>
        </Animated.View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {/* File picker */}
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
            </View>
            <Ionicons name="chevron-forward" size={16} color={Colors.dark.textSecondary} />
          </Pressable>

          {/* Preview */}
          <View style={[styles.preview, { borderColor: hexColor + "44" }]}>
            <Text
              style={[
                styles.previewText,
                {
                  color: hexColor,
                  opacity,
                  fontSize: Math.min(fontSize * 0.4, 28),
                  transform: position === "diagonal" ? [{ rotate: "-25deg" }] : [],
                },
              ]}
            >
              {text || "WATERMARK"}
            </Text>
          </View>

          {/* Text */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Watermark Text</Text>
            <TextInput
              style={styles.textInput}
              value={text}
              onChangeText={setText}
              placeholder="CONFIDENTIAL"
              placeholderTextColor={Colors.dark.textSecondary}
              maxLength={40}
            />
          </View>

          {/* Color */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Color</Text>
            <View style={styles.colorRow}>
              {PRESET_COLORS.map((c) => (
                <Pressable
                  key={c.hex}
                  style={[
                    styles.colorDot,
                    { backgroundColor: c.hex },
                    hexColor === c.hex && styles.colorDotActive,
                  ]}
                  onPress={() => setHexColor(c.hex)}
                />
              ))}
            </View>
          </View>

          {/* Position */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Position</Text>
            <View style={styles.positionGrid}>
              {POSITIONS.map((p) => (
                <Pressable
                  key={p.key}
                  style={[styles.posBtn, position === p.key && styles.posBtnActive]}
                  onPress={() => setPosition(p.key)}
                >
                  <Ionicons
                    name={p.icon as any}
                    size={20}
                    color={position === p.key ? "#FFF" : Colors.dark.textSecondary}
                  />
                  <Text style={[styles.posBtnText, position === p.key && styles.posBtnTextActive]}>
                    {p.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Opacity */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>
              Opacity — {Math.round(opacity * 100)}%
            </Text>
            <View style={styles.opacityRow}>
              {[0.1, 0.25, 0.35, 0.5, 0.7].map((v) => (
                <Pressable
                  key={v}
                  style={[styles.opacityBtn, opacity === v && styles.opacityBtnActive]}
                  onPress={() => setOpacity(v)}
                >
                  <Text style={[styles.opacityBtnText, opacity === v && { color: "#FFF" }]}>
                    {Math.round(v * 100)}%
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Font size */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>
              Font Size — {fontSize}pt
            </Text>
            <View style={styles.opacityRow}>
              {[24, 36, 48, 64, 80].map((v) => (
                <Pressable
                  key={v}
                  style={[styles.opacityBtn, fontSize === v && styles.opacityBtnActive]}
                  onPress={() => setFontSize(v)}
                >
                  <Text style={[styles.opacityBtnText, fontSize === v && { color: "#FFF" }]}>
                    {v}pt
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Apply button */}
          <Pressable
            style={[styles.applyBtn, (isWorking || !fileUri) && styles.applyBtnDisabled]}
            onPress={handleApply}
            disabled={isWorking}
          >
            <Ionicons name="water-outline" size={20} color="#FFF" />
            <Text style={styles.applyBtnText}>
              {!fileUri
                ? "Choose File to Watermark"
                : isWorking
                ? "Applying…"
                : "Apply Watermark & Save"}
            </Text>
          </Pressable>
        </ScrollView>
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
  content: { padding: 16, gap: 16, paddingBottom: 32 },
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
  preview: {
    height: 120, backgroundColor: Colors.dark.surface, borderRadius: 14,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, overflow: "hidden",
  },
  previewText: { fontFamily: "Inter_700Bold", letterSpacing: 4, textTransform: "uppercase" },
  section: {
    backgroundColor: Colors.dark.surface, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: Colors.dark.border, gap: 12,
  },
  sectionLabel: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.dark.textSecondary },
  textInput: {
    backgroundColor: Colors.dark.surface2, borderRadius: 10, padding: 12,
    color: Colors.dark.textPrimary, fontFamily: "Inter_500Medium", fontSize: 15,
    borderWidth: 1, borderColor: Colors.dark.border,
  },
  colorRow: { flexDirection: "row", gap: 12 },
  colorDot: { width: 36, height: 36, borderRadius: 18 },
  colorDotActive: { borderWidth: 3, borderColor: "#FFF" },
  positionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  posBtn: {
    flex: 1, minWidth: "45%", flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: Colors.dark.surface2, borderRadius: 10, padding: 10,
    borderWidth: 1, borderColor: Colors.dark.border,
  },
  posBtnActive: { backgroundColor: Colors.dark.accent, borderColor: Colors.dark.accent },
  posBtnText: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.dark.textSecondary },
  posBtnTextActive: { color: "#FFF" },
  opacityRow: { flexDirection: "row", gap: 8 },
  opacityBtn: {
    flex: 1, paddingVertical: 8, alignItems: "center",
    backgroundColor: Colors.dark.surface2, borderRadius: 8,
    borderWidth: 1, borderColor: Colors.dark.border,
  },
  opacityBtnActive: { backgroundColor: Colors.dark.accent, borderColor: Colors.dark.accent },
  opacityBtnText: { fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.dark.textSecondary },
  applyBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: Colors.dark.accent, padding: 16, borderRadius: 14, gap: 10,
  },
  applyBtnDisabled: { opacity: 0.5 },
  applyBtnText: { fontFamily: "Inter_600SemiBold", color: "#FFF", fontSize: 16 },
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
