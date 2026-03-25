import React from "react";
import { View, StyleSheet, Text, Pressable, ScrollView, Switch, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleClearCache = () => {
    Alert.alert("Clear Cache", "This will remove all recent files. Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { 
        text: "Clear", 
        style: "destructive",
        onPress: async () => {
          await AsyncStorage.removeItem('pdfx_recent_files');
          Alert.alert("Success", "Cache cleared successfully.");
        }
      }
    ]);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.dark.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Settings</Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Appearance</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <Ionicons name="moon" size={20} color={Colors.dark.textPrimary} />
                <Text style={styles.rowText}>Dark Mode</Text>
              </View>
              <Switch value={true} onValueChange={() => {}} trackColor={{ true: Colors.dark.accent }} />
            </View>
            <View style={styles.divider} />
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <Ionicons name="color-palette" size={20} color={Colors.dark.textPrimary} />
                <Text style={styles.rowText}>Accent Color</Text>
              </View>
              <View style={[styles.colorDot, { backgroundColor: Colors.dark.accent }]} />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Storage</Text>
          <View style={styles.card}>
            <Pressable style={styles.row} onPress={handleClearCache}>
              <View style={styles.rowLeft}>
                <Ionicons name="trash-outline" size={20} color={Colors.dark.warning} />
                <Text style={styles.rowText}>Clear Recent Files</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.dark.textSecondary} />
            </Pressable>
            <View style={styles.divider} />
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <Ionicons name="server-outline" size={20} color={Colors.dark.textPrimary} />
                <Text style={styles.rowText}>App Cache</Text>
              </View>
              <Text style={styles.valueText}>12.4 MB</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.rowText}>Version</Text>
              <Text style={styles.valueText}>1.0.0</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.row}>
              <Text style={styles.rowText}>Privacy Policy</Text>
              <Ionicons name="open-outline" size={20} color={Colors.dark.textSecondary} />
            </View>
            <View style={styles.divider} />
            <View style={styles.row}>
              <Text style={styles.rowText}>Open Source</Text>
              <Ionicons name="logo-github" size={20} color={Colors.dark.textSecondary} />
            </View>
          </View>
        </View>
        
        <Text style={styles.footerText}>Made with 🖤 by Replit</Text>
      </ScrollView>
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
  content: {
    padding: 24,
    gap: 32,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontFamily: "Inter_600SemiBold",
    color: Colors.dark.textSecondary,
    fontSize: 14,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  card: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  rowText: {
    fontFamily: "Inter_500Medium",
    color: Colors.dark.textPrimary,
    fontSize: 16,
  },
  valueText: {
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textSecondary,
    fontSize: 16,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.dark.border,
    marginLeft: 48,
  },
  colorDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  footerText: {
    textAlign: "center",
    fontFamily: "Inter_400Regular",
    color: Colors.dark.textSecondary,
    fontSize: 14,
    marginTop: 32,
  },
});
