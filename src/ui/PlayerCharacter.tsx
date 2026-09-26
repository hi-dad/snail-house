import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing, ReduceMotion, SharedValue, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming,
} from 'react-native-reanimated';

import { CharacterArt, CharacterFace, ChickWing, KittyTail, Mood, PIVOTS, SproutLeaf, WaveHand } from './characters';
import { BlobColor } from './theme';

/**
 * The character's personality animations (glancing around, tail swish, leaf wobble, wing
 * flaps, waving) are what make it feel alive, so they play even with the phone's Reduce
 * Motion setting on. Switch this to ReduceMotion.System to respect that setting instead.
 */
export const CHARACTER_MOTION = ReduceMotion.Never;
const rm = { reduceMotion: CHARACTER_MOTION };
const sine = Easing.inOut(Easing.sin);

interface Props {
  kind?: string;
  color: BlobColor;
  size: number;
  mood: Mood;
  /** 0..1 while hopping (driven by the board). */
  hop: SharedValue<number>;
  /** 0 → 1 over one wave; hidden outside that range. */
  wave: SharedValue<number>;
  /** 0..1 during a celebration jump (picked up a strawberry). */
  cheer: SharedValue<number>;
}

/** The player's character, drawn in layers so its face and moving parts animate on their own. */
export function PlayerCharacter({ kind = 'blob', color, size, mood, hop, wave, cheer }: Props) {
  const look = useSharedValue(0); // -1 left … 1 right
  const sway = useSharedValue(0); // slow 0..1 loop for tail and leaf
  const flap = useSharedValue(0); // chick's idle wing flaps

  useEffect(() => {
    const glance = (to: number, hold: number) =>
      withSequence(
        CHARACTER_MOTION,
        withDelay(hold, withTiming(to, { duration: 260, easing: sine, ...rm }), CHARACTER_MOTION),
      );
    // Idle: look left, back, right, back — with pauses so it feels curious, not twitchy.
    look.set(
      withRepeat(
        withSequence(CHARACTER_MOTION, glance(-1, 2600), glance(0, 900), glance(1, 2200), glance(0, 900)),
        -1,
        false,
        undefined,
        CHARACTER_MOTION,
      ),
    );
    sway.set(withRepeat(withTiming(1, { duration: 1300, easing: sine, ...rm }), -1, true, undefined, CHARACTER_MOTION));
    flap.set(
      withRepeat(
        withSequence(
          CHARACTER_MOTION,
          withDelay(3400, withTiming(1, { duration: 110, ...rm }), CHARACTER_MOTION),
          withTiming(0, { duration: 110, ...rm }),
          withTiming(1, { duration: 110, ...rm }),
          withTiming(0, { duration: 110, ...rm }),
        ),
        -1,
        false,
        undefined,
        CHARACTER_MOTION,
      ),
    );
  }, [look, sway, flap]);

  const u = size / 40; // pixels per unit of the 40×40 art box
  // Whole pixels only: React Native on iOS/Android misreads decimals like "19.06px" in
  // transformOrigin, which flings the part far off the character.
  const origin = (p: { x: number; y: number }) => `${Math.round(p.x * u)}px ${Math.round(p.y * u)}px`;

  const faceStyle = useAnimatedStyle(() => ({ transform: [{ translateX: look.value * 2.4 * u }] }));
  const tailStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${(sway.value - 0.5) * 34 - hop.value * 12 - cheer.value * 30}deg` }],
  }));
  const leafStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${(sway.value - 0.5) * 16 + hop.value * 16 + cheer.value * 24}deg` }],
  }));
  // Celebrating: flap fast (three beats over the jump).
  const wingLift = () => {
    'worklet';
    return Math.max(flap.value, hop.value, Math.abs(Math.sin(cheer.value * Math.PI * 3)) * Math.min(1, cheer.value * 3));
  };
  const wingLeft = useAnimatedStyle(() => ({ transform: [{ rotate: `${wingLift() * 40}deg` }] }));
  const wingRight = useAnimatedStyle(() => ({ transform: [{ rotate: `${-wingLift() * 40}deg` }] }));
  const handStyle = useAnimatedStyle(() => {
    const w = wave.value;
    const showing = w > 0 && w < 1;
    return {
      opacity: showing ? 1 : 0,
      transform: [{ rotate: `${Math.sin(w * Math.PI * 6) * 24 - 6}deg` }],
    };
  });

  const layer = [StyleSheet.absoluteFill];
  return (
    <View style={{ width: size, height: size }}>
      {kind === 'kitty' && (
        <Animated.View style={[layer, { transformOrigin: origin(PIVOTS.tail) }, tailStyle]}>
          <KittyTail color={color} size={size} />
        </Animated.View>
      )}
      {kind === 'chick' && (
        <>
          <Animated.View style={[layer, { transformOrigin: origin(PIVOTS.wingLeft) }, wingLeft]}>
            <ChickWing color={color} size={size} side="left" />
          </Animated.View>
          <Animated.View style={[layer, { transformOrigin: origin(PIVOTS.wingRight) }, wingRight]}>
            <ChickWing color={color} size={size} side="right" />
          </Animated.View>
        </>
      )}
      <View style={layer}>
        <CharacterArt kind={kind} color={color} size={size} mood={mood} layer="body" />
      </View>
      {kind === 'sprout' && (
        <Animated.View style={[layer, { transformOrigin: origin(PIVOTS.leaf) }, leafStyle]}>
          <SproutLeaf size={size} />
        </Animated.View>
      )}
      <Animated.View style={[layer, faceStyle]}>
        <CharacterFace kind={kind} mood={mood} size={size} />
      </Animated.View>
      <Animated.View style={[layer, { transformOrigin: origin(PIVOTS.hand) }, handStyle]}>
        <WaveHand color={color} size={size} />
      </Animated.View>
    </View>
  );
}
