import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import Colors from "@/constants/colors";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface RecentFileCardProps {
  id: string;
  name: string;
  size: string;
  pages: number;
  lastOpened: string;
  onPress: () => void;
  onLongPress: () => void;
}

function timeAgo(dateString: string) {
  const diff = Date.now() - new Date(dateString).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function RecentFileCard({
  name,
  size,
  pages,
  lastOpened,
  onPress,
  onLongPress,
}: RecentFileCardProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      style={[styles.container, animatedStyle]}
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={() => (scale.value = withSpring(0.97))}
      onPressOut={() => (scale.value = withSpring(1))}
    >
      <View style={styles.thumbnail}>
        <Ionicons name="document-text" size={32} color={Colors.dark.accent} />
      </View>
      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.meta}>
          {size} • {pages} pages
        </Text>
        <Text style={styles.time}>{timeAgo(lastOpened)}</Text>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 160,
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    marginRight: 16,
    overflow: "hidden",
  },
  thumbnail: {
    height: 100,
    backgroundColor: Colors.dark.surface2,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    padding: 12,
  },
  name: {
    color: Colors.dark.textPrimary,
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    marginBottom: 4,
  },
  meta: {
    color: Colors.dark.textSecondary,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    marginBottom: 4,
  },
  time: {
    color: Colors.dark.textSecondary,
    fontFamily: "Inter_400Regular",
    fontSize: 10,
  },
});
