import React, { useState } from "react";
import { View, StyleSheet, Text, Pressable, TextInput, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { SignatureCanvas } from "@/components/SignatureCanvas";

export default function SignScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<'draw' | 'type'>('draw');
  const [textSign, setTextSign] = useState("");
  const [paths, setPaths] = useState<string[]>([]);

  const handleSave = () => {
    router.back();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.dark.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Create Signature</Text>
        <View style={{ width: 48 }} />
      </View>

      <View style={styles.tabs}>
        <Pressable style={[styles.tab, tab === 'draw' && styles.activeTab]} onPress={() => setTab('draw')}>
          <Text style={[styles.tabText, tab === 'draw' && styles.activeTabText]}>Draw</Text>
        </Pressable>
        <Pressable style={[styles.tab, tab === 'type' && styles.activeTab]} onPress={() => setTab('type')}>
          <Text style={[styles.tabText, tab === 'type' && styles.activeTabText]}>Type</Text>
        </Pressable>
      </View>

      <View style={styles.content}>
        {tab === 'draw' ? (
          <View style={styles.drawContainer}>
            <View style={styles.canvasWrapper}>
              <SignatureCanvas onDrawEnd={(p) => setPaths(p)} />
              <Text style={styles.hintText} pointerEvents="none">Sign here</Text>
            </View>
            <Pressable style={styles.clearBtn} onPress={() => setPaths([])}>
              <Text style={styles.clearText}>Clear Signature</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.typeContainer}>
            <TextInput
              style={styles.input}
              placeholder="Type your name"
              placeholderTextColor={Colors.dark.textSecondary}
              value={textSign}
              onChangeText={setTextSign}
              autoFocus
            />
            {!!textSign && (
              <ScrollView style={styles.previews}>
                <View style={styles.previewCard}>
                  <Text style={[styles.previewText, { fontFamily: "Inter_700Bold", fontStyle: "italic" }]}>{textSign}</Text>
                </View>
                <View style={styles.previewCard}>
                  <Text style={[styles.previewText, { fontFamily: "Inter_400Regular", fontStyle: "italic", letterSpacing: 2 }]}>{textSign}</Text>
                </View>
              </ScrollView>
            )}
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <Pressable style={styles.saveBtn} onPress={handleSave}>
          <Text style={styles.saveBtnText}>Save Signature</Text>
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
  tabs: {
    flexDirection: "row",
    paddingHorizontal: 24,
    marginBottom: 24,
    gap: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  activeTab: {
    borderBottomColor: Colors.dark.accent,
  },
  tabText: {
    fontFamily: "Inter_500Medium",
    color: Colors.dark.textSecondary,
    fontSize: 16,
  },
  activeTabText: {
    color: Colors.dark.textPrimary,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  drawContainer: {
    flex: 1,
  },
  canvasWrapper: {
    flex: 1,
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
    maxHeight: 400,
  },
  hintText: {
    position: "absolute",
    top: "50%",
    left: 0,
    right: 0,
    textAlign: "center",
    color: "#E2E8F0",
    fontSize: 24,
    fontFamily: "Inter_600SemiBold",
    opacity: 0.5,
    transform: [{ translateY: -12 }],
  },
  clearBtn: {
    alignSelf: "center",
    padding: 16,
  },
  clearText: {
    color: Colors.dark.accent,
    fontFamily: "Inter_500Medium",
  },
  typeContainer: {
    flex: 1,
  },
  input: {
    backgroundColor: Colors.dark.surface,
    padding: 16,
    borderRadius: 12,
    color: Colors.dark.textPrimary,
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  previews: {
    marginTop: 24,
  },
  previewCard: {
    backgroundColor: "#FFFFFF",
    padding: 32,
    borderRadius: 16,
    marginBottom: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  previewText: {
    color: "#000",
    fontSize: 32,
  },
  footer: {
    padding: 24,
  },
  saveBtn: {
    backgroundColor: Colors.dark.accent,
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  saveBtnText: {
    fontFamily: "Inter_600SemiBold",
    color: "#FFF",
    fontSize: 16,
  },
});
