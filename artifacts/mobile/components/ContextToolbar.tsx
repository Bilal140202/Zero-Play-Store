import React from "react";
import { StyleSheet, View, Pressable, Text } from "react-native";
import Animated, { useAnimatedStyle, withSpring } from "react-native-reanimated";
import Colors from "@/constants/colors";
import { ToolType } from "./ToolBar";

interface ContextToolbarProps {
  activeTool: ToolType;
  color: string;
  onColorChange: (color: string) => void;
  strokeWidth?: number;
  onStrokeWidthChange?: (width: number) => void;
  shapeType?: 'rectangle' | 'circle' | 'arrow' | 'line';
  onShapeTypeChange?: (shape: 'rectangle' | 'circle' | 'arrow' | 'line') => void;
}

const COLORS = ["#EF4444", "#F59E0B", "#10B981", "#3B82F6", "#6366F1", "#8B5CF6", "#000000", "#FFFFFF"];
const HIGHLIGHT_COLORS = ["#FEF08A", "#BBF7D0", "#FBCFE8", "#BFDBFE", "#FED7AA"];
const SHAPES = ['rectangle', 'circle', 'arrow', 'line'] as const;

export function ContextToolbar({ activeTool, color, onColorChange, strokeWidth, onStrokeWidthChange, shapeType, onShapeTypeChange }: ContextToolbarProps) {
  const isVisible = ['draw', 'highlight', 'text', 'shape'].includes(activeTool);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateY: withSpring(isVisible ? 0 : 150, {
            damping: 20,
            stiffness: 90,
          }),
        },
      ],
      opacity: withSpring(isVisible ? 1 : 0),
    };
  }, [isVisible]);

  if (!isVisible && false) return null; // keep mounted for animation

  const renderColorDots = (colors: string[]) => (
    <View style={styles.colorRow}>
      {colors.map((c) => (
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
  );

  return (
    <Animated.View style={[styles.container, animatedStyle]} pointerEvents={isVisible ? "auto" : "none"}>
      {activeTool === 'highlight' && renderColorDots(HIGHLIGHT_COLORS)}
      {(activeTool === 'draw' || activeTool === 'text') && renderColorDots(COLORS)}
      
      {activeTool === 'shape' && (
        <View style={styles.shapeRow}>
          {SHAPES.map(s => (
            <Pressable 
              key={s} 
              style={[styles.shapeBtn, shapeType === s && styles.activeShapeBtn]}
              onPress={() => onShapeTypeChange?.(s)}
            >
              <Text style={[styles.shapeBtnText, shapeType === s && styles.activeShapeBtnText]}>{s.charAt(0).toUpperCase() + s.slice(1)}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {activeTool === 'draw' && (
        <View style={styles.strokeRow}>
          {[2, 4, 6, 8].map(w => (
            <Pressable 
              key={w} 
              style={[styles.strokeBtn, strokeWidth === w && styles.activeStrokeBtn]}
              onPress={() => onStrokeWidthChange?.(w)}
            >
              <View style={[styles.strokeDot, { width: w*2, height: w*2, borderRadius: w }]} />
            </Pressable>
          ))}
        </View>
      )}
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
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
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
  shapeRow: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: Colors.dark.surface,
    padding: 4,
    borderRadius: 8,
  },
  shapeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  activeShapeBtn: {
    backgroundColor: Colors.dark.accent,
  },
  shapeBtnText: {
    color: Colors.dark.textSecondary,
    fontFamily: "Inter_500Medium",
    fontSize: 12,
  },
  activeShapeBtnText: {
    color: "#FFF",
  },
  strokeRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
  },
  strokeBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: Colors.dark.surface,
  },
  activeStrokeBtn: {
    backgroundColor: "rgba(99, 102, 241, 0.2)",
    borderWidth: 1,
    borderColor: Colors.dark.accent,
  },
  strokeDot: {
    backgroundColor: Colors.dark.textPrimary,
  }
});
