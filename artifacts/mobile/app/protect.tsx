import React, { useState } from "react";
import { View, StyleSheet, Text, Pressable, TextInput, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

export default function ProtectScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isProtected, setIsProtected] = useState(false);

  const handleProtect = () => {
    if (!password || password !== confirm) return;
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsProtected(true);
    setTimeout(() => {
      router.back();
    }, 2000);
  };

  const isFormValid = password.length >= 4 && password === confirm;

  return (
    <KeyboardAvoidingView 
      style={styles.flex} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 24) }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.iconBtn}>
            <Ionicons name="arrow-back" size={24} color={Colors.dark.textPrimary} />
          </Pressable>
          <Text style={styles.title}>Protect PDF</Text>
          <View style={{ width: 48 }} />
        </View>

        {isProtected ? (
          <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.successState}>
            <View style={styles.successIcon}>
              <Ionicons name="shield-checkmark" size={48} color={Colors.dark.success} />
            </View>
            <Text style={styles.successTitle}>PDF Protected</Text>
            <Text style={styles.successSub}>Your document is now encrypted</Text>
          </Animated.View>
        ) : (
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.heroSection}>
              <View style={styles.lockIconContainer}>
                <Ionicons name="lock-closed" size={48} color={Colors.dark.accent} />
              </View>
              <Text style={styles.heroTitle}>Set Password</Text>
              <Text style={styles.heroSub}>Encrypt your document with AES-256 to prevent unauthorized access.</Text>
            </View>

            <View style={styles.formSection}>
              <View style={styles.inputContainer}>
                <Ionicons name="key-outline" size={20} color={Colors.dark.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter password"
                  placeholderTextColor={Colors.dark.textSecondary}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                />
                <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                  <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color={Colors.dark.textSecondary} />
                </Pressable>
              </View>

              <View style={styles.inputContainer}>
                <Ionicons name="checkmark-circle-outline" size={20} color={Colors.dark.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Confirm password"
                  placeholderTextColor={Colors.dark.textSecondary}
                  secureTextEntry={!showPassword}
                  value={confirm}
                  onChangeText={setConfirm}
                />
              </View>
              
              {password.length > 0 && password !== confirm && (
                <Text style={styles.errorText}>Passwords do not match</Text>
              )}
            </View>

            <View style={styles.featuresSection}>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={20} color={Colors.dark.accent} />
                <Text style={styles.featureText}>Require password to open</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={20} color={Colors.dark.accent} />
                <Text style={styles.featureText}>Prevent copying text & images</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={20} color={Colors.dark.accent} />
                <Text style={styles.featureText}>Prevent printing</Text>
              </View>
            </View>

            <View style={{ flex: 1 }} />
            
            <Pressable 
              style={[styles.protectBtn, !isFormValid && styles.protectBtnDisabled]} 
              onPress={handleProtect}
              disabled={!isFormValid}
            >
              <Ionicons name="lock-closed" size={20} color="#FFF" />
              <Text style={styles.protectBtnText}>Protect Document</Text>
            </Pressable>
          </ScrollView>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  container: {
    flex: 1,
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
    flexGrow: 1,
    padding: 24,
  },
  heroSection: {
    alignItems: "center",
    marginBottom: 40,
  },
  lockIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "rgba(99, 102, 241, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  heroTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 24,
    color: Colors.dark.textPrimary,
    marginBottom: 8,
  },
  heroSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.dark.textSecondary,
    textAlign: "center",
    paddingHorizontal: 24,
    lineHeight: 20,
  },
  formSection: {
    gap: 16,
    marginBottom: 40,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    paddingHorizontal: 16,
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    color: Colors.dark.textPrimary,
    height: "100%",
  },
  eyeBtn: {
    padding: 8,
  },
  errorText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.dark.warning,
    marginLeft: 16,
  },
  featuresSection: {
    backgroundColor: Colors.dark.surface2,
    padding: 24,
    borderRadius: 16,
    gap: 16,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  featureText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: Colors.dark.textPrimary,
  },
  protectBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.dark.accent,
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
  },
  protectBtnDisabled: {
    opacity: 0.5,
  },
  protectBtnText: {
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
    marginBottom: 8,
  },
  successSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.dark.textSecondary,
  },
});
