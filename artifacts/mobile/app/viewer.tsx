import React, { useState } from "react";
import { View, StyleSheet, Text, Pressable, ScrollView, Platform } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { PDFPage } from "@/components/PDFPage";
import { ToolBar, ToolType } from "@/components/ToolBar";
import { ContextToolbar } from "@/components/ContextToolbar";

export default function ViewerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  
  const fileName = (params.fileName as string) || "Document.pdf";
  const totalPages = parseInt(params.pages as string) || 5;

  const [activeTool, setActiveTool] = useState<ToolType>('select');
  const [color, setColor] = useState("#6366F1");

  const renderPages = () => {
    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
      pages.push(<PDFPage key={i} pageNumber={i} />);
    }
    return pages;
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.dark.textPrimary} />
        </Pressable>
        
        <View style={styles.titleContainer}>
          <Text style={styles.title} numberOfLines={1}>{fileName}</Text>
        </View>

        <Pressable style={styles.iconBtn}>
          <Ionicons name="ellipsis-vertical" size={24} color={Colors.dark.textPrimary} />
        </Pressable>
      </View>

      <View style={styles.canvasContainer}>
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={true}
        >
          {renderPages()}
        </ScrollView>
      </View>

      <ContextToolbar activeTool={activeTool} color={color} onColorChange={setColor} />
      <ToolBar activeTool={activeTool} onSelectTool={setActiveTool} />
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
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
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
  canvasContainer: {
    flex: 1,
    backgroundColor: "#1A1A24",
  },
  scrollContent: {
    paddingVertical: 24,
  },
});
