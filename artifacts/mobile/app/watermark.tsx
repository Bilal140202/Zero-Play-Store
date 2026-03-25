import React, { useState } from "react";
import { View, StyleSheet, Text, Pressable, ScrollView, TextInput, Platform } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import * as Haptics from "expo-haptics";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

type TabType = 'text' | 'image';

export default function WatermarkScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<TabType>('text');
  
  const [text, setText] = useState("CONFIDENTIAL");
  const [color, setColor] = useState("#EF4444");
  const [opacity, setOpacity] = useState(0.5);
  const [position, setPosition] = useState<'diagonal' | 'horizontal'>('diagonal');
  
  const [isSuccess, setIsSuccess] = useState(false);

  const COLORS = ["#EF4444", "#3B82F6", "#10B981", "#94A3B8", "#000000"];

  const handleApply = () => {
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
        <Text style={styles.title}>Add Watermark</Text>
        <View style={{ width: 48 }} />
      </View>

      {isSuccess ? (
        <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.successState}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark" size={48} color={Colors.dark.success} />
          </View>
          <Text style={styles.successTitle}>Watermark Applied!</Text>
        </Animated.View>
      ) : (
        <>
          <View style={styles.tabs}>
            <Pressable style={[styles.tab, tab === 'text' && styles.activeTab]} onPress={() => setTab('text')}>
              <Text style={[styles.tabText, tab === 'text' && styles.activeTabText]}>Text</Text>
            </Pressable>
            <Pressable style={[styles.tab, tab === 'image' && styles.activeTab]} onPress={() => setTab('image')}>
              <Text style={[styles.tabText, tab === 'image' && styles.activeTabText]}>Image</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.previewContainer}>
              <View style={styles.pdfPage}>
                <View style={styles.pdfLine} />
                <View style={[styles.pdfLine, { width: '80%' }]} />
                <View style={[styles.pdfLine, { width: '60%' }]} />
                <View style={styles.pdfBlock} />
                <View style={styles.pdfLine} />
                <View style={[styles.pdfLine, { width: '40%' }]} />
                
                {tab === 'text' && !!text && (
                  <View style={[
                    styles.watermarkOverlay,
                    position === 'diagonal' ? { transform: [{ rotate: '-45deg' }] } : {}
                  ]}>
                    <Text style={[
                      styles.watermarkTextPreview,
                      { color, opacity }
                    ]}>
                      {text}
                    </Text>
                  </View>
                )}
                {tab === 'image' && (
                  <View style={[styles.watermarkOverlay, { opacity: 0.3 }]}>
                    <Ionicons name="image" size={100} color="#000" />
                  </View>
                )}
              </View>
            </View>

            {tab === 'text' ? (
              <View style={styles.controls}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Watermark Text</Text>
                  <TextInput
                    style={styles.input}
                    value={text}
                    onChangeText={setText}
                    placeholder="Enter text..."
                    placeholderTextColor={Colors.dark.textSecondary}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Color</Text>
                  <View style={styles.colorRow}>
                    {COLORS.map(c => (
                      <Pressable 
                        key={c} 
                        style={[styles.colorDot, { backgroundColor: c }, color === c && styles.activeColorDot]}
                        onPress={() => setColor(c)}
                      />
                    ))}
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Orientation</Text>
                  <View style={styles.orientationRow}>
                    <Pressable 
                      style={[styles.orientBtn, position === 'diagonal' && styles.activeOrientBtn]}
                      onPress={() => setPosition('diagonal')}
                    >
                      <Ionicons name="expand" size={24} color={position === 'diagonal' ? Colors.dark.accent : Colors.dark.textSecondary} style={{ transform: [{ rotate: '-45deg' }] }} />
                      <Text style={[styles.orientText, position === 'diagonal' && styles.activeOrientText]}>Diagonal</Text>
                    </Pressable>
                    <Pressable 
                      style={[styles.orientBtn, position === 'horizontal' && styles.activeOrientBtn]}
                      onPress={() => setPosition('horizontal')}
                    >
                      <Ionicons name="remove" size={24} color={position === 'horizontal' ? Colors.dark.accent : Colors.dark.textSecondary} />
                      <Text style={[styles.orientText, position === 'horizontal' && styles.activeOrientText]}>Horizontal</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.controls}>
                <Pressable style={styles.imagePickerBtn}>
                  <Ionicons name="images-outline" size={32} color={Colors.dark.accent} />
                  <Text style={styles.imagePickerText}>Select Image</Text>
                </Pressable>
              </View>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <Pressable style={styles.applyBtn} onPress={handleApply}>
              <Text style={styles.applyBtnText}>Apply Watermark</Text>
            </Pressable>
          </View>
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
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  activeTab: {
    borderBottomColor: Colors.dark.accent,
  },
  tabText: {
    fontFamily: "Inter_500Medium",
    fontSize: 16,
    color: Colors.dark.textSecondary,
  },
  activeTabText: {
    color: Colors.dark.textPrimary,
  },
  content: {
    padding: 24,
    gap: 32,
  },
  previewContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
    backgroundColor: Colors.dark.surface2,
    borderRadius: 16,
  },
  pdfPage: {
    width: 200,
    height: 280,
    backgroundColor: "#FFF",
    borderRadius: 8,
    padding: 16,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
    overflow: "hidden",
  },
  pdfLine: {
    height: 6,
    backgroundColor: "#E2E8F0",
    borderRadius: 3,
  },
  pdfBlock: {
    height: 40,
    backgroundColor: "#F1F5F9",
    borderRadius: 4,
  },
  watermarkOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  watermarkTextPreview: {
    fontFamily: "Inter_700Bold",
    fontSize: 32,
    textAlign: "center",
    letterSpacing: 2,
  },
  controls: {
    gap: 24,
  },
  inputGroup: {
    gap: 12,
  },
  label: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: Colors.dark.textPrimary,
  },
  input: {
    backgroundColor: Colors.dark.surface,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderRadius: 12,
    padding: 16,
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    color: Colors.dark.textPrimary,
  },
  colorRow: {
    flexDirection: "row",
    gap: 16,
  },
  colorDot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "transparent",
  },
  activeColorDot: {
    borderColor: Colors.dark.textPrimary,
  },
  orientationRow: {
    flexDirection: "row",
    gap: 16,
  },
  orientBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.dark.surface,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    padding: 16,
    borderRadius: 12,
  },
  activeOrientBtn: {
    borderColor: Colors.dark.accent,
    backgroundColor: "rgba(99, 102, 241, 0.1)",
  },
  orientText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: Colors.dark.textSecondary,
  },
  activeOrientText: {
    color: Colors.dark.accent,
  },
  imagePickerBtn: {
    backgroundColor: Colors.dark.surface,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: Colors.dark.border,
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  imagePickerText: {
    fontFamily: "Inter_500Medium",
    fontSize: 16,
    color: Colors.dark.textPrimary,
  },
  footer: {
    padding: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
  },
  applyBtn: {
    backgroundColor: Colors.dark.accent,
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  applyBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: "#FFF",
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
