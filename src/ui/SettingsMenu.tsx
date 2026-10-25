import React from 'react';
import { Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { CHARACTERS, CharacterArt, characterDef } from './characters';
import { BLOB_COLORS, C, FONT, blobColor } from './theme';

const PRIVACY_URL = 'https://hi-dad.github.io/snail-house/privacy.html';
const SUPPORT_URL = 'https://hi-dad.github.io/snail-house/support.html';

function openPage(url: string) {
  Linking.openURL(url).catch(() => {});
}

interface Props {
  visible: boolean;
  characterId?: string;
  colorId: string;
  soundEnabled: boolean;
  onClose: () => void;
  onCharacterChange: (characterId: string) => void;
  onColorChange: (colorId: string) => void;
  onSoundEnabledChange: (enabled: boolean) => void;
}

/** Player-facing appearance settings. Changes apply to the current run immediately. */
export function SettingsMenu({
  visible,
  characterId,
  colorId,
  soundEnabled,
  onClose,
  onCharacterChange,
  onColorChange,
  onSoundEnabledChange,
}: Props) {
  const selectedCharacter = characterDef(characterId).id;
  const selectedColor = blobColor(colorId);
  const wiggle = useSharedValue(0);
  const wiggleStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${wiggle.value * 6}deg` }] }));

  function bounce() {
    wiggle.set(
      withSequence(withTiming(-1, { duration: 80 }), withTiming(1, { duration: 120 }), withTiming(0, { duration: 100 })),
    );
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card}>
          <View style={styles.heading}>
            <View>
              <Text style={styles.title}>Settings</Text>
              <Text style={styles.tagline}>Game options</Text>
            </View>
            <Pressable accessibilityLabel="Close settings" onPress={onClose} style={styles.close}>
              <Text style={styles.closeText}>×</Text>
            </Pressable>
          </View>

          <Animated.View style={[styles.preview, wiggleStyle]}>
            <View style={styles.previewCharacter}>
              <CharacterArt kind={selectedCharacter} color={selectedColor} size={88} />
            </View>
            <View style={styles.namePill}>
              <Text style={styles.name}>{characterDef(selectedCharacter).name}</Text>
            </View>
          </Animated.View>

          <Text style={styles.section}>Character</Text>
          <View style={styles.characterGrid}>
            {CHARACTERS.map((character) => {
              const selected = character.id === selectedCharacter;
              return (
                <Pressable
                  accessibilityLabel={character.name}
                  accessibilityState={{ selected }}
                  key={character.id}
                  onPress={() => {
                    onCharacterChange(character.id);
                    bounce();
                  }}
                  style={[styles.character, selected && styles.selected]}
                >
                  <CharacterArt kind={character.id} color={selectedColor} size={50} />
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.section}>Color</Text>
          <View style={styles.colorGrid}>
            {BLOB_COLORS.map((color) => {
              const selected = color.id === selectedColor.id;
              return (
                <Pressable
                  accessibilityLabel={color.name}
                  accessibilityState={{ selected }}
                  key={color.id}
                  onPress={() => {
                    onColorChange(color.id);
                    bounce();
                  }}
                  style={[styles.colorChoice, selected && styles.selected]}
                >
                  <View style={[styles.colorDot, { backgroundColor: color.body }]} />
                </Pressable>
              );
            })}
          </View>

          <View style={styles.soundRow}>
            <View>
              <Text style={styles.soundTitle}>Sound effects</Text>
              <Text style={styles.soundStatus}>{soundEnabled ? 'On' : 'Muted'}</Text>
            </View>
            <Pressable
              accessibilityLabel={soundEnabled ? 'Mute sound effects' : 'Turn on sound effects'}
              accessibilityRole="switch"
              accessibilityState={{ checked: soundEnabled }}
              onPress={() => onSoundEnabledChange(!soundEnabled)}
              style={({ pressed }) => [styles.soundButton, !soundEnabled && styles.soundButtonMuted, pressed && styles.soundPressed]}
            >
              <SoundIcon muted={!soundEnabled} />
            </Pressable>
          </View>

          <View style={styles.linkRow}>
            <Pressable
              accessibilityLabel="Open privacy policy"
              accessibilityRole="link"
              onPress={() => openPage(PRIVACY_URL)}
              style={({ pressed }) => [styles.linkButton, pressed && styles.linkPressed]}
            >
              <Text style={styles.linkText}>Privacy</Text>
            </Pressable>
            <Pressable
              accessibilityLabel="Open support page"
              accessibilityRole="link"
              onPress={() => openPage(SUPPORT_URL)}
              style={({ pressed }) => [styles.linkButton, pressed && styles.linkPressed]}
            >
              <Text style={styles.linkText}>Support</Text>
            </Pressable>
          </View>

          <Pressable onPress={onClose} style={({ pressed }) => [styles.done, pressed && styles.donePressed]}>
            <Text style={styles.doneText}>Done</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(91,70,54,0.38)',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 380,
    backgroundColor: C.paper,
    borderRadius: 24,
    padding: 20,
    borderWidth: 2.5,
    borderColor: C.outline,
    shadowColor: C.outline,
    shadowOpacity: 0.25,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontFamily: FONT.heavy, fontSize: 28, lineHeight: 32, color: C.ink },
  tagline: { fontFamily: FONT.semibold, fontSize: 14, color: C.inkSoft },
  close: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: C.wall,
  },
  closeText: { fontFamily: FONT.heavy, fontSize: 28, lineHeight: 32, color: C.inkSoft },
  preview: { alignItems: 'center', marginTop: 6, marginBottom: 2 },
  previewCharacter: {
    width: 104,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
  },
  namePill: {
    marginTop: -6,
    paddingHorizontal: 14,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: C.wall,
  },
  name: { fontFamily: FONT.bold, fontSize: 18, color: C.inkSoft },
  section: { fontFamily: FONT.bold, fontSize: 16, color: C.ink, marginTop: 8, marginBottom: 6 },
  characterGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 7 },
  character: {
    width: 62,
    height: 62,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    borderWidth: 2.5,
    borderColor: C.wall,
    backgroundColor: '#FFFDFC',
  },
  selected: { borderColor: C.buttonDeep, backgroundColor: '#FFF0ED' },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  colorChoice: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: 'transparent',
  },
  colorDot: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: C.outline },
  soundRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: C.wall,
    backgroundColor: '#FFFDFC',
  },
  soundTitle: { fontFamily: FONT.bold, fontSize: 16, color: C.ink },
  soundStatus: { fontFamily: FONT.semibold, fontSize: 13, color: C.inkSoft },
  soundButton: {
    width: 54,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    borderWidth: 2,
    borderColor: C.outline,
    backgroundColor: '#DDF3E8',
  },
  soundButtonMuted: { backgroundColor: '#F8E3E1' },
  soundPressed: { transform: [{ scale: 0.94 }] },
  linkRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginTop: 12 },
  linkButton: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: C.wall,
    backgroundColor: '#FFFDFC',
  },
  linkPressed: { backgroundColor: C.paperDeep },
  linkText: { fontFamily: FONT.bold, fontSize: 14, color: C.inkSoft },
  done: {
    alignSelf: 'center',
    marginTop: 14,
    paddingHorizontal: 24,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: C.button,
    borderWidth: 2.5,
    borderColor: C.outline,
    shadowColor: C.outline,
    shadowOpacity: 0.25,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  donePressed: { transform: [{ translateY: 2 }], shadowOffset: { width: 0, height: 1 } },
  doneText: { fontFamily: FONT.heavy, fontSize: 17, color: '#FFFFFF' },
});

/** Original speaker mark with a clear red mute slash. */
function SoundIcon({ muted }: { muted: boolean }) {
  return (
    <Svg width={38} height={30} viewBox="0 0 38 30">
      <Path
        d="M3 11 H9 L17 5 V25 L9 19 H3 Z"
        fill="#E9A47F"
        stroke={C.outline}
        strokeWidth={2.4}
        strokeLinejoin="round"
      />
      <Path
        d="M22 10 C25 12 25 18 22 20 M26 6 C32 10 32 20 26 24"
        fill="none"
        stroke={C.outline}
        strokeWidth={2.4}
        strokeLinecap="round"
      />
      {muted && (
        <Path d="M4 3 L34 27" fill="none" stroke={C.danger} strokeWidth={4} strokeLinecap="round" />
      )}
    </Svg>
  );
}
