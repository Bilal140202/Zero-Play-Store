import React, { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";

type Status = "done" | "progress" | "planned";

interface Feature {
  label: string;
  status: Status;
  note?: string;
}

interface Section {
  title: string;
  icon: string;
  items: Feature[];
}

const STATUS_COLOR: Record<Status, string> = {
  done: Colors.dark.success,
  progress: Colors.dark.warning,
  planned: Colors.dark.textSecondary,
};
const STATUS_ICON: Record<Status, string> = {
  done: "checkmark-circle",
  progress: "sync-circle",
  planned: "ellipse-outline",
};
const STATUS_LABEL: Record<Status, string> = {
  done: "Done",
  progress: "In Progress",
  planned: "Planned",
};

const SECTIONS: Section[] = [
  {
    title: "File Management",
    icon: "folder-open-outline",
    items: [
      { label: "Open PDF from device storage", status: "done" },
      { label: "Recent files list (persisted)", status: "done" },
      { label: "File size display", status: "done" },
      { label: "Remove file from recents", status: "done" },
      { label: "Open PDF from share intent (WhatsApp, Gmail)", status: "planned" },
      { label: "Multi-tab / open multiple PDFs", status: "planned" },
    ],
  },
  {
    title: "PDF Viewer",
    icon: "eye-outline",
    items: [
      { label: "Real PDF rendering (PDF.js)", status: "done" },
      { label: "Scrollable multi-page view", status: "done" },
      { label: "Page count detection", status: "done" },
      { label: "Pinch to zoom", status: "progress", note: "WebView native zoom" },
      { label: "Dark mode PDF rendering", status: "planned" },
      { label: "Page thumbnail sidebar", status: "progress" },
      { label: "Jump to page number", status: "planned" },
      { label: "Search text in PDF", status: "planned" },
      { label: "Offline PDF.js (bundled, no CDN)", status: "planned" },
    ],
  },
  {
    title: "Annotations",
    icon: "create-outline",
    items: [
      { label: "Text overlay (add new text)", status: "progress" },
      { label: "Draw / freehand pen", status: "progress" },
      { label: "Highlight text (yellow, green, pink)", status: "planned" },
      { label: "Underline / strikethrough text", status: "planned" },
      { label: "Sticky note / comment", status: "progress" },
      { label: "Shape tools (rectangle, circle, arrow)", status: "progress" },
      { label: "Eraser", status: "progress" },
      { label: "Color + stroke width picker", status: "done" },
      { label: "Save annotations into PDF (pdf-lib)", status: "planned" },
      { label: "Bookmark pages", status: "done" },
    ],
  },
  {
    title: "Signature",
    icon: "pencil-outline",
    items: [
      { label: "Draw signature on canvas", status: "done" },
      { label: "Type signature (styled font)", status: "done" },
      { label: "Save signature for reuse", status: "done" },
      { label: "Place signature on PDF", status: "progress" },
      { label: "Resize & reposition signature", status: "planned" },
    ],
  },
  {
    title: "Form Filling",
    icon: "list-outline",
    items: [
      { label: "Form field UI", status: "done" },
      { label: "Auto-detect form fields (AcroForms)", status: "planned" },
      { label: "Fill text fields, checkboxes, dropdowns", status: "planned" },
      { label: "Flatten forms on export", status: "planned" },
    ],
  },
  {
    title: "Document Tools",
    icon: "construct-outline",
    items: [
      { label: "Merge PDFs (pdf-lib)", status: "done" },
      { label: "Split PDF by range (pdf-lib)", status: "done" },
      { label: "Split PDF every N pages (pdf-lib)", status: "done" },
      { label: "Compress PDF (pdf-lib)", status: "done" },
      { label: "Add text watermark (pdf-lib)", status: "done" },
      { label: "Password protection UI", status: "done" },
      { label: "AES-256 encryption (production APK)", status: "planned", note: "Needs native crypto" },
      { label: "Header / footer text", status: "planned" },
      { label: "Page numbering", status: "planned" },
    ],
  },
  {
    title: "Page Management",
    icon: "documents-outline",
    items: [
      { label: "Page manager grid view", status: "done" },
      { label: "Rotate pages (pdf-lib)", status: "done" },
      { label: "Delete pages (pdf-lib)", status: "done" },
      { label: "Extract pages to new PDF (pdf-lib)", status: "done" },
      { label: "Reorder pages (drag and drop)", status: "planned" },
      { label: "Insert blank page", status: "planned" },
    ],
  },
  {
    title: "Export & Share",
    icon: "share-outline",
    items: [
      { label: "Share output via Android sheet", status: "done" },
      { label: "Save to Downloads / device storage", status: "done" },
      { label: "Real-time file size before/after", status: "done" },
      { label: "Export as PDF/A (archival)", status: "planned" },
    ],
  },
  {
    title: "Play Store",
    icon: "logo-google-playstore",
    items: [
      { label: "App icon (512×512)", status: "done" },
      { label: "Adaptive icon (Android)", status: "done" },
      { label: "Splash screen", status: "done" },
      { label: "Feature graphic (1024×500)", status: "done" },
      { label: "Package: com.pdfx.editor", status: "done" },
      { label: "EAS Build config (APK + AAB)", status: "done" },
      { label: "Play Store guide", status: "done" },
      { label: "Privacy policy URL", status: "planned" },
      { label: "Screenshots (8 phone screens)", status: "planned" },
      { label: "Signed release APK", status: "planned", note: "Run: eas build --platform android" },
    ],
  },
];

export default function TodoScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<Status | "all">("all");

  const topPad = Platform.OS === "web" ? 67 : Math.max(insets.top, 0);
  const botPad = Platform.OS === "web" ? 34 : Math.max(insets.bottom, 16);

  const allItems = SECTIONS.flatMap((s) => s.items);
  const done = allItems.filter((i) => i.status === "done").length;
  const progress = allItems.filter((i) => i.status === "progress").length;
  const planned = allItems.filter((i) => i.status === "planned").length;
  const pct = Math.round((done / allItems.length) * 100);

  return (
    <View style={[styles.container, { paddingTop: topPad, paddingBottom: botPad }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.dark.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Feature Tracker</Text>
        <View style={{ width: 48 }} />
      </View>

      {/* Progress bar */}
      <View style={styles.progressCard}>
        <View style={styles.progressTop}>
          <Text style={styles.progressPct}>{pct}% Complete</Text>
          <Text style={styles.progressSub}>
            {done} done · {progress} in progress · {planned} planned
          </Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${pct}%` as any }]} />
        </View>
        <View style={styles.legendRow}>
          {(["done", "progress", "planned"] as Status[]).map((s) => (
            <View key={s} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: STATUS_COLOR[s] }]} />
              <Text style={styles.legendLabel}>{STATUS_LABEL[s]}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Filter chips */}
      <View style={styles.filters}>
        {(["all", "done", "progress", "planned"] as const).map((f) => (
          <Pressable
            key={f}
            style={[styles.chip, filter === f && styles.chipActive]}
            onPress={() => setFilter(f)}
          >
            <Text
              style={[styles.chipText, filter === f && styles.chipTextActive]}
            >
              {f === "all" ? "All" : STATUS_LABEL[f]}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {SECTIONS.map((section) => {
          const filtered =
            filter === "all"
              ? section.items
              : section.items.filter((i) => i.status === filter);
          if (!filtered.length) return null;

          return (
            <View key={section.title} style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons
                  name={section.icon as any}
                  size={18}
                  color={Colors.dark.accent}
                />
                <Text style={styles.sectionTitle}>{section.title}</Text>
                <Text style={styles.sectionCount}>
                  {section.items.filter((i) => i.status === "done").length}/
                  {section.items.length}
                </Text>
              </View>

              {filtered.map((item, idx) => (
                <View key={idx} style={styles.item}>
                  <Ionicons
                    name={STATUS_ICON[item.status] as any}
                    size={18}
                    color={STATUS_COLOR[item.status]}
                  />
                  <View style={styles.itemText}>
                    <Text
                      style={[
                        styles.itemLabel,
                        item.status === "done" && styles.itemDone,
                      ]}
                    >
                      {item.label}
                    </Text>
                    {item.note && (
                      <Text style={styles.itemNote}>{item.note}</Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          );
        })}
        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  iconBtn: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  title: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 18,
    color: Colors.dark.textPrimary,
  },
  progressCard: {
    margin: 16,
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  progressTop: { gap: 4 },
  progressPct: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    color: Colors.dark.textPrimary,
  },
  progressSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.dark.textSecondary,
  },
  progressTrack: {
    height: 8,
    backgroundColor: Colors.dark.surface2,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: Colors.dark.success,
    borderRadius: 4,
  },
  legendRow: { flexDirection: "row", gap: 16 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.dark.textSecondary,
  },
  filters: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: Colors.dark.surface,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  chipActive: {
    backgroundColor: Colors.dark.accent,
    borderColor: Colors.dark.accent,
  },
  chipText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: Colors.dark.textSecondary,
  },
  chipTextActive: { color: "#FFF" },
  scroll: { paddingHorizontal: 16, gap: 16 },
  section: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.dark.surface2,
  },
  sectionTitle: {
    flex: 1,
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.dark.textPrimary,
  },
  sectionCount: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: Colors.dark.textSecondary,
  },
  item: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border + "55",
  },
  itemText: { flex: 1, gap: 2 },
  itemLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.dark.textPrimary,
    lineHeight: 20,
  },
  itemDone: { color: Colors.dark.textSecondary },
  itemNote: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.dark.accent,
  },
});
