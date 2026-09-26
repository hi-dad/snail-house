import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing, FadeIn, FadeOut, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from './Button';
import { CHARACTERS, CharacterArt, SnailArt, characterDef } from './characters';
import { BLOB_COLORS, C, FONT, blobColor } from './theme';

const PAGES = [
  { text: 'A snail is coming for you.\nIt will never stop.', art: 'snail' },
  { text: 'Tap anywhere to get away.\nYou can move as much as you like.', art: 'walk' },
  { text: 'Just come back every day.\nGood luck.', art: 'sun' },
] as const;

export function Onboarding({ onDone }: { onDone: () => void }) {
  const insets = useSafeAreaInsets();
  const [page, setPage] = useState(0);
  const next = () => (page < PAGES.length - 1 ? setPage(page + 1) : onDone());
  return (
    <Pressable style={[styles.root, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]} onPress={next}>
      <Animated.View key={page} entering={FadeIn.duration(400)} exiting={FadeOut.duration(150)} style={styles.center}>
        <Illustration kind={PAGES[page].art} />
        <Text style={styles.text}>{PAGES[page].text}</Text>
      </Animated.View>
      <View style={styles.dots}>
        {PAGES.map((_, i) => (
          <View key={i} style={[styles.dot, i === page && styles.dotOn]} />
        ))}
      </View>
      {/* The whole screen is the tap target; the button is just a visual cue. */}
      <View pointerEvents="none">
        <Button label={page < PAGES.length - 1 ? 'Next' : "Let's go"} onPress={next} />
      </View>
    </Pressable>
  );
}

function Illustration({ kind }: { kind: 'snail' | 'walk' | 'sun' }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.set(withRepeat(withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [t]);
  const creep = useAnimatedStyle(() => ({ transform: [{ translateX: -30 + t.value * 30 }] }));
  const hop = useAnimatedStyle(() => ({
    transform: [{ translateX: 20 + t.value * 40 }, { translateY: -Math.abs(Math.sin(t.value * Math.PI * 6)) * 14 }],
  }));
  const bob = useAnimatedStyle(() => ({ transform: [{ translateY: -t.value * 8 }] }));

  if (kind === 'snail') {
    return (
      <Animated.View style={creep}>
        <SnailArt size={150} />
      </Animated.View>
    );
  }
  if (kind === 'walk') {
    return (
      <View style={styles.row}>
        <SnailArt size={80} />
        <Animated.View style={hop}>
          <CharacterArt color={BLOB_COLORS[0]} size={100} />
        </Animated.View>
      </View>
    );
  }
  return (
    <Animated.View style={[styles.sun, bob]}>
      <Text style={{ fontSize: 96 }}>🌤️</Text>
    </Animated.View>
  );
}

/** Two quick steps before a run: pick a character, then its color. */
interface PickerProps {
  initialCharacterId?: string | null;
  initialColorId?: string | null;
  onPick: (characterId: string, colorId: string) => void;
}

export function CharacterPicker({ initialCharacterId, initialColorId, onPick }: PickerProps) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<'character' | 'color'>('character');
  const [kind, setKind] = useState(characterDef(initialCharacterId ?? undefined).id);
  const [color, setColor] = useState(blobColor(initialColorId ?? BLOB_COLORS[0].id));
  const wiggle = useSharedValue(0);
  const wiggleStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${wiggle.value * 6}deg` }] }));

  function bounce() {
    wiggle.set(
      withSequence(withTiming(-1, { duration: 80 }), withTiming(1, { duration: 120 }), withTiming(0, { duration: 100 })),
    );
  }

  const picking = step === 'character';
  const options = picking
    ? CHARACTERS.map((c) => ({ key: c.id, kind: c.id, color, on: c.id === kind, pick: () => setKind(c.id) }))
    : BLOB_COLORS.map((c) => ({ key: c.id, kind, color: c, on: c.id === color.id, pick: () => setColor(c) }));

  return (
    <View style={[styles.root, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
      <Text style={styles.title}>{picking ? 'Who are you?' : 'Pick a color'}</Text>
      <Animated.View style={[styles.center, wiggleStyle]}>
        <CharacterArt kind={kind} color={color} size={170} />
        <Text style={styles.name}>
          {picking ? characterDef(kind).name : `${color.name} ${characterDef(kind).name}`}
        </Text>
      </Animated.View>
      <View style={styles.grid}>
        {options.map((o) => (
          <Pressable
            key={o.key}
            onPress={() => (o.pick(), bounce())}
            style={[styles.swatch, o.on && styles.swatchOn]}
          >
            <CharacterArt kind={o.kind} color={o.color} size={picking ? 64 : 52} />
          </Pressable>
        ))}
      </View>
      <View style={styles.actions}>
        {!picking && <Button label="Back" color={C.inkSoft} onPress={() => setStep('character')} />}
        <Button
          label={picking ? 'Next' : 'Start'}
          color={C.safe}
          onPress={() => (picking ? setStep('color') : onPick(kind, color.id))}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.paper, alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 28 },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  sun: { alignItems: 'center' },
  text: { fontFamily: FONT.bold, fontSize: 26, lineHeight: 36, color: C.ink, textAlign: 'center' },
  dots: { flexDirection: 'row', gap: 8, marginBottom: 18 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.paperDeep, borderWidth: 1.5, borderColor: C.outline },
  dotOn: { backgroundColor: C.button },
  title: { fontFamily: FONT.heavy, fontSize: 32, color: C.ink },
  name: { fontFamily: FONT.bold, fontSize: 22, color: C.inkSoft },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, marginBottom: 24, maxWidth: 320 },
  swatch: { padding: 6, borderRadius: 20, borderWidth: 2.5, borderColor: 'transparent' },
  swatchOn: { borderColor: C.outline, backgroundColor: '#FFFFFF' },
  actions: { flexDirection: 'row', gap: 12 },
});
