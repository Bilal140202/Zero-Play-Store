import React, { useState } from "react";
import { View, StyleSheet, Text, Pressable, TextInput, Platform, ScrollView, Modal, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { PDFPage } from "@/components/PDFPage";
import { ToolBar, ToolType } from "@/components/ToolBar";
import { ContextToolbar } from "@/components/ContextToolbar";
import Animated, { FadeIn, FadeOut, SlideInLeft, SlideOutLeft, SlideInDown, SlideOutDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

export default function ViewerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  
  const fileName = (params.fileName as string) || "Document.pdf";
  const totalPages = parseInt(params.pages as string) || 5;

  const [activeTool, setActiveTool] = useState<ToolType>('select');
  const [color, setColor] = useState("#6366F1");
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [shapeType, setShapeType] = useState<'rectangle'|'circle'|'arrow'|'line'>('rectangle');

  const [currentPage, setCurrentPage] = useState(1);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [bookmarkedPages, setBookmarkedPages] = useState<number[]>([]);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [isUnsavedChanges, setIsUnsavedChanges] = useState(false);
  const [zoom, setZoom] = useState(1.0);

  const [textOverlay, setTextOverlay] = useState<{visible: boolean, x: number, y: number, text: string}>({visible: false, x: 0, y: 0, text: ""});

  const toggleBookmark = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setBookmarkedPages(prev => 
      prev.includes(currentPage) ? prev.filter(p => p !== currentPage) : [...prev, currentPage]
    );
  };

  const handleCanvasPress = (evt: any) => {
    if (activeTool === 'text') {
      setTextOverlay({
        visible: true,
        x: evt.nativeEvent.locationX || 100,
        y: evt.nativeEvent.locationY || 100,
        text: ""
      });
    } else if (activeTool === 'form') {
      router.push("/forms");
    } else if (activeTool === 'comment') {
      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      Alert.alert("Add Comment", "Tap and hold any text to add a sticky note comment.");
    }
  };

  const handleSaveText = () => {
    setTextOverlay(prev => ({...prev, visible: false}));
    setIsUnsavedChanges(true);
  };

  const handleSaveDoc = () => {
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsUnsavedChanges(false);
    setShowMoreMenu(false);
    Alert.alert("Success", "Document saved successfully");
  };

  const renderPages = () => {
    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
      pages.push(
        <Pressable key={i} onPress={handleCanvasPress} style={styles.pageWrapper}>
          <PDFPage pageNumber={i} />
        </Pressable>
      );
    }
    return pages;
  };

  const renderSidebarThumbnails = () => {
    const thumbs = [];
    for (let i = 1; i <= totalPages; i++) {
      thumbs.push(
        <Pressable 
          key={i} 
          style={[styles.thumbnail, currentPage === i && styles.activeThumbnail]}
          onPress={() => setCurrentPage(i)}
        >
          <Text style={[styles.thumbnailText, currentPage === i && styles.activeThumbnailText]}>{i}</Text>
        </Pressable>
      );
    }
    return thumbs;
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.dark.textPrimary} />
        </Pressable>
        
        <Pressable onPress={() => setShowSidebar(!showSidebar)} style={styles.iconBtn}>
          <Ionicons name="list" size={24} color={Colors.dark.textPrimary} />
        </Pressable>

        <View style={styles.titleContainer}>
          <Text style={styles.title} numberOfLines={1}>{fileName}</Text>
          <Text style={styles.pageIndicator}>{currentPage}/{totalPages}</Text>
        </View>

        <Pressable onPress={() => setShowSearch(!showSearch)} style={styles.iconBtn}>
          <Ionicons name="search" size={20} color={Colors.dark.textPrimary} />
        </Pressable>
        
        <Pressable onPress={toggleBookmark} style={styles.iconBtn}>
          <Ionicons name={bookmarkedPages.includes(currentPage) ? "bookmark" : "bookmark-outline"} size={20} color={Colors.dark.textPrimary} />
        </Pressable>

        <Pressable onPress={() => setShowMoreMenu(true)} style={styles.iconBtn}>
          <Ionicons name="ellipsis-vertical" size={24} color={Colors.dark.textPrimary} />
          {isUnsavedChanges && <View style={styles.unsavedDot} />}
        </Pressable>
      </View>

      {showSearch && (
        <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.searchBar}>
          <Ionicons name="search" size={20} color={Colors.dark.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search document..."
            placeholderTextColor={Colors.dark.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
          <Pressable onPress={() => setShowSearch(false)}>
            <Ionicons name="close" size={20} color={Colors.dark.textSecondary} />
          </Pressable>
        </Animated.View>
      )}

      <View style={styles.mainArea}>
        {showSidebar && (
          <Animated.View entering={SlideInLeft} exiting={SlideOutLeft} style={styles.sidebar}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sidebarScroll}>
              {renderSidebarThumbnails()}
            </ScrollView>
          </Animated.View>
        )}

        <View style={styles.canvasContainer}>
          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={true}
            onScroll={(e) => {
              // naive page tracking based on scroll y
              const y = e.nativeEvent.contentOffset.y;
              const pageHeight = 500; // approx
              const page = Math.max(1, Math.min(totalPages, Math.floor(y / pageHeight) + 1));
              setCurrentPage(page);
            }}
            scrollEventThrottle={200}
          >
            {renderPages()}

            {textOverlay.visible && (
              <View style={[styles.textOverlayContainer, { top: textOverlay.y, left: 16, right: 16 }]}>
                <View style={styles.textOverlayToolbar}>
                  <Pressable><Ionicons name="remove" size={16} color="#FFF" /></Pressable>
                  <Text style={{color: "#FFF"}}>14pt</Text>
                  <Pressable><Ionicons name="add" size={16} color="#FFF" /></Pressable>
                  <View style={{width: 1, height: 16, backgroundColor: Colors.dark.border}} />
                  <Pressable><Text style={{color: "#FFF", fontWeight: "bold"}}>B</Text></Pressable>
                  <Pressable><Text style={{color: "#FFF", fontStyle: "italic"}}>I</Text></Pressable>
                  <Pressable><Text style={{color: "#FFF", textDecorationLine: "underline"}}>U</Text></Pressable>
                </View>
                <TextInput
                  style={styles.textOverlayInput}
                  value={textOverlay.text}
                  onChangeText={(t) => setTextOverlay({...textOverlay, text: t})}
                  placeholder="Type here..."
                  placeholderTextColor="#94A3B8"
                  autoFocus
                  multiline
                />
                <View style={styles.textOverlayActions}>
                  <Pressable style={styles.textOverlayBtn} onPress={() => setTextOverlay({...textOverlay, visible: false})}>
                    <Text style={{color: Colors.dark.textSecondary}}>Cancel</Text>
                  </Pressable>
                  <Pressable style={[styles.textOverlayBtn, {backgroundColor: Colors.dark.accent}]} onPress={handleSaveText}>
                    <Text style={{color: "#FFF"}}>Done</Text>
                  </Pressable>
                </View>
              </View>
            )}

          </ScrollView>
        </View>
      </View>

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

      <Modal visible={showMoreMenu} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setShowMoreMenu(false)}>
          <Animated.View entering={SlideInDown} exiting={SlideOutDown} style={[styles.actionSheet, { paddingBottom: Math.max(insets.bottom, 24) }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Document Options</Text>
            
            <Pressable style={styles.sheetAction} onPress={handleSaveDoc}>
              <Ionicons name="save-outline" size={24} color={Colors.dark.textPrimary} />
              <Text style={styles.sheetActionText}>Save Document</Text>
              {isUnsavedChanges && <View style={styles.unsavedBadge}><Text style={styles.unsavedBadgeText}>Unsaved</Text></View>}
            </Pressable>
            
            <Pressable style={styles.sheetAction} onPress={() => {setShowMoreMenu(false); Alert.alert("Share");}}>
              <Ionicons name="share-outline" size={24} color={Colors.dark.textPrimary} />
              <Text style={styles.sheetActionText}>Share</Text>
            </Pressable>

            <Pressable style={styles.sheetAction} onPress={() => {setShowMoreMenu(false); router.push("/protect");}}>
              <Ionicons name="lock-closed-outline" size={24} color={Colors.dark.textPrimary} />
              <Text style={styles.sheetActionText}>Add Password</Text>
            </Pressable>

            <Pressable style={styles.sheetAction} onPress={() => {setShowMoreMenu(false); router.push("/watermark");}}>
              <Ionicons name="water-outline" size={24} color={Colors.dark.textPrimary} />
              <Text style={styles.sheetActionText}>Add Watermark</Text>
            </Pressable>

            <Pressable style={styles.sheetAction} onPress={() => {setShowMoreMenu(false); router.push("/bookmarks");}}>
              <Ionicons name="bookmarks-outline" size={24} color={Colors.dark.textPrimary} />
              <Text style={styles.sheetActionText}>Bookmarks</Text>
            </Pressable>

            <Pressable style={[styles.sheetAction, { borderTopWidth: 1, borderTopColor: Colors.dark.border, marginTop: 8, paddingTop: 16 }]} onPress={() => {setShowMoreMenu(false); router.back();}}>
              <Ionicons name="close-circle-outline" size={24} color={Colors.dark.warning} />
              <Text style={[styles.sheetActionText, { color: Colors.dark.warning }]}>Close Document</Text>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>

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
    paddingHorizontal: 8,
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  iconBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  titleContainer: {
    flex: 1,
    alignItems: "center",
  },
  title: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: Colors.dark.textPrimary,
  },
  pageIndicator: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.dark.textSecondary,
    marginTop: 2,
  },
  unsavedDot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.dark.warning,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.dark.surface,
    marginHorizontal: 16,
    marginVertical: 8,
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: Colors.dark.textPrimary,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
  },
  mainArea: {
    flex: 1,
    flexDirection: "row",
  },
  sidebar: {
    width: 80,
    backgroundColor: Colors.dark.surface,
    borderRightWidth: 1,
    borderRightColor: Colors.dark.border,
  },
  sidebarScroll: {
    padding: 12,
    gap: 12,
    alignItems: "center",
  },
  thumbnail: {
    width: 56,
    height: 76,
    backgroundColor: "#FFF",
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  activeThumbnail: {
    borderColor: Colors.dark.accent,
  },
  thumbnailText: {
    color: "#000",
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  activeThumbnailText: {
    color: Colors.dark.accent,
  },
  canvasContainer: {
    flex: 1,
    backgroundColor: "#1A1A24",
  },
  scrollContent: {
    paddingVertical: 24,
    position: "relative",
  },
  pageWrapper: {
    width: "100%",
  },
  textOverlayContainer: {
    position: "absolute",
    backgroundColor: Colors.dark.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 100,
  },
  textOverlayToolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.dark.surface2,
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  textOverlayInput: {
    backgroundColor: "#FFF",
    color: "#000",
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    minHeight: 60,
    textAlignVertical: "top",
  },
  textOverlayActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 12,
    gap: 12,
  },
  textOverlayBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.dark.surface2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
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
    backgroundColor: Colors.dark.surface2,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 24,
  },
  sheetTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 18,
    color: Colors.dark.textPrimary,
    marginBottom: 16,
  },
  sheetAction: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    gap: 16,
  },
  sheetActionText: {
    fontFamily: "Inter_500Medium",
    fontSize: 16,
    color: Colors.dark.textPrimary,
    flex: 1,
  },
  unsavedBadge: {
    backgroundColor: "rgba(245, 158, 11, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  unsavedBadgeText: {
    color: Colors.dark.warning,
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
  },
});
