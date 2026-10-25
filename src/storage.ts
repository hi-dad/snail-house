import AsyncStorage from '@react-native-async-storage/async-storage';

import { ClockState } from './clock';
import { MAP_H, MAP_W, Tile, isWalkable } from './game/map';
import { GameState, normalize } from './game/simulation';

// Keep this key stable. Future save formats should increment schemaVersion and migrate
// through migrateAndValidate instead of switching keys and abandoning existing players.
const KEY = 'snail-house/save/v1';
const BACKUP_KEY = 'snail-house/save/v1/backup';
const CORRUPT_KEY = 'snail-house/save/v1/corrupt';
const CURRENT_SCHEMA_VERSION = 1;
const READ_ATTEMPTS = 3;
let writesBlockedForSession = false;

export interface SaveData {
  schemaVersion: number;
  onboarded: boolean;
  colorId: string | null;
  characterId: string | null;
  game: GameState | null;
  bestMs: number;
  bestTokens: number;
  soundEnabled: boolean;
  clock: ClockState | null;
}

export const EMPTY_SAVE: SaveData = {
  schemaVersion: CURRENT_SCHEMA_VERSION,
  onboarded: false,
  colorId: null,
  characterId: null,
  game: null,
  bestMs: 0,
  bestTokens: 0,
  soundEnabled: true,
  clock: null,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isTile(value: unknown): value is Tile {
  return Number.isInteger(value) && (value as number) >= 0 && (value as number) < MAP_W * MAP_H;
}

function isWalkableTile(value: unknown): value is Tile {
  return isTile(value) && isWalkable(value);
}

/**
 * Validate the fields the simulation depends on, then fill fields introduced by older
 * updates. Add future schema migrations here before increasing CURRENT_SCHEMA_VERSION.
 */
function migrateGame(value: unknown): GameState | null {
  if (!isRecord(value)) return null;
  if (
    !isFiniteNumber(value.runStartTime) ||
    !isWalkableTile(value.playerTile) ||
    !isWalkableTile(value.snailTile) ||
    !isFiniteNumber(value.snailLastStepTime) ||
    typeof value.alive !== 'boolean' ||
    !(value.deathTime === null || isFiniteNumber(value.deathTime)) ||
    typeof value.colorId !== 'string' ||
    !(value.characterId === undefined || typeof value.characterId === 'string')
  ) return null;

  const snailTrail = value.snailTrail ?? [];
  if (!Array.isArray(snailTrail) || snailTrail.length > 100 || !snailTrail.every(isWalkableTile)) return null;

  const game = normalize({ ...value, snailTrail } as unknown as GameState);
  if (
    !Number.isInteger(game.tokens) || game.tokens < 0 ||
    !(game.tokenTile === null || isWalkableTile(game.tokenTile)) ||
    !isFiniteNumber(game.tokenSpawnAt) ||
    !Number.isInteger(game.rng) || game.rng < 0 || game.rng > 0xffffffff ||
    (!game.alive && game.deathTime === null)
  ) return null;
  return game;
}

function migrateAndValidate(value: unknown): SaveData | null {
  if (!isRecord(value)) return null;
  const version = value.schemaVersion ?? 0; // Existing pre-version saves are schema 0.
  if (!Number.isInteger(version) || (version as number) < 0 || (version as number) > CURRENT_SCHEMA_VERSION) {
    return null;
  }

  const merged = { ...EMPTY_SAVE, ...value, schemaVersion: CURRENT_SCHEMA_VERSION };
  const game = merged.game === null ? null : migrateGame(merged.game);
  if (
    (merged.game !== null && game === null) ||
    typeof merged.onboarded !== 'boolean' ||
    !(merged.colorId === null || typeof merged.colorId === 'string') ||
    !(merged.characterId === null || typeof merged.characterId === 'string') ||
    !isFiniteNumber(merged.bestMs) || merged.bestMs < 0 ||
    !Number.isInteger(merged.bestTokens) || merged.bestTokens < 0 ||
    typeof merged.soundEnabled !== 'boolean' ||
    !isValidClock(merged.clock)
  ) return null;

  return { ...(merged as SaveData), game };
}

function isValidClock(value: unknown): value is ClockState | null {
  if (value === null) return true;
  return isRecord(value) &&
    isFiniteNumber(value.anchorReal) &&
    isFiniteNumber(value.anchorGame) &&
    isFiniteNumber(value.speed) &&
    value.speed > 0;
}

function parseSave(raw: string | null): SaveData | null {
  if (raw === null) return null;
  try {
    return migrateAndValidate(JSON.parse(raw));
  } catch {
    return null;
  }
}

async function readWithRetry(key: string): Promise<string | null> {
  let lastError: unknown;
  for (let attempt = 0; attempt < READ_ATTEMPTS; attempt++) {
    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

export async function loadSave(): Promise<SaveData> {
  writesBlockedForSession = false;
  try {
    const raw = await readWithRetry(KEY);
    if (raw === null) return EMPTY_SAVE;
    const primary = parseSave(raw);
    if (primary) return primary;

    const backupRaw = await readWithRetry(BACKUP_KEY);
    const backup = parseSave(backupRaw);
    if (backup) {
      await AsyncStorage.setItem(KEY, JSON.stringify(backup)).catch(() => {});
      return backup;
    }

    // Preserve the original bytes for a future repair instead of immediately destroying
    // the only copy when the app falls back to a fresh save.
    await AsyncStorage.setItem(CORRUPT_KEY, raw).catch(() => {});
    return EMPTY_SAVE;
  } catch {
    // Never let a temporary read outage replace a potentially healthy save with an empty
    // one. The next launch retries normally; this session continues without persistence.
    writesBlockedForSession = true;
    return EMPTY_SAVE;
  }
}

let writeQueue: Promise<void> = Promise.resolve();

export function writeSave(data: SaveData): Promise<void> {
  if (writesBlockedForSession) return Promise.resolve();
  const snapshot = JSON.stringify({ ...data, schemaVersion: CURRENT_SCHEMA_VERSION });
  writeQueue = writeQueue.then(async () => {
    try {
      const currentRaw = await readWithRetry(KEY);
      if (parseSave(currentRaw)) {
        await AsyncStorage.setItem(BACKUP_KEY, currentRaw!);
      } else if (currentRaw !== null) {
        await AsyncStorage.setItem(CORRUPT_KEY, currentRaw);
      }
      await AsyncStorage.setItem(KEY, snapshot);
    } catch {
      // Keep the in-memory game running. The next state change will queue another attempt.
    }
  });
  return writeQueue;
}
