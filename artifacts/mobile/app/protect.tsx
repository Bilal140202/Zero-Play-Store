import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import Animated, { FadeIn } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import * as DocumentPicker from "expo-document-picker";
import { protectPdfWithNotice } from "@/lib/pdfEngine";

export default function ProtectScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();

  const [fileUri, setFileUri] = useState((params.fileUri as string) || "");
  const [fileName, setFileName] = useState((params.fileName as string) || "");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isWorking, setIsWorking] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : Math.max(insets.top, 0);

  const isFormValid =
    !!fileUri && password.length >= 4 && password === confirm;

  const pickFile = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true,
      });
      if (!res.canceled && res.assets?.length) {
        setFileUri(res.assets[0].uri);
        setFileName(res.assets[0].name);
      }
    } catch {
      Alert.alert("Error", "Could not open file picker.");
    }
  };

  const handleProtect = async () => {
    if (!isFormValid) return;
    if (Platform.OS !== "web")
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsWorking(true);
    try {
      const outName = "protected_" + (fileName || "document.pdf");
      await protectPdfWithNotice(fileUri, password, outName);
      if (Platform.OS !== "web")
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setIsDone(true);
      setTimeout(() => router.back(), 2000);
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to process the PDF.");
    } finally {
      setIsWorking(false);
    }
  };

  if (isDone) {
    return (
      <View
        style={[
          styles.flex,
          {
            alignItems: "center",
            justifyContent: "center",
            paddingTop: topPad,
          },
        ]}
      >
        <Animated.View entering={FadeIn} style={styles.successState}>
          <View style={styles.successIcon}>
            <Ionicons
              name="shield-checkmark"
              size={48}
              color={Colors.dark.success}
            />
          </View>
          <Text style={styles.successTitle}>Protection Applied</Text>
          <Text style={styles.successSub}>
            Your PDF has been saved with a restriction notice and shared to
            your device.
          </Text>
        </Animated.View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View
        style={[
          styles.container,
          { paddingTop: topPad, paddingBottom: Math.max(insets.bottom, 24) },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.iconBtn}>
            <Ionicons
              name="arrow-back"
              size={24}
              color={Colors.dark.textPrimary}
            />
          </Pressable>
          <Text style={styles.title}>Protect PDF</Text>
          <View style={{ width: 48 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {/* Hero */}
          <View style={styles.heroSection}>
            <View style={styles.lockIconContainer}>
              <Ionicons name="lock-closed" size={48} color={Colors.dark.accent} />
            </View>
            <Text style={styles.heroTitle}>Add Restriction Notice</Text>
            <Text style={styles.heroSub}>
              Adds a visible "RESTRICTED DOCUMENT" banner on every page and
              records the password in the file metadata.{"\n\n"}
              <Text style={styles.noteText}>
                Note: True AES-256 byte-level encryption requires a
                server-side tool. This feature adds a clear access restriction
                marker entirely offline.
              </Text>
            </Text>
          </View>

          {/* File picker */}
          <Pressable style={styles.filePicker} onPress={pickFile}>
            <Ionicons
              name={fileUri ? "document-text" : "document-attach-outline"}
              size={24}
              color={fileUri ? Colors.dark.accent : Colors.dark.textSecondary}
            />
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.filePickerText,
                  fileUri && { color: Colors.dark.textPrimary },
                ]}
                numberOfLines={1}
              >
                {fileName || "Tap to select a PDF"}
              </Text>
              {!fileUri && (
                <Text style={styles.filePickerSub}>
                  Choose the PDF you want to protect
                </Text>
              )}
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={Colors.dark.textSecondary}
            />
          </Pressable>

          {/* Password inputs */}
          <View style={styles.formSection}>
            <View style={styles.inputContainer}>
              <Ionicons
                name="key-outline"
                size={20}
                color={Colors.dark.textSecondary}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Enter password (min. 4 chars)"
                placeholderTextColor={Colors.dark.textSecondary}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />
              <Pressable
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeBtn}
              >
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color={Colors.dark.textSecondary}
                />
              </Pressable>
            </View>

            <View style={styles.inputContainer}>
              <Ionicons
                name="checkmark-circle-outline"
                size={20}
                color={Colors.dark.textSecondary}
                style={styles.inputIcon}
              />
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

          {/* Features */}
          <View style={styles.featuresSection}>
            <View style={styles.featureItem}>
              <Ionicons
                name="checkmark-circle"
                size={20}
                color={Colors.dark.accent}
              />
              <Text style={styles.featureText}>
                Visible "RESTRICTED DOCUMENT" banner on every page
              </Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons
                name="checkmark-circle"
                size={20}
                color={Colors.dark.accent}
              />
              <Text style={styles.featureText}>
                Password stored in PDF metadata
              </Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons
                name="checkmark-circle"
                size={20}
                color={Colors.dark.accent}
              />
              <Text style={styles.featureText}>100% offline — no internet needed</Text>
            </View>
          </View>

          <Pressable
            style={[
              styles.protectBtn,
              (!isFormValid || isWorking) && styles.protectBtnDisabled,
            ]}
            onPress={handleProtect}
            disabled={!isFormValid || isWorking}
          >
            {isWorking ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Ionicons name="shield-checkmark-outline" size={20} color="#FFF" />
                <Text style={styles.protectBtnText}>Apply Restriction & Save</Text>
              </>
            )}
          </Pressable>
        </ScrollView>
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
    gap: 20,
  },
  heroSection: {
    alignItems: "center",
  },
  lockIconContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "rgba(99, 102, 241, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  heroTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    color: Colors.dark.textPrimary,
    marginBottom: 10,
    textAlign: "center",
  },
  heroSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.dark.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  noteText: {
    color: Colors.dark.warning,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 18,
  },
  filePicker: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.dark.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    padding: 16,
    gap: 12,
  },
  filePickerText: {
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
  formSection: {
    gap: 12,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.dark.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    paddingHorizontal: 16,
    height: 54,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
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
    padding: 20,
    borderRadius: 14,
    gap: 14,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  featureText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: Colors.dark.textPrimary,
    flex: 1,
    lineHeight: 20,
  },
  protectBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.dark.accent,
    paddingVertical: 16,
    borderRadius: 16,
    gap: 10,
    marginTop: 4,
  },
  protectBtnDisabled: {
    opacity: 0.45,
  },
  protectBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: "#FFF",
  },
  successState: {
    alignItems: "center",
    padding: 40,
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
    marginBottom: 10,
  },
  successSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.dark.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
});
