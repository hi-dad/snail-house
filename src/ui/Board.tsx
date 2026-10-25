import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AppState, GestureResponderEvent, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing, ReduceMotion, ZoomIn, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Path, Polyline } from 'react-native-svg';

import { gameNow } from '../clock';
import { PLAYER_TILES_PER_SECOND, SNAIL_STEP_MS } from '../game/constants';
import { MAP_H, MAP_W, Tile, isWalkable, tileOf, wallBetween, xOf, yOf } from '../game/map';
import { shortestPath } from '../game/pathfinding';
import { GameState, movePlayer, snailHeading } from '../game/simulation';
import { playBlocked } from '../sound';
import { SnailArt, StrawberryArt } from './characters';
import { CHARACTER_MOTION, PlayerCharacter } from './PlayerCharacter';
import { U, VIEW, pxToTile, tileToPx } from './geometry';
import { HouseMap } from './HouseMap';
import { FONT, blobColor } from './theme';

const STEP_MS = 1000 / PLAYER_TILES_PER_SECOND;
// The simulation keeps the snail on its last completed tile until the next real step. The
// sprite only leans partway toward the likely next tile so a player move can't make it whip
// nearly two tiles in the opposite direction when its route changes.
const SNAIL_VISUAL_LEAD = 0.32;
// Movement is how the game shows what's happening (where you walked, where the snail is),
// so it always animates, even with the phone's Reduce Motion setting on. Purely ambient
// motion (breathing, wiggling, bobbing) still respects that setting.
const NEVER = ReduceMotion.Never;
const always = { reduceMotion: NEVER };
const linear = { easing: Easing.linear, ...always };

/** True while a straight ghost flight is inside furniture or crossing a closed wall. */
function ghostInsideObstacle(x: number, y: number): boolean {
  const cellX = Math.max(0, Math.min(MAP_W - 1, Math.round(x)));
  const cellY = Math.max(0, Math.min(MAP_H - 1, Math.round(y)));
  if (!isWalkable(tileOf(cellX, cellY))) return true;

  // Player coordinates are tile-centre indices, so walls sit at half values (3.5, 7.5…).
  const wallBand = 0.16;
  const worldX = x + 0.5;
  const verticalBoundary = Math.round(worldX);
  if (
    verticalBoundary > 0 && verticalBoundary < MAP_W &&
    Math.abs(worldX - verticalBoundary) < wallBand &&
    wallBetween(verticalBoundary - 1, cellY, 1, 0)
  ) return true;

  const worldY = y + 0.5;
  const horizontalBoundary = Math.round(worldY);
  return (
    horizontalBoundary > 0 && horizontalBoundary < MAP_H &&
    Math.abs(worldY - horizontalBoundary) < wallBand &&
    wallBetween(cellX, horizontalBoundary - 1, 0, 1)
  );
}

interface Props {
  width: number;
  game: GameState;
  now: number;
  /** `pickupInMs` is set when this move collects a strawberry: how long until the walk reaches it. */
  onMove: (next: GameState, pickupInMs?: number) => void;
}

export function Board({ width, game, now, onMove }: Props) {
  const height = (width * VIEW.h) / VIEW.w;
  const tilePx = tileToPx(0, 0, width).size;
  const color = blobColor(game.colorId);

  // --- player -------------------------------------------------------------
  const px = useSharedValue(xOf(game.playerTile));
  const py = useSharedValue(yOf(game.playerTile));
  const hop = useSharedValue(0);
  const breathe = useSharedValue(0);
  const shake = useSharedValue(0);
  const sx = useSharedValue(xOf(game.snailTile));
  const sy = useSharedValue(yOf(game.snailTile));
  const lastSnailHeading = useRef(game.snailTile);
  const walk = useRef<{ tiles: Tile[]; t0: number }>({ tiles: [game.playerTile], t0: 0 });
  const wave = useSharedValue(0);
  const cheer = useSharedValue(0);
  const [excited, setExcited] = useState(false);
  const float = useSharedValue(0);
  const ghostOpacity = useSharedValue(1);
  const isGhost = game.characterId === 'ghostie';

  useEffect(() => {
    breathe.set(withRepeat(withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.sin) }), -1, true));
    float.set(
      withRepeat(
        withTiming(1, { duration: 1700, easing: Easing.inOut(Easing.sin), reduceMotion: CHARACTER_MOTION }),
        -1,
        true,
        undefined,
        CHARACTER_MOTION,
      ),
    );
  }, [breathe, float]);

  // Say hello whenever the game comes on screen: two happy hops and a wave.
  useEffect(() => {
    const greet = () => {
      const up = { duration: 170, easing: Easing.out(Easing.quad), ...always };
      const down = { duration: 170, easing: Easing.in(Easing.quad), ...always };
      hop.set(withSequence(NEVER, withTiming(1, up), withTiming(0, down), withTiming(1, up), withTiming(0, down)));
      wave.set(
        withSequence(
          NEVER,
          withTiming(0, { duration: 0, ...always }),
          withDelay(250, withTiming(1, { duration: 1500, easing: Easing.linear, ...always }), NEVER),
        ),
      );
    };
    const first = setTimeout(greet, 500);
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') greet();
    });
    return () => {
      clearTimeout(first);
      sub.remove();
    };
  }, [hop, wave]);

  // A fresh run (or loading a save) teleports the player instead of walking.
  const lastRun = useRef(game.runStartTime);
  useEffect(() => {
    if (lastRun.current === game.runStartTime) return;
    lastRun.current = game.runStartTime;
    walk.current = { tiles: [game.playerTile], t0: 0 };
    px.set(xOf(game.playerTile));
    py.set(yOf(game.playerTile));
    sx.set(xOf(game.snailTile));
    sy.set(yOf(game.snailTile));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.runStartTime]);

  /** The tile the character is currently walking onto (or standing on). */
  function visualNextTile(): { tile: Tile; remaining: number } {
    const { tiles, t0 } = walk.current;
    const elapsed = Date.now() - t0;
    if (elapsed < 0) return { tile: tiles[0], remaining: -elapsed };
    const k = Math.floor(elapsed / STEP_MS);
    if (k >= tiles.length - 1) return { tile: tiles[tiles.length - 1], remaining: 0 };
    return { tile: tiles[k + 1], remaining: STEP_MS - (elapsed - k * STEP_MS) };
  }

  function animateWalk(from: { tile: Tile; remaining: number }, path: Tile[]) {
    const tiles = [from.tile, ...path];
    const xs = [withTiming(xOf(from.tile), { duration: from.remaining, ...linear })];
    const ys = [withTiming(yOf(from.tile), { duration: from.remaining, ...linear })];
    for (const t of path) {
      xs.push(withTiming(xOf(t), { duration: STEP_MS, ...linear }));
      ys.push(withTiming(yOf(t), { duration: STEP_MS, ...linear }));
    }
    px.set(withSequence(NEVER, ...xs));
    py.set(withSequence(NEVER, ...ys));
    walk.current = { tiles, t0: Date.now() + from.remaining };
    if (isGhost) return; // Ghostie floats along instead of hopping
    const hops = Math.max(1, path.length + (from.remaining > 0 ? 1 : 0));
    hop.set(withRepeat(
      withSequence(
        NEVER,
        withTiming(1, { duration: STEP_MS / 2, easing: Easing.out(Easing.quad), ...always }),
        withTiming(0, { duration: STEP_MS / 2, easing: Easing.in(Easing.quad), ...always }),
      ),
      hops,
      false,
      undefined,
      NEVER,
    ));
  }

  /** Fly Ghostie along one geometric line, fading whenever that line crosses an obstacle. */
  function animateGhostStraight(target: Tile) {
    const fromX = px.get();
    const fromY = py.get();
    const toX = xOf(target);
    const toY = yOf(target);
    const dx = toX - fromX;
    const dy = toY - fromY;
    const distance = Math.hypot(dx, dy);
    const samples = Math.max(1, Math.ceil(distance * 8));
    const duration = Math.max(STEP_MS, distance * STEP_MS);
    const slice = duration / samples;
    const points = Array.from({ length: samples }, (_, index) => {
      const i = index + 1;
      const x = fromX + (dx * i) / samples;
      const y = fromY + (dy * i) / samples;
      return { x, y, blocked: ghostInsideObstacle(x, y) };
    });
    const xs = [];
    const ys = [];
    const fades = [];
    const fadeBeforeMs = 100;
    const fadeAfterMs = 550;
    for (let index = 0; index < points.length; index++) {
      const { x, y, blocked } = points[index];
      xs.push(withTiming(x, { duration: slice, ...linear }));
      ys.push(withTiming(y, { duration: slice, ...linear }));
      let opacity = blocked ? 0.18 : 1;
      if (!blocked) {
        const previous = points.slice(0, index).findLastIndex((point) => point.blocked);
        if (previous >= 0) {
          const elapsed = (index - previous) * slice;
          if (elapsed < fadeAfterMs) opacity = Math.min(opacity, 0.18 + 0.82 * (elapsed / fadeAfterMs));
        }
        const next = points.slice(index + 1).findIndex((point) => point.blocked);
        if (next >= 0) {
          const until = (next + 1) * slice;
          if (until < fadeBeforeMs) opacity = Math.min(opacity, 0.18 + 0.82 * (until / fadeBeforeMs));
        }
      }
      fades.push(withTiming(opacity, { duration: slice, ...linear }));
    }
    px.set(withSequence(NEVER, ...xs));
    py.set(withSequence(NEVER, ...ys));
    // Even when the route ends immediately after an obstacle, always become fully solid
    // again within half a second of stopping.
    ghostOpacity.set(withSequence(
      NEVER,
      ...fades,
      withTiming(1, { duration: 450, easing: Easing.out(Easing.quad), ...always }),
    ));
    walk.current = { tiles: [target], t0: 0 };
    return { fromX, fromY, toX, toY, duration };
  }

  // pageX/pageY minus the board's own position works the same on iOS, Android and web.
  const boardRef = useRef<View>(null);
  function onPress(e: GestureResponderEvent) {
    const { pageX, pageY } = e.nativeEvent;
    boardRef.current?.measure((_x, _y, _w, _h, left, top) => handleTap(pageX - left, pageY - top));
  }

  function handleTap(localX: number, localY: number) {
    if (!game.alive) return;
    const hit = pxToTile(localX, localY, width);
    const target = hit ? tileOf(hit.x, hit.y) : -1;
    const result = hit ? movePlayer(game, target, gameNow()) : null;
    if (!result) {
      if (hit && target === game.playerTile) return;
      playBlocked();
      shake.set(withSequence(
        NEVER,
        withTiming(-6, { duration: 50, ...always }),
        withTiming(6, { duration: 70, ...always }),
        withTiming(-4, { duration: 70, ...always }),
        withTiming(0, { duration: 60, ...always }),
      ));
      return;
    }
    const token = result.collected ? game.tokenTile! : null;
    if (isGhost) {
      const flight = animateGhostStraight(target);
      if (token !== null) {
        const dx = flight.toX - flight.fromX;
        const dy = flight.toY - flight.fromY;
        const lengthSq = dx * dx + dy * dy;
        const fraction = lengthSq === 0 ? 1 : Math.max(0, Math.min(1,
          ((xOf(token) - flight.fromX) * dx + (yOf(token) - flight.fromY) * dy) / lengthSq,
        ));
        const pickupInMs = flight.duration * fraction;
        const id = ++pickupSeq.current;
        setPickup({ tile: token, delay: pickupInMs, id });
        setTimeout(() => setPickup((p) => (p?.id === id ? null : p)), pickupInMs + 900);
        setTimeout(celebrate, pickupInMs);
        onMove(result.state, pickupInMs);
      } else {
        onMove(result.state);
      }
      return;
    }
    // Walk from wherever the character is right now, still avoiding the snail (and
    // detouring over the strawberry if this move collects it).
    const snail = result.state.snailTile;
    let from = visualNextTile();
    if (from.tile === snail) from = { tile: game.playerTile, remaining: 0 };
    const leg = (a: Tile, b: Tile) => (a === b ? [] : shortestPath(a, b, snail));
    const toToken = token !== null ? leg(from.tile, token) : [];
    const rest = leg(token ?? from.tile, target);
    const path = toToken && rest ? [...toToken, ...rest] : result.path;
    animateWalk(from, path);

    if (token !== null) {
      const pickupInMs = from.remaining + (toToken?.length ?? 0) * STEP_MS;
      const id = ++pickupSeq.current;
      setPickup({ tile: token, delay: pickupInMs, id });
      setTimeout(() => setPickup((p) => (p?.id === id ? null : p)), pickupInMs + 900);
      setTimeout(celebrate, pickupInMs);
      onMove(result.state, pickupInMs);
    } else {
      onMove(result.state);
    }
  }

  /** Got a strawberry! A big jump, an excited face and a wave. */
  function celebrate() {
    cheer.set(
      withSequence(
        NEVER,
        withTiming(1, { duration: 230, easing: Easing.out(Easing.quad), ...always }),
        withTiming(0, { duration: 330, easing: Easing.in(Easing.quad), ...always }),
      ),
    );
    wave.set(withSequence(NEVER, withTiming(0, { duration: 0, ...always }), withTiming(1, { duration: 900, easing: Easing.linear, ...always })));
    setExcited(true);
    setTimeout(() => setExcited(false), 1200);
  }

  // A collected strawberry stays visible until the character actually reaches it.
  const [pickup, setPickup] = useState<{ tile: Tile; delay: number; id: number } | null>(null);
  const pickupSeq = useRef(0);

  const playerStyle = useAnimatedStyle(() => {
    const s = tilePx / U;
    const size = tilePx * 1.35;
    return {
      width: size,
      height: size,
      opacity: isGhost ? ghostOpacity.value : 1,
      zIndex: Math.round(py.value * 10) + 1,
      transform: [
        { translateX: (px.value * U - VIEW.x) * s + tilePx / 2 - size / 2 },
        {
          translateY:
            (py.value * U - VIEW.y) * s +
            tilePx -
            size * 0.9 -
            // Ghostie hovers and bobs gently; everyone else hops.
            (isGhost ? (0.12 + float.value * 0.1 + hop.value * 0.12) * tilePx : hop.value * tilePx * 0.22) -
            cheer.value * tilePx * 0.55, // strawberry celebration jump
        },
        { scaleX: 1 - (isGhost ? 0 : hop.value * 0.06 + cheer.value * 0.08) + breathe.value * 0.015 },
        { scaleY: 1 + (isGhost ? 0 : hop.value * 0.08 + cheer.value * 0.12) - breathe.value * 0.03 },
      ],
    };
  });

  // --- snail ----------------------------------------------------------------
  const wiggle = useSharedValue(0);

  useEffect(() => {
    wiggle.set(withRepeat(withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [wiggle]);

  const heading = useMemo(
    () => (game.alive ? snailHeading(game) : game.snailTile),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [game.snailTile, game.playerTile, game.alive],
  );

  // Face the way it's crawling; when moving vertically, face the player.
  const headingDx = xOf(heading) - xOf(game.snailTile);
  const faceLeft = headingDx !== 0 ? headingDx < 0 : xOf(game.playerTile) < xOf(game.snailTile);

  useEffect(() => {
    const frac = Math.min(1, Math.max(0, (now - game.snailLastStepTime) / SNAIL_STEP_MS));
    const visualProgress = frac * SNAIL_VISUAL_LEAD;
    const tx = xOf(game.snailTile) + (xOf(heading) - xOf(game.snailTile)) * visualProgress;
    const ty = yOf(game.snailTile) + (yOf(heading) - yOf(game.snailTile)) * visualProgress;
    const jump = Math.hypot(tx - sx.get(), ty - sy.get());
    const changedDirection = lastSnailHeading.current !== heading;
    lastSnailHeading.current = heading;
    // Route changes ease slowly; ordinary timer updates remain almost imperceptible.
    const duration = changedDirection ? 1400 : jump > 0.25 ? 1000 : 300;
    sx.set(withTiming(tx, { duration, ...linear }));
    sy.set(withTiming(ty, { duration, ...linear }));
  }, [now, game.snailTile, game.snailLastStepTime, heading, sx, sy]);

  const snailStyle = useAnimatedStyle(() => {
    const s = tilePx / U;
    const h = tilePx * 1.25;
    const w = h * 1.2;
    return {
      width: w,
      height: h,
      zIndex: Math.round(sy.value * 10) + 2,
      transform: [
        { translateX: (sx.value * U - VIEW.x) * s + tilePx / 2 - w / 2 },
        { translateY: (sy.value * U - VIEW.y) * s + tilePx - h * 0.88 },
        { scaleX: (faceLeft ? -1 : 1) * (1 + wiggle.value * 0.05) },
        { scaleY: 1 - wiggle.value * 0.03 },
      ],
    };
  });

  const boardStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));

  // --- slime trail ------------------------------------------------------------
  const trailPts = [...game.snailTrail, game.snailTile].map((t) => ({
    x: (xOf(t) + 0.5) * U,
    y: (yOf(t) + 0.75) * U,
  }));

  return (
    <Animated.View style={[{ width, height }, boardStyle]}>
      <Pressable onPress={onPress} style={StyleSheet.absoluteFill}>
        <View ref={boardRef} pointerEvents="none">
          <HouseMap width={width} />
          <Svg
            style={StyleSheet.absoluteFill}
            width={width}
            height={height}
            viewBox={`${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`}
          >
            {trailPts.length > 1 && (
              <Polyline
                points={trailPts.map((p) => `${p.x},${p.y}`).join(' ')}
                fill="none"
                stroke="#FFFFFF"
                strokeOpacity={0.55}
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
            {trailPts.slice(0, -1).map((p, i) => (
              <Sparkle key={i} x={p.x + ((i * 7) % 5) - 2} y={p.y - 1.5} o={0.35 + (0.5 * (i + 1)) / trailPts.length} />
            ))}
          </Svg>
        </View>
      </Pressable>
      {game.tokenTile !== null && game.alive && (
        <Token key={`t${game.tokenTile}`} tile={game.tokenTile} tilePx={tilePx} width={width} />
      )}
      {pickup && <Token key={`p${pickup.id}`} tile={pickup.tile} tilePx={tilePx} width={width} pickupIn={pickup.delay} />}
      <Animated.View pointerEvents="none" style={[styles.sprite, snailStyle]}>
        <SnailArt size={tilePx * 1.25} />
      </Animated.View>
      <Animated.View pointerEvents="none" style={[styles.sprite, playerStyle]}>
        <PlayerCharacter
          kind={game.characterId}
          color={color}
          size={tilePx * 1.35}
          mood={!game.alive ? 'hugged' : excited ? 'excited' : 'happy'}
          hop={hop}
          wave={wave}
          cheer={cheer}
        />
      </Animated.View>
    </Animated.View>
  );
}

/** The strawberry on the map. With `pickupIn`, it pops and floats away after that delay. */
function Token({ tile, tilePx, width, pickupIn }: { tile: Tile; tilePx: number; width: number; pickupIn?: number }) {
  const bob = useSharedValue(0);
  const pop = useSharedValue(0);
  useEffect(() => {
    bob.set(withRepeat(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.sin) }), -1, true));
    if (pickupIn !== undefined) {
      pop.set(withDelay(pickupIn, withTiming(1, { duration: 650, easing: Easing.out(Easing.quad), ...always }), NEVER));
    }
  }, [bob, pop, pickupIn]);

  const size = tilePx * 0.9;
  const { x, y } = tileToPx(xOf(tile), yOf(tile), width);
  const style = useAnimatedStyle(() => ({
    opacity: 1 - pop.value,
    transform: [
      { translateY: -bob.value * tilePx * 0.08 - pop.value * tilePx * 0.9 },
      { scale: 1 + pop.value * 0.6 },
    ],
  }));
  const plusStyle = useAnimatedStyle(() => ({
    opacity: pop.value > 0 ? 1 - pop.value : 0,
    transform: [{ translateY: -pop.value * tilePx * 1.3 }],
  }));
  return (
    <View
      pointerEvents="none"
      style={[styles.sprite, { width: size, height: size, zIndex: yOf(tile) * 10, left: x + (tilePx - size) / 2, top: y + tilePx - size * 0.95 }]}
    >
      <Animated.View entering={pickupIn === undefined ? ZoomIn.springify() : undefined}>
        <Animated.View style={style}>
          <StrawberryArt size={size} />
        </Animated.View>
      </Animated.View>
      {pickupIn !== undefined && (
        <Animated.Text style={[styles.plus, { fontSize: tilePx * 0.55 }, plusStyle]}>+1</Animated.Text>
      )}
    </View>
  );
}

function Sparkle({ x, y, o }: { x: number; y: number; o: number }) {
  return (
    <>
      <Path
        d={`M${x} ${y - 1.6} Q${x + 0.3} ${y - 0.3} ${x + 1.6} ${y} Q${x + 0.3} ${y + 0.3} ${x} ${y + 1.6} Q${x - 0.3} ${y + 0.3} ${x - 1.6} ${y} Q${x - 0.3} ${y - 0.3} ${x} ${y - 1.6} Z`}
        fill="#FFFFFF"
        opacity={o}
      />
      <Circle cx={x + 2.4} cy={y + 1.6} r={0.5} fill="#FFF3B0" opacity={o} />
    </>
  );
}

const styles = StyleSheet.create({
  sprite: { position: 'absolute', left: 0, top: 0 },
  plus: {
    position: 'absolute',
    alignSelf: 'center',
    top: 0,
    fontFamily: FONT.heavy,
    color: '#E4606A',
    textShadowColor: '#FFFFFF',
    textShadowRadius: 3,
  },
});
