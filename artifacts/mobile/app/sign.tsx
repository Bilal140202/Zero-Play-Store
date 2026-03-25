import React, { useState } from "react";
import { View, StyleSheet, Text, Pressable, TextInput, Platform, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { SignatureCanvas } from "@/components/SignatureCanvas";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

type TabType = 'draw' | 'type' | 'saved';

const SAVED_SIGNATURES = [
  { id: '1', type: 'text', content: 'John Doe', font: 'Inter_700Bold', style: 'italic' },
  { id: '2', type: 'text', content: 'J. Doe', font: 'Inter_400Regular', style: 'italic' },
];

export default function SignScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<TabType>('draw');
  const [textSign, setTextSign] = useState("");
  const [paths, setPaths] = useState<string[]>([]);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSave = () => {
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
        <Text style={styles.title}>Create Signature</Text>
        <View style={{ width: 48 }} />
      </View>

      {isSuccess ? (
        <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.successState}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark" size={48} color={Colors.dark.success} />
          </View>
          <Text style={styles.successTitle}>Signature Saved!</Text>
        </Animated.View>
      ) : (
        <>
          <View style={styles.tabs}>
            <Pressable style={[styles.tab, tab === 'draw' && styles.activeTab]} onPress={() => setTab('draw')}>
              <Text style={[styles.tabText, tab === 'draw' && styles.activeTabText]}>Draw</Text>
            </Pressable>
            <Pressable style={[styles.tab, tab === 'type' && styles.activeTab]} onPress={() => setTab('type')}>
              <Text style={[styles.tabText, tab === 'type' && styles.activeTabText]}>Type</Text>
            </Pressable>
            <Pressable style={[styles.tab, tab === 'saved' && styles.activeTab]} onPress={() => setTab('saved')}>
              <Text style={[styles.tabText, tab === 'saved' && styles.activeTabText]}>Saved</Text>
            </Pressable>
          </View>

          <View style={styles.content}>
            {tab === 'draw' && (
              <View style={styles.drawContainer}>
                <View style={styles.canvasWrapper}>
                  <SignatureCanvas onDrawEnd={(p) => setPaths(p)} />
                  <Text style={styles.hintText} pointerEvents="none">Sign here</Text>
                </View>
                <Pressable style={styles.clearBtn} onPress={() => setPaths([])}>
                  <Ionicons name="trash-outline" size={20} color={Colors.dark.accent} />
                  <Text style={styles.clearText}>Clear Signature</Text>
                </Pressable>
              </View>
            )}

            {tab === 'type' && (
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
                    <Pressable style={styles.previewCard}>
                      <Text style={[styles.previewText, { fontFamily: "Inter_700Bold", fontStyle: "italic" }]}>{textSign}</Text>
                    </Pressable>
                    <Pressable style={styles.previewCard}>
                      <Text style={[styles.previewText, { fontFamily: "Inter_400Regular", fontStyle: "italic", letterSpacing: 2 }]}>{textSign}</Text>
                    </Pressable>
                    <Pressable style={styles.previewCard}>
                      <Text style={[styles.previewText, { fontFamily: "Inter_600SemiBold", fontStyle: "normal", letterSpacing: 1 }]}>{textSign}</Text>
                    </Pressable>
                  </ScrollView>
                )}
              </View>
            )}

            {tab === 'saved' && (
              <ScrollView style={styles.savedContainer}>
                {SAVED_SIGNATURES.map((sig) => (
                  <View key={sig.id} style={styles.savedCard}>
                    <View style={styles.savedPreviewBox}>
                      <Text style={[styles.previewText, { fontFamily: sig.font, fontStyle: sig.style as any }]}>{sig.content}</Text>
                    </View>
                    <View style={styles.savedActions}>
                      <Pressable style={styles.savedUseBtn} onPress={handleSave}>
                        <Text style={styles.savedUseText}>Use Signature</Text>
                      </Pressable>
                      <Pressable style={styles.savedDeleteBtn}>
                        <Ionicons name="trash-outline" size={24} color={Colors.dark.warning} />
                      </Pressable>
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>

          {tab !== 'saved' && (
            <View style={styles.footer}>
              <Pressable style={styles.saveSecondaryBtn} onPress={handleSave}>
                <Text style={styles.saveSecondaryText}>Save for Reuse</Text>
              </Pressable>
              <Pressable style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.saveBtnText}>Save to PDF</Text>
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
  tabs: {
    flexDirection: "row",
    paddingHorizontal: 24,
    marginBottom: 24,
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
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: Colors.dark.border,
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
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
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
    borderWidth: 2,
    borderColor: "transparent",
  },
  previewText: {
    color: "#0F172A",
    fontSize: 36,
  },
  savedContainer: {
    flex: 1,
  },
  savedCard: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    overflow: "hidden",
  },
  savedPreviewBox: {
    backgroundColor: "#FFF",
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  savedActions: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 16,
  },
  savedUseBtn: {
    flex: 1,
    backgroundColor: Colors.dark.accent,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  savedUseText: {
    fontFamily: "Inter_600SemiBold",
    color: "#FFF",
    fontSize: 14,
  },
  savedDeleteBtn: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(245, 158, 11, 0.1)",
    borderRadius: 8,
  },
  footer: {
    flexDirection: "row",
    padding: 24,
    gap: 16,
  },
  saveSecondaryBtn: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.dark.accent,
  },
  saveSecondaryText: {
    fontFamily: "Inter_600SemiBold",
    color: Colors.dark.accent,
    fontSize: 16,
  },
  saveBtn: {
    flex: 1,
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
