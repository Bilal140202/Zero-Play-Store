import React from "react";
import { StyleSheet, View, Pressable } from "react-native";
import Animated, { useAnimatedStyle, withSpring } from "react-native-reanimated";
import Colors from "@/constants/colors";
import { ToolType } from "./ToolBar";

interface ContextToolbarProps {
  activeTool: ToolType;
  color: string;
  onColorChange: (color: string) => void;
}

const COLORS = ["#EF4444", "#F59E0B", "#10B981", "#3B82F6", "#6366F1", "#8B5CF6", "#000000"];

export function ContextToolbar({ activeTool, color, onColorChange }: ContextToolbarProps) {
  const isVisible = ['draw', 'highlight', 'text', 'shape'].includes(activeTool);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateY: withSpring(isVisible ? 0 : 100, {
            damping: 20,
            stiffness: 90,
          }),
        },
      ],
      opacity: withSpring(isVisible ? 1 : 0),
    };
  }, [isVisible]);

  if (!isVisible && false) return null; // keep mounted for animation

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <View style={styles.colorRow}>
        {COLORS.map((c) => (
          <Pressable
            key={c}
            style={[
              styles.colorDot,
              { backgroundColor: c },
              color === c && styles.activeColorDot,
            ]}
            onPress={() => onColorChange(c)}
          />
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 100,
    left: 16,
    right: 16,
    backgroundColor: Colors.dark.surface2,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  colorRow: {
    flexDirection: "row",
    gap: 12,
  },
  colorDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "transparent",
  },
  activeColorDot: {
    borderColor: Colors.dark.textPrimary,
  },
});
