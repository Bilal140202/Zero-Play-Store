import React from "react";
import { ScrollView, StyleSheet, Text, Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { useAnimatedStyle, withSpring } from "react-native-reanimated";
import Colors from "@/constants/colors";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export type ToolType = 'select' | 'text' | 'draw' | 'highlight' | 'shape' | 'sign' | 'image' | 'eraser';

interface ToolBarProps {
  activeTool: ToolType;
  onSelectTool: (tool: ToolType) => void;
}

const TOOLS: { id: ToolType; icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
  { id: 'select', icon: 'cursor', label: 'Select' },
  { id: 'text', icon: 'text', label: 'Text' },
  { id: 'draw', icon: 'pencil', label: 'Draw' },
  { id: 'highlight', icon: 'color-wand', label: 'Highlight' },
  { id: 'shape', icon: 'shapes', label: 'Shape' },
  { id: 'sign', icon: 'create', label: 'Sign' },
  { id: 'image', icon: 'image', label: 'Image' },
  { id: 'eraser', icon: 'trash-bin', label: 'Eraser' },
];

export function ToolBar({ activeTool, onSelectTool }: ToolBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 16) }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {TOOLS.map((tool) => {
          const isActive = activeTool === tool.id;
          return (
            <Pressable
              key={tool.id}
              style={[styles.toolButton, isActive && styles.activeToolButton]}
              onPress={() => onSelectTool(tool.id)}
            >
              <Ionicons
                name={tool.icon}
                size={22}
                color={isActive ? Colors.dark.textPrimary : Colors.dark.textSecondary}
              />
              <Text style={[styles.toolLabel, isActive && styles.activeToolLabel]}>
                {tool.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.dark.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
    paddingTop: 12,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  toolButton: {
    alignItems: "center",
    justifyContent: "center",
    width: 64,
    height: 64,
    borderRadius: 16,
  },
  activeToolButton: {
    backgroundColor: Colors.dark.accent,
  },
  toolLabel: {
    color: Colors.dark.textSecondary,
    fontSize: 10,
    marginTop: 4,
    fontFamily: "Inter_500Medium",
  },
  activeToolLabel: {
    color: Colors.dark.textPrimary,
  },
});
