import React, { useState } from "react";
import { View, StyleSheet, Text, Pressable, ScrollView, Platform } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import * as Haptics from "expo-haptics";

export default function FormsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [fields, setFields] = useState({
    name: "John Doe",
    email: "",
    agreed: false,
    type: 'individual'
  });

  const filledCount = Object.values(fields).filter(v => typeof v === 'boolean' ? v : v !== "").length;
  const totalCount = 4;

  const handleSave = () => {
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.dark.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Fill Form</Text>
        <View style={{ width: 48 }} />
      </View>

      <View style={styles.statusBar}>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${(filledCount/totalCount)*100}%` }]} />
        </View>
        <Text style={styles.statusText}>{filledCount} of {totalCount} fields filled</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.simulatedPage}>
          <Text style={styles.formTitle}>REGISTRATION FORM</Text>
          
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Full Name</Text>
            <View style={[styles.fieldInput, fields.name ? styles.fieldFilled : null]}>
              <Text style={styles.fieldText}>{fields.name || "Enter name"}</Text>
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Email Address</Text>
            <Pressable 
              style={[styles.fieldInput, fields.email ? styles.fieldFilled : null]}
              onPress={() => setFields({...fields, email: 'john@example.com'})}
            >
              <Text style={[styles.fieldText, !fields.email && { color: "#94A3B8" }]}>
                {fields.email || "Tap to fill email"}
              </Text>
            </Pressable>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Account Type</Text>
            <View style={styles.radioGroup}>
              <Pressable style={styles.radioRow} onPress={() => setFields({...fields, type: 'individual'})}>
                <View style={styles.radioOut}>
                  {fields.type === 'individual' && <View style={styles.radioIn} />}
                </View>
                <Text style={styles.radioLabel}>Individual</Text>
              </Pressable>
              <Pressable style={styles.radioRow} onPress={() => setFields({...fields, type: 'business'})}>
                <View style={styles.radioOut}>
                  {fields.type === 'business' && <View style={styles.radioIn} />}
                </View>
                <Text style={styles.radioLabel}>Business</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Pressable style={styles.checkRow} onPress={() => setFields({...fields, agreed: !fields.agreed})}>
              <View style={[styles.checkbox, fields.agreed && styles.checkboxChecked]}>
                {fields.agreed && <Ionicons name="checkmark" size={16} color="#FFF" />}
              </View>
              <Text style={styles.checkLabel}>I agree to the terms and conditions</Text>
            </Pressable>
          </View>

        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable style={styles.saveBtn} onPress={handleSave}>
          <Text style={styles.saveBtnText}>Flatten & Save</Text>
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
  statusBar: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: Colors.dark.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: Colors.dark.surface2,
    borderRadius: 3,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: Colors.dark.accent,
    borderRadius: 3,
  },
  statusText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: Colors.dark.textSecondary,
    textAlign: "right",
  },
  content: {
    padding: 24,
    alignItems: "center",
  },
  simulatedPage: {
    width: "100%",
    maxWidth: 500,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  formTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    color: "#1E293B",
    textAlign: "center",
    marginBottom: 32,
    letterSpacing: 1,
  },
  fieldGroup: {
    marginBottom: 24,
  },
  fieldLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: "#334155",
    marginBottom: 8,
  },
  fieldInput: {
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 6,
    padding: 12,
    height: 48,
    justifyContent: "center",
  },
  fieldFilled: {
    backgroundColor: "rgba(99, 102, 241, 0.05)",
    borderColor: Colors.dark.accent,
  },
  fieldText: {
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    color: "#0F172A",
  },
  radioGroup: {
    gap: 12,
  },
  radioRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  radioOut: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#64748B",
    alignItems: "center",
    justifyContent: "center",
  },
  radioIn: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.dark.accent,
  },
  radioLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    color: "#334155",
  },
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 16,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#64748B",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: Colors.dark.accent,
    borderColor: Colors.dark.accent,
  },
  checkLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "#334155",
    flex: 1,
  },
  footer: {
    padding: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
    backgroundColor: Colors.dark.surface,
  },
  saveBtn: {
    backgroundColor: Colors.dark.accent,
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  saveBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: "#FFF",
  },
});
