import { SNAIL_STEP_MS, TOKEN_RESPAWN_MS } from './constants';
import { START_PLAYER, START_SNAIL, Tile, WALKABLE_TILES, isWalkable } from './map';
import { bfs, shortestPath, stepToward } from './pathfinding';

const TRAIL_LENGTH = 5;
/** New strawberries appear at least this far (in tiles) from the player... */
const TOKEN_MIN_FROM_PLAYER = 5;
/** ...and not right under the snail's nose. */
const TOKEN_MIN_FROM_SNAIL = 3;

export interface GameState {
  runStartTime: number;
  playerTile: Tile;
  snailTile: Tile;
  snailLastStepTime: number;
  /** The last few tiles the snail left behind, oldest first (for the slime trail). */
  snailTrail: Tile[];
  alive: boolean;
  deathTime: number | null;
  colorId: string;
  /** Which character the player picked (older saves may not have one). */
  characterId?: string;
  /** Strawberries collected this run. */
  tokens: number;
  /** Where the current strawberry is, or null while waiting for the next one. */
  tokenTile: Tile | null;
  /** When the next strawberry appears (only meaningful while tokenTile is null). */
  tokenSpawnAt: number;
  /** Seeded random state, so strawberry spots are deterministic. */
  rng: number;
}

export function newRun(now: number, colorId: string, characterId = 'blob'): GameState {
  return {
    runStartTime: now,
    playerTile: START_PLAYER,
    snailTile: START_SNAIL,
    snailLastStepTime: now,
    snailTrail: [],
    alive: true,
    deathTime: null,
    colorId,
    characterId,
    tokens: 0,
    tokenTile: null,
    tokenSpawnAt: now, // the first strawberry appears right away
    rng: now >>> 0 || 1,
  };
}

/** Fill in fields that saves from older versions don't have. */
export function normalize(state: GameState): GameState {
  return {
    ...state,
    tokens: state.tokens ?? 0,
    tokenTile: state.tokenTile ?? null,
    tokenSpawnAt: state.tokenSpawnAt ?? state.snailLastStepTime,
    rng: state.rng || (state.runStartTime >>> 0) || 1,
  };
}

/** mulberry32: a tiny seeded PRNG. Returns [value in 0..1, next state]. */
function nextRandom(seed: number): [number, number] {
  const next = (seed + 0x6d2b79f5) >>> 0;
  let t = next;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, next];
}

function spawnToken(s: GameState): GameState {
  const fromPlayer = bfs(s.playerTile);
  const fromSnail = bfs(s.snailTile);
  let spots = WALKABLE_TILES.filter(
    (t) => fromPlayer[t] >= TOKEN_MIN_FROM_PLAYER && fromSnail[t] >= TOKEN_MIN_FROM_SNAIL,
  );
  if (spots.length === 0) spots = WALKABLE_TILES.filter((t) => t !== s.playerTile && t !== s.snailTile);
  const [r, rng] = nextRandom(s.rng);
  return { ...s, tokenTile: spots[Math.floor(r * spots.length)], rng };
}

/**
 * Bring the world up to `now`, processing every event in time order: strawberries
 * appearing, and each snail step toward the player's (unchanging) tile. If the snail
 * crawls over a strawberry it eats it. Pure and deterministic, so calling it once after
 * a long gap or many times in between gives the same result.
 */
export function advance(state: GameState, now: number): GameState {
  if (!state.alive) return state;
  let s = state;
  let distToPlayer: Int32Array | null = null;
  for (;;) {
    const nextStep = s.snailLastStepTime + SNAIL_STEP_MS;
    const nextSpawn = s.tokenTile === null ? s.tokenSpawnAt : Infinity;
    if (Math.min(nextStep, nextSpawn) > now) return s;

    if (nextSpawn <= nextStep) {
      s = spawnToken(s);
      continue;
    }

    distToPlayer ??= bfs(s.playerTile);
    const snailTrail = [...s.snailTrail, s.snailTile].slice(-TRAIL_LENGTH);
    const snailTile = stepToward(s.snailTile, distToPlayer);
    s = { ...s, snailTile, snailLastStepTime: nextStep, snailTrail };
    if (snailTile === s.playerTile) return { ...s, alive: false, deathTime: nextStep };
    if (snailTile === s.tokenTile) s = { ...s, tokenTile: null, tokenSpawnAt: nextStep + TOKEN_RESPAWN_MS };
  }
}

/** When the snail will reach the player if the player stays put. */
export function catchTime(state: GameState): number {
  if (!state.alive) return state.deathTime ?? state.snailLastStepTime;
  const d = bfs(state.playerTile)[state.snailTile];
  return state.snailLastStepTime + d * SNAIL_STEP_MS;
}

/** Time left before the snail arrives, assuming state is already advanced to `now`. */
export function safetyMs(state: GameState, now: number): number {
  return Math.max(0, catchTime(state) - now);
}

/** How long this run has lasted (frozen at death time once caught). */
export function survivedMs(state: GameState, now: number): number {
  return (state.alive ? now : state.deathTime!) - state.runStartTime;
}

/** The tile the snail is currently gliding toward (for smooth rendering). */
export function snailHeading(state: GameState): Tile {
  return stepToward(state.snailTile, bfs(state.playerTile));
}

/**
 * Move the player to `target` right now, picking up the strawberry if the path crosses it.
 * Returns the walked path, or null when the target can't be reached without passing
 * through the snail.
 */
export function movePlayer(
  state: GameState,
  target: Tile,
  now: number,
): { state: GameState; path: Tile[]; collected: boolean } | null {
  const current = advance(state, now);
  if (!current.alive || !isWalkable(target)) return null;
  const path = shortestPath(current.playerTile, target, current.snailTile);
  if (!path || path.length === 0) return null;
  const moved = { ...current, playerTile: target };
  const collected = current.tokenTile !== null && path.includes(current.tokenTile);
  if (!collected) return { state: moved, path, collected };
  return {
    state: { ...moved, tokens: current.tokens + 1, tokenTile: null, tokenSpawnAt: now + TOKEN_RESPAWN_MS },
    path,
    collected,
  };
}
