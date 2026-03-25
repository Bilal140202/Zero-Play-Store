import React, { useRef, useState } from "react";
import { View, StyleSheet, PanResponder, GestureResponderEvent } from "react-native";
import Svg, { Path } from "react-native-svg";

interface Point {
  x: number;
  y: number;
}

export function SignatureCanvas({
  onDrawEnd,
}: {
  onDrawEnd?: (paths: string[]) => void;
}) {
  const [paths, setPaths] = useState<string[]>([]);
  const [currentPath, setCurrentPath] = useState<string>("");

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt: GestureResponderEvent) => {
        const { locationX, locationY } = evt.nativeEvent;
        setCurrentPath(`M${locationX},${locationY}`);
      },
      onPanResponderMove: (evt: GestureResponderEvent) => {
        const { locationX, locationY } = evt.nativeEvent;
        setCurrentPath((prev) => `${prev} L${locationX},${locationY}`);
      },
      onPanResponderRelease: () => {
        setPaths((prev) => {
          const newPaths = [...prev, currentPath];
          onDrawEnd?.(newPaths);
          return newPaths;
        });
        setCurrentPath("");
      },
    })
  ).current;

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      <Svg style={StyleSheet.absoluteFill}>
        {paths.map((p, index) => (
          <Path
            key={index}
            d={p}
            stroke="#000"
            strokeWidth={4}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        ))}
        {currentPath ? (
          <Path
            d={currentPath}
            stroke="#000"
            strokeWidth={4}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        ) : null}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF",
    borderRadius: 16,
    overflow: "hidden",
  },
});
