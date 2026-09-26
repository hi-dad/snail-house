import React from 'react';
import { Pressable, StyleSheet, Text, ViewStyle } from 'react-native';

import { C, FONT } from './theme';

interface Props {
  label: string;
  onPress: () => void;
  color?: string;
  style?: ViewStyle;
  disabled?: boolean;
}

/** Chunky storybook button that squishes down when pressed. */
export function Button({ label, onPress, color = C.button, style, disabled }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: color, opacity: disabled ? 0.5 : 1 },
        pressed && styles.pressed,
        style,
      ]}
    >
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 999,
    borderWidth: 2.5,
    borderColor: C.outline,
    alignItems: 'center',
    shadowColor: C.outline,
    shadowOpacity: 0.3,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  pressed: { transform: [{ translateY: 3 }], shadowOffset: { width: 0, height: 1 } },
  label: { fontFamily: FONT.heavy, fontSize: 20, color: '#FFFFFF' },
});
