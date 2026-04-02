import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { ToolBar, ToolType } from "@/components/ToolBar";
import { ContextToolbar } from "@/components/ContextToolbar";
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import * as FileSystem from "expo-file-system/legacy";
import { WebView } from "react-native-webview";

// ─── PDF.js HTML template ───────────────────────────────────────────────────

function buildPdfHtml(base64: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=yes">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { height: 100%; background: #111118; }
    #status {
      color: #94A3B8;
      font-family: -apple-system, sans-serif;
      font-size: 15px;
      text-align: center;
      padding: 60px 24px;
    }
    #error {
      color: #F87171;
      font-family: -apple-system, sans-serif;
      font-size: 14px;
      text-align: center;
      padding: 60px 24px;
      display: none;
    }
    .pdf-page {
      display: block;
      margin: 10px auto;
      box-shadow: 0 4px 20px rgba(0,0,0,0.6);
      background: white;
    }
  </style>
</head>
<body>
  <div id="status">Rendering PDF…</div>
  <div id="error"></div>
  <div id="container"></div>

  <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
  <script>
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

    function post(obj) {
      try { window.ReactNativeWebView.postMessage(JSON.stringify(obj)); } catch(e) {}
    }

    (function() {
      var b64 = '${base64}';
      var bStr = atob(b64);
      var bytes = new Uint8Array(bStr.length);
      for (var i = 0; i < bStr.length; i++) bytes[i] = bStr.charCodeAt(i);

      pdfjsLib.getDocument({ data: bytes }).promise.then(function(pdf) {
        document.getElementById('status').style.display = 'none';
        var total = pdf.numPages;
        post({ type: 'pages', count: total });

        var container = document.getElementById('container');
        var deviceWidth = window.innerWidth;

        for (var n = 1; n <= total; n++) {
          (function(pageNum) {
            pdf.getPage(pageNum).then(function(page) {
              var unscaled = page.getViewport({ scale: 1 });
              var scale = deviceWidth / unscaled.width;
              var viewport = page.getViewport({ scale: scale });

              var canvas = document.createElement('canvas');
              canvas.className = 'pdf-page';
              canvas.width = viewport.width;
              canvas.height = viewport.height;
              canvas.style.width = viewport.width + 'px';
              canvas.style.height = viewport.height + 'px';
              canvas.id = 'page-' + pageNum;

              var placeholder = document.createElement('div');
              placeholder.style.width = viewport.width + 'px';
              placeholder.style.height = viewport.height + 'px';
              placeholder.style.margin = '10px auto';
              placeholder.style.background = '#FFF';
              placeholder.appendChild(canvas);
              container.appendChild(placeholder);

              page.render({
                canvasContext: canvas.getContext('2d'),
                viewport: viewport,
              }).promise.then(function() {
                post({ type: 'rendered', page: pageNum });
              });
            });
          })(n);
        }
      }).catch(function(err) {
        document.getElementById('status').style.display = 'none';
        var el = document.getElementById('error');
        el.style.display = 'block';
        el.textContent = 'Could not render PDF: ' + err.message;
        post({ type: 'error', message: err.message });
      });
    })();
  </script>
</body>
</html>`;
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function ViewerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();

  const fileName = (params.fileName as string) || "Document.pdf";
  const fileUri = (params.fileUri as string) || "";

  // PDF state
  const [pdfHtml, setPdfHtml] = useState("");
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState("");
  const [totalPages, setTotalPages] = useState<number | null>(null);

  // UI state
  const [activeTool, setActiveTool] = useState<ToolType>("select");
  const [color, setColor] = useState("#6366F1");
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [shapeType, setShapeType] = useState<
    "rectangle" | "circle" | "arrow" | "line"
  >("rectangle");
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [bookmarked, setBookmarked] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  // Load real PDF
  useEffect(() => {
    if (!fileUri || Platform.OS === "web") return;
    loadPdf();
  }, [fileUri]);

  const loadPdf = useCallback(async () => {
    setPdfLoading(true);
    setPdfError("");
    try {
      const info = await FileSystem.getInfoAsync(fileUri);
      if (!info.exists) {
        setPdfError("File not found. It may have been moved or deleted.");
        return;
      }
      const base64 = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      setPdfHtml(buildPdfHtml(base64));
    } catch (e: any) {
      setPdfError(e?.message || "Failed to load the PDF file.");
    } finally {
      setPdfLoading(false);
    }
  }, [fileUri]);

  const handleWebViewMessage = useCallback((event: any) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === "pages") setTotalPages(msg.count);
      if (msg.type === "error") setPdfError(msg.message);
    } catch (_) {}
  }, []);

  const toggleBookmark = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setBookmarked((b) => !b);
  };

  const handleSaveDoc = () => {
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowMoreMenu(false);
    Alert.alert("Saved", "Document saved successfully.");
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  // ─── Render PDF area ───────────────────────────────────────────────────────

  const renderPdfArea = () => {
    // Web: placeholder message
    if (Platform.OS === "web") {
      return (
        <View style={styles.centerBox}>
          <Ionicons name="document-text-outline" size={56} color={Colors.dark.border} />
          <Text style={styles.centerText}>Open the app on your phone to view PDFs</Text>
        </View>
      );
    }

    // No URI provided
    if (!fileUri) {
      return (
        <View style={styles.centerBox}>
          <Ionicons name="document-outline" size={56} color={Colors.dark.border} />
          <Text style={styles.centerText}>No file selected</Text>
        </View>
      );
    }

    // Loading base64
    if (pdfLoading) {
      return (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={Colors.dark.accent} />
          <Text style={[styles.centerText, { marginTop: 16 }]}>
            Loading PDF…
          </Text>
        </View>
      );
    }

    // Error
    if (pdfError) {
      return (
        <View style={styles.centerBox}>
          <Ionicons name="alert-circle-outline" size={48} color="#F87171" />
          <Text style={[styles.centerText, { color: "#F87171", marginTop: 12 }]}>
            {pdfError}
          </Text>
          <Pressable style={styles.retryBtn} onPress={loadPdf}>
            <Text style={styles.retryText}>Try Again</Text>
          </Pressable>
        </View>
      );
    }

    // Real PDF in WebView
    if (pdfHtml) {
      return (
        <WebView
          style={styles.webView}
          source={{ html: pdfHtml, baseUrl: "" }}
          originWhitelist={["*"]}
          javaScriptEnabled
          allowFileAccess
          allowFileAccessFromFileURLs
          allowUniversalAccessFromFileURLs
          onMessage={handleWebViewMessage}
          scrollEnabled
          showsVerticalScrollIndicator
          onError={(e) =>
            setPdfError("WebView error: " + e.nativeEvent.description)
          }
        />
      );
    }

    return null;
  };

  // ─── JSX ──────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.dark.textPrimary} />
        </Pressable>

        <View style={styles.titleContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {fileName}
          </Text>
          {totalPages !== null && (
            <Text style={styles.pageIndicator}>
              {totalPages} page{totalPages !== 1 ? "s" : ""}
            </Text>
          )}
        </View>

        <Pressable
          onPress={() => setShowSearch((v) => !v)}
          style={styles.iconBtn}
        >
          <Ionicons name="search" size={20} color={Colors.dark.textPrimary} />
        </Pressable>

        <Pressable onPress={toggleBookmark} style={styles.iconBtn}>
          <Ionicons
            name={bookmarked ? "bookmark" : "bookmark-outline"}
            size={20}
            color={bookmarked ? Colors.dark.accent : Colors.dark.textPrimary}
          />
        </Pressable>

        <Pressable
          onPress={() => setShowMoreMenu(true)}
          style={styles.iconBtn}
        >
          <Ionicons
            name="ellipsis-vertical"
            size={24}
            color={Colors.dark.textPrimary}
          />
        </Pressable>
      </View>

      {/* Search bar */}
      {showSearch && (
        <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.searchBar}>
          <Ionicons name="search" size={18} color={Colors.dark.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search in document…"
            placeholderTextColor={Colors.dark.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
            returnKeyType="search"
          />
          <Pressable onPress={() => { setShowSearch(false); setSearchQuery(""); }}>
            <Ionicons name="close" size={18} color={Colors.dark.textSecondary} />
          </Pressable>
        </Animated.View>
      )}

      {/* Main PDF area */}
      <View style={styles.pdfArea}>{renderPdfArea()}</View>

      {/* Annotation toolbar */}
      <ContextToolbar
        activeTool={activeTool}
        color={color}
        onColorChange={setColor}
        strokeWidth={strokeWidth}
        onStrokeWidthChange={setStrokeWidth}
        shapeType={shapeType}
        onShapeTypeChange={setShapeType}
      />
      <ToolBar activeTool={activeTool} onSelectTool={setActiveTool} />

      {/* More options sheet */}
      <Modal visible={showMoreMenu} transparent animationType="fade">
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowMoreMenu(false)}
        >
          <Animated.View
            entering={SlideInDown}
            exiting={SlideOutDown}
            style={[
              styles.actionSheet,
              { paddingBottom: Math.max(insets.bottom, 24) },
            ]}
          >
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Document Options</Text>

            <Pressable style={styles.sheetAction} onPress={handleSaveDoc}>
              <Ionicons name="save-outline" size={22} color={Colors.dark.textPrimary} />
              <Text style={styles.sheetActionText}>Save Document</Text>
            </Pressable>

            <Pressable
              style={styles.sheetAction}
              onPress={() => {
                setShowMoreMenu(false);
                router.push("/protect");
              }}
            >
              <Ionicons name="lock-closed-outline" size={22} color={Colors.dark.textPrimary} />
              <Text style={styles.sheetActionText}>Add Password</Text>
            </Pressable>

            <Pressable
              style={styles.sheetAction}
              onPress={() => {
                setShowMoreMenu(false);
                router.push("/watermark");
              }}
            >
              <Ionicons name="water-outline" size={22} color={Colors.dark.textPrimary} />
              <Text style={styles.sheetActionText}>Add Watermark</Text>
            </Pressable>

            <Pressable
              style={styles.sheetAction}
              onPress={() => {
                setShowMoreMenu(false);
                router.push("/sign");
              }}
            >
              <Ionicons name="create-outline" size={22} color={Colors.dark.textPrimary} />
              <Text style={styles.sheetActionText}>Sign Document</Text>
            </Pressable>

            <Pressable
              style={styles.sheetAction}
              onPress={() => {
                setShowMoreMenu(false);
                router.push("/bookmarks");
              }}
            >
              <Ionicons name="bookmarks-outline" size={22} color={Colors.dark.textPrimary} />
              <Text style={styles.sheetActionText}>Bookmarks</Text>
            </Pressable>

            <Pressable
              style={[
                styles.sheetAction,
                {
                  borderTopWidth: 1,
                  borderTopColor: Colors.dark.border,
                  marginTop: 8,
                  paddingTop: 16,
                },
              ]}
              onPress={() => {
                setShowMoreMenu(false);
                router.back();
              }}
            >
              <Ionicons name="close-circle-outline" size={22} color={Colors.dark.warning} />
              <Text style={[styles.sheetActionText, { color: Colors.dark.warning }]}>
                Close Document
              </Text>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 4,
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  iconBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  titleContainer: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 4,
  },
  title: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: Colors.dark.textPrimary,
  },
  pageIndicator: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.dark.textSecondary,
    marginTop: 2,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.dark.surface,
    marginHorizontal: 16,
    marginVertical: 8,
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: Colors.dark.textPrimary,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
  },
  pdfArea: {
    flex: 1,
    backgroundColor: "#111118",
  },
  webView: {
    flex: 1,
    backgroundColor: "#111118",
  },
  centerBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 12,
  },
  centerText: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: Colors.dark.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  retryBtn: {
    marginTop: 8,
    backgroundColor: Colors.dark.accent,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryText: {
    fontFamily: "Inter_600SemiBold",
    color: "#FFF",
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  actionSheet: {
    backgroundColor: Colors.dark.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.dark.border,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  sheetTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 18,
    color: Colors.dark.textPrimary,
    marginBottom: 12,
  },
  sheetAction: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    gap: 16,
  },
  sheetActionText: {
    fontFamily: "Inter_500Medium",
    fontSize: 16,
    color: Colors.dark.textPrimary,
    flex: 1,
  },
});
