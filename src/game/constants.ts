import { computeDiameter } from './pathfinding';

export const HOUR_MS = 60 * 60 * 1000;
export const DAY_MS = 24 * HOUR_MS;

export const MAX_LEAD_HOURS = 40;
export const MAX_LEAD_MS = MAX_LEAD_HOURS * HOUR_MS;

const DIAMETER_INFO = computeDiameter();

/** Longest shortest path on the map, in tiles. */
export const MAP_DIAMETER = DIAMETER_INFO.diameter;

/** The two tiles that are farthest apart. */
export const DIAMETER_ENDPOINTS = { a: DIAMETER_INFO.a, b: DIAMETER_INFO.b } as const;

/** One snail step. Chosen so the biggest possible lead is exactly MAX_LEAD_HOURS. */
export const SNAIL_STEP_MS = MAX_LEAD_MS / MAP_DIAMETER;

/**
 * After a strawberry is picked up (or eaten by the snail), the next one appears this much
 * later. Checking in more often than once a day is how you collect more.
 */
export const TOKEN_RESPAWN_MS = 3 * HOUR_MS;

/** Visual walk speed of the player. Game time does not pass while walking. */
export const PLAYER_TILES_PER_SECOND = 8;

// Notification thresholds (time before catch).
export const WARNINGS = [
  { beforeMs: 12 * HOUR_MS, body: 'The snail is getting closer… 🐌' },
  { beforeMs: 3 * HOUR_MS, body: 'The snail is in the next room!' },
  { beforeMs: 1 * HOUR_MS, body: "It's RIGHT behind you." },
] as const;
