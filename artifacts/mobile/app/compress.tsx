import React, { useState } from "react";
import { View, StyleSheet, Text, Pressable, Platform, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withTiming, withSequence, runOnJS } from "react-native-reanimated";

export default function CompressScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [level, setLevel] = useState(1); // 0: Low, 1: Medium, 2: High
  const [isCompressing, setIsCompressing] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const progress = useSharedValue(0);

  const handleCompress = () => {
    setIsCompressing(true);
    progress.value = withSequence(
      withTiming(0.4, { duration: 800 }),
      withTiming(0.8, { duration: 1200 }),
      withTiming(1, { duration: 500 }, () => {
        runOnJS(setIsDone)(true);
        runOnJS(setIsCompressing)(false);
      })
    );
  };

  const pStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.dark.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Compress PDF</Text>
        <View style={{ width: 48 }} />
      </View>

      <View style={styles.content}>
        {isDone ? (
          <Animated.View entering={FadeIn} style={styles.doneState}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark" size={48} color={Colors.dark.success} />
            </View>
            <Text style={styles.successTitle}>Compression Complete</Text>
            
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Original</Text>
                <Text style={styles.statValue}>12.4 MB</Text>
              </View>
              <Ionicons name="arrow-forward" size={24} color={Colors.dark.textSecondary} />
              <View style={[styles.statBox, styles.statBoxSuccess]}>
                <Text style={styles.statLabel}>Compressed</Text>
                <Text style={[styles.statValue, { color: Colors.dark.success }]}>2.1 MB</Text>
              </View>
            </View>
            
            <Pressable style={styles.actionBtn} onPress={() => router.back()}>
              <Text style={styles.actionBtnText}>Done</Text>
            </Pressable>
          </Animated.View>
        ) : (
          <>
            <View style={styles.fileCard}>
              <Ionicons name="document" size={32} color={Colors.dark.accent} />
              <View style={styles.fileInfo}>
                <Text style={styles.fileName}>Annual_Report_2024.pdf</Text>
                <Text style={styles.fileSize}>12.4 MB</Text>
              </View>
            </View>

            <View style={styles.levelSection}>
              <Text style={styles.sectionTitle}>Compression Level</Text>
              <View style={styles.levelOptions}>
                {['Low', 'Medium', 'High'].map((l, i) => (
                  <Pressable
                    key={l}
                    style={[styles.levelBtn, level === i && styles.levelBtnActive]}
                    onPress={() => setLevel(i)}
                  >
                    <Text style={[styles.levelText, level === i && styles.levelTextActive]}>
                      {l}
                    </Text>
                    {level === i && (
                      <Text style={styles.levelSubText}>
                        {i === 0 ? 'Less compression, better quality' : i === 1 ? 'Balanced size & quality' : 'Smallest size, lower quality'}
                      </Text>
                    )}
                  </Pressable>
                ))}
              </View>
            </View>

            {isCompressing && (
              <View style={styles.progressContainer}>
                <Text style={styles.progressLabel}>Compressing...</Text>
                <View style={styles.progressBarBg}>
                  <Animated.View style={[styles.progressBarFill, pStyle]} />
                </View>
              </View>
            )}

            <View style={{ flex: 1 }} />

            {!isCompressing && (
              <Pressable style={styles.actionBtn} onPress={handleCompress}>
                <Text style={styles.actionBtnText}>Compress Now</Text>
              </Pressable>
            )}
          </>
        )}
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
  content: {
    flex: 1,
    padding: 24,
  },
  fileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.dark.surface,
    padding: 16,
    borderRadius: 16,
    gap: 16,
    marginBottom: 32,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontFamily: "Inter_600SemiBold",
    color: Colors.dark.textPrimary,
    fontSize: 16,
    marginBottom: 4,
  },
  fileSize: {
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textSecondary,
    fontSize: 14,
  },
  levelSection: {
    gap: 16,
  },
  sectionTitle: {
    fontFamily: "Inter_600SemiBold",
    color: Colors.dark.textPrimary,
    fontSize: 18,
  },
  levelOptions: {
    gap: 12,
  },
  levelBtn: {
    backgroundColor: Colors.dark.surface,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderRadius: 16,
    padding: 16,
  },
  levelBtnActive: {
    borderColor: Colors.dark.accent,
    backgroundColor: "rgba(99, 102, 241, 0.1)",
  },
  levelText: {
    fontFamily: "Inter_500Medium",
    color: Colors.dark.textSecondary,
    fontSize: 16,
  },
  levelTextActive: {
    color: Colors.dark.accent,
    fontFamily: "Inter_700Bold",
  },
  levelSubText: {
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
  progressContainer: {
    marginTop: 32,
    gap: 12,
  },
  progressLabel: {
    fontFamily: "Inter_500Medium",
    color: Colors.dark.textPrimary,
    fontSize: 14,
    textAlign: "center",
  },
  progressBarBg: {
    height: 8,
    backgroundColor: Colors.dark.surface2,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: Colors.dark.accent,
    borderRadius: 4,
  },
  actionBtn: {
    backgroundColor: Colors.dark.accent,
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  actionBtnText: {
    fontFamily: "Inter_600SemiBold",
    color: "#FFF",
    fontSize: 16,
  },
  doneState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  successTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 24,
    color: Colors.dark.textPrimary,
    marginBottom: 32,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 48,
    width: "100%",
  },
  statBox: {
    flex: 1,
    backgroundColor: Colors.dark.surface,
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  statBoxSuccess: {
    backgroundColor: "rgba(16, 185, 129, 0.05)",
    borderWidth: 1,
    borderColor: Colors.dark.success,
  },
  statLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.dark.textSecondary,
    marginBottom: 8,
  },
  statValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: Colors.dark.textPrimary,
  }
});
