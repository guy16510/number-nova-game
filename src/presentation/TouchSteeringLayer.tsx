import React, { useMemo } from 'react';
import { PanResponder, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import type { SteeringInput } from '../domain/types';

interface TouchSteeringLayerProps {
  readonly enabled: boolean;
  readonly onInput: (input: SteeringInput) => void;
}

export const TouchSteeringLayer = ({ enabled, onInput }: TouchSteeringLayerProps) => {
  const { width, height } = useWindowDimensions();
  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => enabled,
    onMoveShouldSetPanResponder: () => enabled,
    onPanResponderGrant: (event) => {
      onInput({
        x: Math.max(-1, Math.min(1, (event.nativeEvent.locationX - width / 2) / (width * 0.36))),
        y: Math.max(-1, Math.min(1, -(event.nativeEvent.locationY - height / 2) / (height * 0.32))),
      });
    },
    onPanResponderMove: (event) => {
      onInput({
        x: Math.max(-1, Math.min(1, (event.nativeEvent.locationX - width / 2) / (width * 0.36))),
        y: Math.max(-1, Math.min(1, -(event.nativeEvent.locationY - height / 2) / (height * 0.32))),
      });
    },
    onPanResponderRelease: () => onInput({ x: 0, y: 0 }),
    onPanResponderTerminate: () => onInput({ x: 0, y: 0 }),
  }), [enabled, height, onInput, width]);

  if (!enabled) {
    return null;
  }

  return (
    <View style={StyleSheet.absoluteFill} {...responder.panHandlers}>
      <View pointerEvents="none" style={styles.hint}>
        <Text style={styles.hintText}>DRAG TO STEER</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  hint: {
    position: 'absolute',
    bottom: 104,
    alignSelf: 'center',
    borderRadius: 16,
    backgroundColor: '#07133AB8',
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  hintText: { color: '#A8C5FF', fontSize: 12, fontWeight: '900', letterSpacing: 1.2 },
});
