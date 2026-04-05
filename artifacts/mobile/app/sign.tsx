import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  LayoutChangeEvent,
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
import { SignatureCanvas } from "@/components/SignatureCanvas";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import * as DocumentPicker from "expo-document-picker";
import { embedDrawnSignature, embedTextSignature } from "@/lib/pdfEngine";

type TabType = "draw" | "type";
type SignPosition = "bottom-right" | "bottom-center" | "bottom-left";

const SIGN_POSITIONS: { key: SignPosition; label: string }[] = [
  { key: "bottom-right", label: "Bottom Right" },
  { key: "bottom-center", label: "Bottom Center" },
  { key: "bottom-left", label: "Bottom Left" },
];

export default function SignScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();

  const [fileUri, setFileUri] = useState((params.fileUri as string) || "");
  const [fileName, setFileName] = useState(
    (params.fileName as string) || ""
  );

  const [tab, setTab] = useState<TabType>("draw");
  const [textSign, setTextSign] = useState("");
  const [paths, setPaths] = useState<string[]>([]);
  const [canvasSize, setCanvasSize] = useState({ width: 300, height: 200 });
  const [signPosition, setSignPosition] = useState<SignPosition>("bottom-right");
  const [isWorking, setIsWorking] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : Math.max(insets.top, 0);
  const botPad = Platform.OS === "web" ? 34 : Math.max(insets.bottom, 16);

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
    } catch (e) {
      Alert.alert("Error", "Could not open file picker.");
    }
  };

  const handleCanvasLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setCanvasSize({ width, height });
  };

  const handleSaveToPdf = async () => {
    if (!fileUri) {
      Alert.alert("No File", "Please select a PDF first.");
      return;
    }
    if (tab === "type" && !textSign.trim()) {
      Alert.alert("Empty Signature", "Please type your name first.");
      return;
    }
    if (tab === "draw" && paths.length === 0) {
      Alert.alert("Empty Signature", "Please draw your signature first.");
      return;
    }

    if (Platform.OS !== "web")
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsWorking(true);

    try {
      const outName = "signed_" + (fileName || "document.pdf");
      if (tab === "type") {
        await embedTextSignature(
          fileUri,
          textSign.trim(),
          { position: signPosition },
          outName
        );
      } else {
        await embedDrawnSignature(
          fileUri,
          paths,
          canvasSize.width,
          canvasSize.height,
          {},
          outName
        );
      }

      if (Platform.OS !== "web")
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setIsDone(true);
      setTimeout(() => {
        router.back();
      }, 1800);
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to embed signature.");
    } finally {
      setIsWorking(false);
    }
  };

  if (isDone) {
    return (
      <View
        style={[
          styles.container,
          { paddingTop: topPad, paddingBottom: botPad },
        ]}
      >
        <Animated.View entering={FadeIn} style={styles.successState}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark" size={48} color={Colors.dark.success} />
          </View>
          <Text style={styles.successTitle}>Signature Added!</Text>
          <Text style={styles.successSub}>
            Your signed PDF has been shared to your device.
          </Text>
        </Animated.View>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        { paddingTop: topPad, paddingBottom: botPad },
      ]}
    >
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.dark.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Sign Document</Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24 }}
        keyboardShouldPersistTaps="handled"
      >
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
                Choose the PDF you want to sign
              </Text>
            )}
          </View>
          <Ionicons
            name="chevron-forward"
            size={18}
            color={Colors.dark.textSecondary}
          />
        </Pressable>

        {/* Tabs */}
        <View style={styles.tabs}>
          <Pressable
            style={[styles.tab, tab === "draw" && styles.activeTab]}
            onPress={() => setTab("draw")}
          >
            <Text
              style={[
                styles.tabText,
                tab === "draw" && styles.activeTabText,
              ]}
            >
              Draw
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tab, tab === "type" && styles.activeTab]}
            onPress={() => setTab("type")}
          >
            <Text
              style={[
                styles.tabText,
                tab === "type" && styles.activeTabText,
              ]}
            >
              Type
            </Text>
          </Pressable>
        </View>

        {/* Draw signature */}
        {tab === "draw" && (
          <View style={styles.drawSection}>
            <View
              style={styles.canvasWrapper}
              onLayout={handleCanvasLayout}
            >
              <SignatureCanvas onDrawEnd={(p) => setPaths(p)} />
              {paths.length === 0 && (
                <Text style={styles.hintText} pointerEvents="none">
                  Sign here
                </Text>
              )}
            </View>
            <Pressable
              style={styles.clearBtn}
              onPress={() => setPaths([])}
            >
              <Ionicons
                name="refresh-outline"
                size={18}
                color={Colors.dark.accent}
              />
              <Text style={styles.clearText}>Clear</Text>
            </Pressable>
          </View>
        )}

        {/* Type signature */}
        {tab === "type" && (
          <View style={styles.typeSection}>
            <TextInput
              style={styles.input}
              placeholder="Type your full name"
              placeholderTextColor={Colors.dark.textSecondary}
              value={textSign}
              onChangeText={setTextSign}
              autoFocus
            />
            {!!textSign && (
              <View style={styles.previewCard}>
                <Text style={styles.previewSignature}>{textSign}</Text>
              </View>
            )}
          </View>
        )}

        {/* Placement */}
        <Text style={styles.sectionLabel}>Signature placement</Text>
        <View style={styles.positionRow}>
          {SIGN_POSITIONS.map((p) => (
            <Pressable
              key={p.key}
              style={[
                styles.positionBtn,
                signPosition === p.key && styles.positionBtnActive,
              ]}
              onPress={() => setSignPosition(p.key)}
            >
              <Text
                style={[
                  styles.positionText,
                  signPosition === p.key && styles.positionTextActive,
                ]}
              >
                {p.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.infoText}>
          The signature will be placed on the last page of your PDF.
        </Text>
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
            styles.saveBtn,
            (!fileUri || isWorking) && styles.saveBtnDisabled,
          ]}
          onPress={handleSaveToPdf}
          disabled={!fileUri || isWorking}
        >
          {isWorking ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Ionicons name="create-outline" size={20} color="#FFF" />
              <Text style={styles.saveBtnText}>Embed Signature in PDF</Text>
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
  filePicker: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.dark.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    padding: 16,
    gap: 12,
    marginBottom: 20,
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
  tabs: {
    flexDirection: "row",
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
    marginBottom: -1,
  },
  activeTab: {
    borderBottomColor: Colors.dark.accent,
  },
  tabText: {
    fontFamily: "Inter_500Medium",
    color: Colors.dark.textSecondary,
    fontSize: 15,
  },
  activeTabText: {
    color: Colors.dark.textPrimary,
  },
  drawSection: {
    marginBottom: 20,
  },
  canvasWrapper: {
    height: 220,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: Colors.dark.border,
    position: "relative",
  },
  hintText: {
    position: "absolute",
    top: "50%",
    left: 0,
    right: 0,
    textAlign: "center",
    color: "#CBD5E1",
    fontSize: 22,
    fontFamily: "Inter_600SemiBold",
    opacity: 0.6,
    transform: [{ translateY: -12 }],
    pointerEvents: "none",
  },
  clearBtn: {
    alignSelf: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  clearText: {
    color: Colors.dark.accent,
    fontFamily: "Inter_500Medium",
    fontSize: 14,
  },
  typeSection: {
    marginBottom: 20,
    gap: 16,
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
  previewCard: {
    backgroundColor: "#FFFFFF",
    padding: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: Colors.dark.border,
    minHeight: 100,
  },
  previewSignature: {
    color: "#1E40AF",
    fontSize: 36,
    fontFamily: "Inter_400Regular",
    fontStyle: "italic",
  },
  sectionLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: Colors.dark.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  positionRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
    flexWrap: "wrap",
  },
  positionBtn: {
    flex: 1,
    minWidth: 90,
    paddingVertical: 10,
    paddingHorizontal: 10,
    backgroundColor: Colors.dark.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    alignItems: "center",
  },
  positionBtnActive: {
    borderColor: Colors.dark.accent,
    backgroundColor: "rgba(99,102,241,0.12)",
  },
  positionText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: Colors.dark.textSecondary,
  },
  positionTextActive: {
    color: Colors.dark.accent,
  },
  infoText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.dark.textSecondary,
    lineHeight: 18,
    marginBottom: 12,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.dark.accent,
    paddingVertical: 16,
    borderRadius: 16,
    gap: 10,
  },
  saveBtnDisabled: {
    opacity: 0.45,
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
