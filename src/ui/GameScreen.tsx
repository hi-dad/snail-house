import React, { useEffect, useRef, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { gameNow } from '../clock';
import { HOUR_MS } from '../game/constants';
import { GameState, advance, safetyMs, survivedMs } from '../game/simulation';
import { playCollect, playSafe } from '../sound';
import { Board } from './Board';
import { StrawberryArt } from './characters';
import { DebugMenu } from './DebugMenu';
import { formatSafety, formatStreak } from './format';
import { ASPECT } from './geometry';
import { C, FONT } from './theme';

const TICK_MS = 250;
const BOARD_SIDE_GUTTER = 4;
const BOARD_GAP = 10;
const COUNT_UP_MS = 900;

interface Props {
  game: GameState;
  onGame: (next: GameState, opts?: { moved?: boolean }) => void;
  onNewRun: () => void;
  onResetAll: () => void;
}

export function GameScreen({ game, onGame, onNewRun, onResetAll }: Props) {
  const insets = useSafeAreaInsets();
  const [now, setNow] = useState(gameNow);
  const [area, setArea] = useState({ w: 0, h: 0 });
  const [debugOpen, setDebugOpen] = useState(false);
  const [boost, setBoost] = useState<{ amount: number; id: number } | null>(null);
  const [boostLeft, setBoostLeft] = useState(0);

  // Keep the world moving while the app is open.
  const gameRef = useRef(game);
  useEffect(() => {
    gameRef.current = game;
  }, [game]);
  useEffect(() => {
    const id = setInterval(() => {
      const t = gameNow();
      setNow(t);
      const next = advance(gameRef.current, t);
      if (next !== gameRef.current) onGame(next);
    }, TICK_MS);
    return () => clearInterval(id);
  }, [onGame]);

  // The counter ticks up when the character reaches the strawberry, not at the tap.
  const [pendingPickups, setPendingPickups] = useState(0);
  const bump = useSharedValue(0);
  const bumpStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 + bump.value * 0.35 }] }));

  function handleMove(next: GameState, pickupInMs?: number) {
    if (pickupInMs !== undefined) {
      setPendingPickups((n) => n + 1);
      setTimeout(() => {
        playCollect();
        setPendingPickups((n) => n - 1);
        bump.set(withSequence(withTiming(1, { duration: 120 }), withTiming(0, { duration: 260 })));
      }, pickupInMs);
    }
    const t = gameNow();
    const before = safetyMs(advance(game, t), t);
    const after = safetyMs(next, t);
    if (after > before + 60 * 1000) {
      setBoost({ amount: after - before, id: Date.now() });
      setBoostLeft(after - before);
      playSafe();
    }
    setNow(t);
    onGame(next, { moved: true });
  }

  // After a good move the timer counts up to its new value instead of jumping.
  useEffect(() => {
    if (!boost) return;
    const start = Date.now();
    let raf = 0;
    const frame = () => {
      const p = Math.min(1, (Date.now() - start) / COUNT_UP_MS);
      setBoostLeft(boost.amount * (1 - p) ** 3);
      if (p < 1) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [boost]);

  const safety = game.alive ? safetyMs(game, now) : 0;
  const shown = safety - boostLeft;
  const tone = safety > 24 * HOUR_MS ? C.safe : safety > 6 * HOUR_MS ? C.warn : C.danger;

  // Soft pulse when time is short.
  const pulse = useSharedValue(0);
  const urgent = safety <= 6 * HOUR_MS && game.alive;
  useEffect(() => {
    if (urgent) pulse.set(withRepeat(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.sin) }), -1, true));
    else {
      cancelAnimation(pulse);
      pulse.set(withTiming(0));
    }
  }, [urgent, pulse]);
  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 + pulse.value * 0.06 }] }));

  // Make the house as big as the screen allows (usually limited by width), then centre the
  // header + house together so the spare height is split above and below.
  const onLayout = (e: LayoutChangeEvent) =>
    setArea({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });
  const [headerH, setHeaderH] = useState(0);
  const boardWidth = Math.floor(Math.min(area.w - BOARD_SIDE_GUTTER * 2, (area.h - headerH - BOARD_GAP) * ASPECT));

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8 }]}>
      <View style={styles.content} onLayout={onLayout}>
        <Pressable
          onLongPress={() => setDebugOpen(true)}
          delayLongPress={1200}
          style={styles.header}
          onLayout={(e) => setHeaderH(e.nativeEvent.layout.height)}
        >
          <Animated.View style={[styles.pill, { backgroundColor: tone }, pulseStyle]}>
            <Text style={styles.safeLabel}>Safe for</Text>
            <Text style={styles.safeTime}>{formatSafety(shown)}</Text>
          </Animated.View>
          <View style={styles.stats}>
            <Text style={styles.streak}>{formatStreak(survivedMs(game, now))}</Text>
            <Text style={styles.dot}>·</Text>
            <Animated.View style={[styles.tokens, bumpStyle]}>
              <StrawberryArt size={22} />
              <Text style={styles.streak}>{game.tokens - pendingPickups}</Text>
            </Animated.View>
          </View>
        </Pressable>

        <View style={styles.boardArea}>
          {boardWidth > 0 && headerH > 0 && <Board width={boardWidth} game={game} now={now} onMove={handleMove} />}
        </View>
      </View>

      <DebugMenu
        visible={debugOpen}
        game={game}
        onClose={() => setDebugOpen(false)}
        onGame={(g) => onGame(g, { moved: true })}
        onNewRun={onNewRun}
        onResetAll={onResetAll}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.paper },
  header: { alignItems: 'center', paddingHorizontal: 16, paddingBottom: 6 },
  pill: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    paddingHorizontal: 22,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 2.5,
    borderColor: C.outline,
    shadowColor: C.outline,
    shadowOpacity: 0.25,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  safeLabel: { fontFamily: FONT.bold, fontSize: 18, color: '#FFFFFF' },
  safeTime: { fontFamily: FONT.heavy, fontSize: 34, color: '#FFFFFF', fontVariant: ['tabular-nums'] },
  stats: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  streak: { fontFamily: FONT.bold, fontSize: 18, color: C.inkSoft },
  dot: { fontFamily: FONT.bold, fontSize: 18, color: C.inkSoft, opacity: 0.6 },
  tokens: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  content: { flex: 1, justifyContent: 'center' },
  boardArea: { alignItems: 'center', marginTop: BOARD_GAP },
});
