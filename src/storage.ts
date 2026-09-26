import AsyncStorage from '@react-native-async-storage/async-storage';

import { ClockState } from './clock';
import { GameState } from './game/simulation';

const KEY = 'snail-house/save/v1';

export interface SaveData {
  onboarded: boolean;
  colorId: string | null;
  characterId: string | null;
  game: GameState | null;
  bestMs: number;
  bestTokens: number;
  clock: ClockState | null;
}

export const EMPTY_SAVE: SaveData = { onboarded: false, colorId: null, characterId: null, game: null, bestMs: 0, bestTokens: 0, clock: null };

export async function loadSave(): Promise<SaveData> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? { ...EMPTY_SAVE, ...JSON.parse(raw) } : EMPTY_SAVE;
  } catch {
    return EMPTY_SAVE;
  }
}

export async function writeSave(data: SaveData): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // Nothing sensible to do; the next save will try again.
  }
}
