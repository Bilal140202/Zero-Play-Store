import React, { useState } from "react";
import {
  ActivityIndicator,
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
import * as Haptics from "expo-haptics";
import * as DocumentPicker from "expo-document-picker";
import { batchEmbedTextFields } from "@/lib/pdfEngine";

interface FormField {
  id: string;
  label: string;
  value: string;
  page: string;
  position: "top" | "middle" | "bottom";
}

const POSITIONS: { key: FormField["position"]; label: string; yFrac: number }[] = [
  { key: "top",    label: "Top",    yFrac: 0.12 },
  { key: "middle", label: "Middle", yFrac: 0.50 },
  { key: "bottom", label: "Bottom", yFrac: 0.85 },
];

function makeId(): string {
  return Date.now().toString() + Math.random().toString(36).slice(2, 9);
}

function makeDefaultField(): FormField {
  return { id: makeId(), label: "", value: "", page: "1", position: "middle" };
}

export default function FormsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();

  const [fileUri,   setFileUri]   = useState((params.fileUri  as string) || "");
  const [fileName,  setFileName]  = useState((params.fileName as string) || "");
  const [fields,    setFields]    = useState<FormField[]>([makeDefaultField()]);
  const [isWorking, setIsWorking] = useState(false);
  const [picking,   setPicking]   = useState(false);

  const pickFile = async () => {
    if (picking) return;
    setPicking(true);
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true,
      });
      if (!res.canceled && res.assets?.length) {
        setFileUri(res.assets[0].uri);
        setFileName(res.assets[0].name);
      }
    } finally {
      setPicking(false);
    }
  };

  const updateField = (id: string, patch: Partial<FormField>) => {
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  };

  const addField = () => {
    if (Platform.OS !== "web")
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFields((prev) => [...prev, makeDefaultField()]);
  };

  const removeField = (id: string) => {
    if (fields.length === 1) return;
    setFields((prev) => prev.filter((f) => f.id !== id));
  };

  const hasContent = fields.some((f) => f.value.trim().length > 0);

  const handleApply = async () => {
    if (!fileUri) {
      Alert.alert("No PDF", "Please select a PDF file first.");
      return;
    }
    const filled = fields.filter((f) => f.value.trim());
    if (!filled.length) {
      Alert.alert("Nothing to embed", "Fill in at least one field.");
      return;
    }

    setIsWorking(true);
    try {
      const payload = filled.map((f) => ({
        value:    f.value.trim(),
        page:     Math.max(1, parseInt(f.page) || 1),
        yFrac:    POSITIONS.find((p) => p.key === f.position)?.yFrac ?? 0.5,
        fontSize: 13,
        hexColor: "#000000",
      }));

      const outName = "filled_" + fileName;
      await batchEmbedTextFields(fileUri, payload, outName);

      if (Platform.OS !== "web")
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      setFields([makeDefaultField()]);
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Could not embed text into the PDF.");
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.dark.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Fill PDF</Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* File picker */}
        <Pressable
          style={[styles.filePicker, fileUri && styles.filePickerFilled]}
          onPress={pickFile}
          disabled={picking}
        >
          <Ionicons
            name={fileUri ? "document-text" : "folder-open-outline"}
            size={28}
            color={fileUri ? Colors.dark.accent : Colors.dark.textSecondary}
          />
          <View style={styles.filePickerText}>
            <Text
              style={[styles.filePickerMain, fileUri && { color: Colors.dark.textPrimary }]}
              numberOfLines={1}
            >
              {fileUri ? fileName : "Select a PDF file"}
            </Text>
            <Text style={styles.filePickerSub}>
              {fileUri ? "Tap to change file" : "Browse device storage"}
            </Text>
          </View>
          {picking && <ActivityIndicator size="small" color={Colors.dark.accent} />}
        </Pressable>

        {/* Info card */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={18} color={Colors.dark.accent} />
          <Text style={styles.infoText}>
            Add text fields below. Each entry will be overlaid onto the
            specified page at the chosen position and saved into the PDF.
          </Text>
        </View>

        {/* Fields */}
        {fields.map((field, idx) => (
          <View key={field.id} style={styles.fieldCard}>
            {/* Card header */}
            <View style={styles.fieldHeader}>
              <Text style={styles.fieldIndex}>Field {idx + 1}</Text>
              {fields.length > 1 && (
                <Pressable
                  onPress={() => removeField(field.id)}
                  hitSlop={8}
                >
                  <Ionicons name="close-circle-outline" size={20} color={Colors.dark.warning} />
                </Pressable>
              )}
            </View>

            {/* Label */}
            <TextInput
              style={styles.labelInput}
              placeholder="Label (e.g. Full Name, Date)"
              placeholderTextColor={Colors.dark.textSecondary}
              value={field.label}
              onChangeText={(v) => updateField(field.id, { label: v })}
              returnKeyType="next"
            />

            {/* Value */}
            <TextInput
              style={styles.valueInput}
              placeholder="Value to embed in PDF"
              placeholderTextColor={Colors.dark.textSecondary}
              value={field.value}
              onChangeText={(v) => updateField(field.id, { value: v })}
              multiline
              numberOfLines={2}
              textAlignVertical="top"
            />

            {/* Page + position row */}
            <View style={styles.fieldMeta}>
              <View style={styles.pageRow}>
                <Text style={styles.metaLabel}>Page</Text>
                <TextInput
                  style={styles.pageInput}
                  value={field.page}
                  onChangeText={(v) => updateField(field.id, { page: v.replace(/\D/g, "") || "1" })}
                  keyboardType="number-pad"
                  maxLength={4}
                />
              </View>

              <View style={styles.posRow}>
                {POSITIONS.map((p) => (
                  <Pressable
                    key={p.key}
                    style={[
                      styles.posBtn,
                      field.position === p.key && styles.posBtnActive,
                    ]}
                    onPress={() => updateField(field.id, { position: p.key })}
                  >
                    <Text
                      style={[
                        styles.posBtnText,
                        field.position === p.key && styles.posBtnTextActive,
                      ]}
                    >
                      {p.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        ))}

        {/* Add field */}
        <Pressable style={styles.addBtn} onPress={addField}>
          <Ionicons name="add-circle-outline" size={20} color={Colors.dark.accent} />
          <Text style={styles.addBtnText}>Add Another Field</Text>
        </Pressable>

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Footer */}
      <View
        style={[
          styles.footer,
          { paddingBottom: Math.max(insets.bottom, 16) },
        ]}
      >
        <Pressable
          style={[
            styles.applyBtn,
            (!fileUri || !hasContent || isWorking) && { opacity: 0.45 },
          ]}
          onPress={handleApply}
          disabled={!fileUri || !hasContent || isWorking}
        >
          {isWorking ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={20} color="#FFF" />
              <Text style={styles.applyBtnText}>Embed Text & Save PDF</Text>
            </>
          )}
        </Pressable>
      </View>
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
    padding: 16,
    gap: 16,
  },

  filePicker: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.dark.surface,
    borderRadius: 14,
    padding: 16,
    gap: 14,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: Colors.dark.border,
  },
  filePickerFilled: {
    borderStyle: "solid",
    borderColor: Colors.dark.accent + "60",
  },
  filePickerText: { flex: 1 },
  filePickerMain: {
    fontFamily: "Inter_500Medium",
    fontSize: 15,
    color: Colors.dark.textSecondary,
  },
  filePickerSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.dark.textSecondary,
    marginTop: 2,
  },

  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: Colors.dark.accent + "12",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.dark.accent + "30",
  },
  infoText: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.dark.textSecondary,
    lineHeight: 19,
  },

  fieldCard: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 14,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  fieldHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  fieldIndex: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.dark.accent,
  },

  labelInput: {
    backgroundColor: Colors.dark.surface2,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.dark.textPrimary,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  valueInput: {
    backgroundColor: Colors.dark.surface2,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.dark.textPrimary,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    minHeight: 70,
  },

  fieldMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  pageRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  metaLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: Colors.dark.textSecondary,
  },
  pageInput: {
    backgroundColor: Colors.dark.surface2,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: Colors.dark.textPrimary,
    width: 52,
    textAlign: "center",
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  posRow: {
    flex: 1,
    flexDirection: "row",
    gap: 6,
  },
  posBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: Colors.dark.surface2,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  posBtnActive: {
    backgroundColor: Colors.dark.accent + "22",
    borderColor: Colors.dark.accent,
  },
  posBtnText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: Colors.dark.textSecondary,
  },
  posBtnTextActive: {
    color: Colors.dark.accent,
  },

  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 14,
    borderRadius: 12,
    backgroundColor: Colors.dark.surface,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: Colors.dark.accent + "50",
  },
  addBtnText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: Colors.dark.accent,
  },

  footer: {
    padding: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
    backgroundColor: Colors.dark.surface,
  },
  applyBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: Colors.dark.accent,
    borderRadius: 14,
    paddingVertical: 16,
  },
  applyBtnText: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: "#FFF",
  },
});
