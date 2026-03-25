import React, { useState } from "react";
import { View, StyleSheet, Text, Pressable, ScrollView, Platform, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import * as Haptics from "expo-haptics";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

type Method = 'range' | 'fixed';

export default function SplitScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [method, setMethod] = useState<Method>('range');
  const [ranges, setRanges] = useState([{ start: 1, end: 5 }]);
  const [fixedCount, setFixedCount] = useState("5");
  const [isSuccess, setIsSuccess] = useState(false);

  const totalPages = 15;

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
        <Text style={styles.title}>Split PDF</Text>
        <View style={{ width: 48 }} />
      </View>

      {isSuccess ? (
        <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.successState}>
          <View style={styles.successIcon}>
            <Ionicons name="cut" size={48} color={Colors.dark.success} />
          </View>
          <Text style={styles.successTitle}>PDF Split Successfully</Text>
        </Animated.View>
      ) : (
        <>
          <View style={styles.tabs}>
            <Pressable style={[styles.tab, method === 'range' && styles.activeTab]} onPress={() => setMethod('range')}>
              <Text style={[styles.tabText, method === 'range' && styles.activeTabText]}>By Range</Text>
            </Pressable>
            <Pressable style={[styles.tab, method === 'fixed' && styles.activeTab]} onPress={() => setMethod('fixed')}>
              <Text style={[styles.tabText, method === 'fixed' && styles.activeTabText]}>Fixed Count</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.infoCard}>
              <Ionicons name="document-text" size={32} color={Colors.dark.accent} />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoTitle}>Annual_Report.pdf</Text>
                <Text style={styles.infoSub}>{totalPages} pages total</Text>
              </View>
            </View>

            {method === 'range' ? (
              <View style={styles.methodSection}>
                <Text style={styles.sectionTitle}>Extract Pages</Text>
                <Text style={styles.sectionDesc}>Define the page ranges you want to extract into separate files.</Text>
                
                {ranges.map((r, i) => (
                  <View key={i} style={styles.rangeRow}>
                    <Text style={styles.rangeLabel}>Part {i+1}</Text>
                    <View style={styles.rangeInputs}>
                      <TextInput style={styles.input} value={r.start.toString()} keyboardType="numeric" />
                      <Text style={styles.rangeTo}>to</Text>
                      <TextInput style={styles.input} value={r.end.toString()} keyboardType="numeric" />
                    </View>
                    {ranges.length > 1 && (
                      <Pressable style={styles.removeRange} onPress={() => setRanges(ranges.filter((_, idx) => idx !== i))}>
                        <Ionicons name="close-circle" size={24} color={Colors.dark.textSecondary} />
                      </Pressable>
                    )}
                  </View>
                ))}

                <Pressable 
                  style={styles.addRangeBtn} 
                  onPress={() => setRanges([...ranges, { start: ranges[ranges.length-1].end + 1, end: Math.min(totalPages, ranges[ranges.length-1].end + 5) }])}
                >
                  <Ionicons name="add" size={20} color={Colors.dark.accent} />
                  <Text style={styles.addRangeText}>Add another range</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.methodSection}>
                <Text style={styles.sectionTitle}>Split Every N Pages</Text>
                <Text style={styles.sectionDesc}>The document will be divided into multiple files, each containing the specified number of pages.</Text>
                
                <View style={styles.fixedInputContainer}>
                  <Text style={styles.fixedLabel}>Pages per file:</Text>
                  <TextInput 
                    style={styles.fixedInput} 
                    value={fixedCount} 
                    onChangeText={setFixedCount} 
                    keyboardType="numeric" 
                  />
                </View>
                
                <View style={styles.previewBox}>
                  <Ionicons name="information-circle-outline" size={20} color={Colors.dark.accent} />
                  <Text style={styles.previewText}>
                    This will create {Math.ceil(totalPages / (parseInt(fixedCount) || 1))} files.
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <Pressable style={styles.applyBtn} onPress={handleApply}>
              <Text style={styles.applyBtnText}>Split PDF</Text>
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
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.dark.surface,
    padding: 16,
    borderRadius: 16,
    gap: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: Colors.dark.textPrimary,
    marginBottom: 4,
  },
  infoSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.dark.textSecondary,
  },
  methodSection: {
    gap: 16,
  },
  sectionTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 18,
    color: Colors.dark.textPrimary,
  },
  sectionDesc: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.dark.textSecondary,
    lineHeight: 20,
    marginBottom: 8,
  },
  rangeRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.dark.surface,
    padding: 16,
    borderRadius: 12,
    gap: 16,
  },
  rangeLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: Colors.dark.textPrimary,
    width: 50,
  },
  rangeInputs: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.dark.surface2,
    height: 40,
    borderRadius: 8,
    color: Colors.dark.textPrimary,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  rangeTo: {
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textSecondary,
  },
  removeRange: {
    padding: 4,
  },
  addRangeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.dark.accent,
    borderStyle: "dashed",
    borderRadius: 12,
    marginTop: 8,
  },
  addRangeText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: Colors.dark.accent,
  },
  fixedInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    backgroundColor: Colors.dark.surface,
    padding: 16,
    borderRadius: 12,
  },
  fixedLabel: {
    flex: 1,
    fontFamily: "Inter_500Medium",
    fontSize: 16,
    color: Colors.dark.textPrimary,
  },
  fixedInput: {
    width: 80,
    backgroundColor: Colors.dark.surface2,
    height: 48,
    borderRadius: 8,
    color: Colors.dark.textPrimary,
    fontFamily: "Inter_600SemiBold",
    fontSize: 18,
    textAlign: "center",
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  previewBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(99, 102, 241, 0.1)",
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  previewText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: Colors.dark.accent,
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
