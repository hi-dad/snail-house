import AsyncStorage from '@react-native-async-storage/async-storage';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { loadSave, writeSave, EMPTY_SAVE, SaveData } from '../storage';

jest.mock('@react-native-async-storage/async-storage', () => {
  // Jest requires this module to be loaded inside the hoisted mock factory.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@react-native-async-storage/async-storage/jest/async-storage-mock');
});

const KEY = 'snail-house/save/v1';
const BACKUP_KEY = 'snail-house/save/v1/backup';
const CORRUPT_KEY = 'snail-house/save/v1/corrupt';

function save(overrides: Partial<SaveData> = {}): SaveData {
  return { ...EMPTY_SAVE, onboarded: true, bestTokens: 4, ...overrides };
}

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('save persistence', () => {
  it('migrates saves created before schemaVersion existed', async () => {
    const legacy = save();
    const { schemaVersion: _removed, ...withoutVersion } = legacy;
    await AsyncStorage.setItem(KEY, JSON.stringify(withoutVersion));

    const loaded = await loadSave();

    expect(loaded.schemaVersion).toBe(1);
    expect(loaded.bestTokens).toBe(4);
  });

  it('recovers a corrupted primary save from the last known-good backup', async () => {
    const backup = save({ bestTokens: 9 });
    await AsyncStorage.setItem(KEY, '{broken json');
    await AsyncStorage.setItem(BACKUP_KEY, JSON.stringify(backup));

    const loaded = await loadSave();

    expect(loaded.bestTokens).toBe(9);
    expect(JSON.parse((await AsyncStorage.getItem(KEY))!).bestTokens).toBe(9);
  });

  it('preserves unrecoverable raw data before starting fresh', async () => {
    await AsyncStorage.setItem(KEY, '{broken json');

    const loaded = await loadSave();

    expect(loaded).toEqual(EMPTY_SAVE);
    expect(await AsyncStorage.getItem(CORRUPT_KEY)).toBe('{broken json');
  });

  it('keeps the previous valid save as a backup on each ordered write', async () => {
    await writeSave(save({ bestTokens: 1 }));
    await writeSave(save({ bestTokens: 2 }));

    expect(JSON.parse((await AsyncStorage.getItem(KEY))!).bestTokens).toBe(2);
    expect(JSON.parse((await AsyncStorage.getItem(BACKUP_KEY))!).bestTokens).toBe(1);
  });

  it('does not overwrite anything during a session whose storage could not be read', async () => {
    const getItem = jest.spyOn(AsyncStorage, 'getItem').mockRejectedValue(new Error('storage unavailable'));
    expect(await loadSave()).toEqual(EMPTY_SAVE);
    getItem.mockRestore();

    await writeSave(save({ bestTokens: 99 }));

    expect(await AsyncStorage.getItem(KEY)).toBeFalsy();
  });
});
