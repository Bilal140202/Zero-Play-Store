import React, { useMemo } from "react";
import { StyleSheet, Text, View, Dimensions } from "react-native";
import Colors from "@/constants/colors";

interface PDFPageProps {
  pageNumber: number;
}

const SCREEN_WIDTH = Dimensions.get("window").width;
const PAGE_WIDTH = SCREEN_WIDTH - 32;
const PAGE_HEIGHT = PAGE_WIDTH * 1.414; // A4 aspect ratio

export function PDFPage({ pageNumber }: PDFPageProps) {
  const lines = useMemo(() => {
    const l = [];
    const count = 10 + Math.floor(Math.random() * 10);
    for (let i = 0; i < count; i++) {
      l.push({
        id: i.toString(),
        width: 40 + Math.random() * 50 + "%",
        isHeading: i === 0 || Math.random() > 0.8,
        isImage: Math.random() > 0.9,
      });
    }
    return l;
  }, [pageNumber]);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {lines.map((line) => {
          if (line.isImage) {
            return <View key={line.id} style={styles.imagePlaceholder} />;
          }
          return (
            <View
              key={line.id}
              style={[
                styles.line,
                { width: line.width as any },
                line.isHeading && styles.headingLine,
              ]}
            />
          );
        })}
      </View>
      <Text style={styles.pageNumber}>{pageNumber}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    marginBottom: 16,
    padding: 24,
    alignSelf: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  content: {
    flex: 1,
    gap: 12,
  },
  line: {
    height: 8,
    backgroundColor: "#E2E8F0",
    borderRadius: 4,
  },
  headingLine: {
    height: 16,
    backgroundColor: "#94A3B8",
    marginTop: 12,
    marginBottom: 4,
  },
  imagePlaceholder: {
    width: "100%",
    height: 120,
    backgroundColor: "#F1F5F9",
    borderRadius: 8,
    marginVertical: 12,
  },
  pageNumber: {
    textAlign: "center",
    color: "#94A3B8",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
});
