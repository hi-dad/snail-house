import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing, FadeIn, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GameState, survivedMs } from '../game/simulation';
import { Button } from './Button';
import { CharacterArt, SnailArt, StrawberryArt, characterDef } from './characters';
import { formatSurvived, formatTokens } from './format';
import { C, FONT, blobColor } from './theme';

interface Props {
  game: GameState;
  bestMs: number;
  bestTokens: number;
  onTryAgain: () => void;
  onChangeCharacter: () => void;
}

export function DeathScreen({ game, bestMs, bestTokens, onTryAgain, onChangeCharacter }: Props) {
  const insets = useSafeAreaInsets();
  const color = blobColor(game.colorId);
  const survived = survivedMs(game, game.deathTime ?? 0);
  const bestStreak = survived >= bestMs;
  const bestHaul = game.tokens > 0 && game.tokens >= bestTokens;

  return (
    <Animated.View
      entering={FadeIn.delay(700).duration(600)}
      style={[styles.root, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 20 }]}
    >
      <Hug colorBody={color} kind={game.characterId} />

      <View style={styles.cardWrap}>
        <View style={styles.card}>
          <Text style={styles.rip}>R.I.P.</Text>
          <Text style={styles.hereLies}>Here lies</Text>
          <Text style={styles.name}>{characterDef(game.characterId).name}</Text>
          <View style={styles.divider} />
          <Text style={styles.survived}>Survived</Text>
          <Text style={styles.time}>{formatSurvived(survived)}</Text>
          <View style={styles.haul}>
            <StrawberryArt size={22} />
            <Text style={styles.haulText}>{formatTokens(game.tokens)}</Text>
          </View>
        </View>
        <View style={styles.grass} />
      </View>

      <View style={styles.bests}>
        <Text style={styles.best}>
          {bestStreak ? '✨ Longest streak yet! ✨' : `Best streak: ${formatSurvived(bestMs)}`}
        </Text>
        <Text style={styles.best}>
          {bestHaul ? '🍓 Most strawberries yet! 🍓' : `Most strawberries: ${bestTokens}`}
        </Text>
      </View>

      <View style={styles.actions}>
        <Button label="Try again" color={C.safe} onPress={onTryAgain} />
        <Button label="Change character" color={C.button} onPress={onChangeCharacter} />
      </View>
    </Animated.View>
  );
}

function Hug({ colorBody, kind }: { colorBody: ReturnType<typeof blobColor>; kind?: string }) {
  const squeeze = useSharedValue(0);
  useEffect(() => {
    squeeze.set(withDelay(
      900,
      withRepeat(
        withSequence(withTiming(1, { duration: 350, easing: Easing.out(Easing.quad) }), withTiming(0, { duration: 450 })),
        -1,
      ),
    ));
  }, [squeeze]);

  const blobStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: 1 - squeeze.value * 0.1 }, { scaleY: 1 + squeeze.value * 0.06 }],
  }));
  const snailStyle = useAnimatedStyle(() => ({ transform: [{ translateX: -squeeze.value * 6 }, { scaleX: -1 }] }));
  return (
    <View style={styles.hug}>
      <Animated.View style={blobStyle}>
        <CharacterArt kind={kind} color={colorBody} size={96} mood="hugged" />
      </Animated.View>
      <Animated.View style={[{ marginLeft: -34 }, snailStyle]}>
        <SnailArt size={82} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(251, 244, 232, 0.97)',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  hug: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', height: 130 },
  cardWrap: { alignItems: 'center', paddingHorizontal: 12, paddingTop: 12, backgroundColor: C.paper },
  card: {
    width: 250,
    alignItems: 'center',
    backgroundColor: '#E9E4EE',
    borderTopLeftRadius: 125,
    borderTopRightRadius: 125,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    borderWidth: 3,
    borderColor: C.outline,
    paddingTop: 36,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  rip: { fontFamily: FONT.heavy, fontSize: 26, color: '#9C93A8', letterSpacing: 3 },
  hereLies: { fontFamily: FONT.semibold, fontSize: 16, color: C.inkSoft },
  name: { fontFamily: FONT.heavy, fontSize: 28, color: C.ink, textAlign: 'center' },
  divider: { width: 60, height: 3, borderRadius: 2, backgroundColor: '#CFC6DA', marginVertical: 8 },
  survived: { fontFamily: FONT.semibold, fontSize: 15, color: C.inkSoft },
  time: { fontFamily: FONT.heavy, fontSize: 22, color: C.ink, textAlign: 'center' },
  grass: { width: 290, height: 16, backgroundColor: '#A9D5A0', borderRadius: 8, borderWidth: 2.5, borderColor: C.outline, marginTop: -6 },
  haul: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  haulText: { fontFamily: FONT.bold, fontSize: 16, color: C.ink },
  bests: { alignItems: 'center', gap: 2 },
  best: { fontFamily: FONT.bold, fontSize: 16, color: C.inkSoft },
  actions: { alignSelf: 'stretch', gap: 12 },
});
