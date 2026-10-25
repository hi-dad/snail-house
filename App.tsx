import {
  Baloo2_500Medium, Baloo2_600SemiBold, Baloo2_700Bold, Baloo2_800ExtraBold, useFonts,
} from '@expo-google-fonts/baloo-2';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { gameNow, getClock, setClock } from './src/clock';
import { GameState, advance, newRun, normalize, survivedMs } from './src/game/simulation';
import { ensureNotificationPermission, rescheduleWarnings } from './src/notifications';
import { setSoundEnabled } from './src/sound';
import { EMPTY_SAVE, SaveData, loadSave, writeSave } from './src/storage';
import { DeathScreen } from './src/ui/DeathScreen';
import { GameScreen } from './src/ui/GameScreen';
import { CharacterPicker, Onboarding } from './src/ui/Onboarding';
import { C } from './src/ui/theme';

/** Record personal bests the moment a run ends. */
function withBest(save: SaveData, game: GameState): SaveData {
  if (!(save.game?.alive && !game.alive)) return { ...save, game };
  return {
    ...save,
    game,
    bestMs: Math.max(save.bestMs, survivedMs(game, 0)),
    bestTokens: Math.max(save.bestTokens, game.tokens),
  };
}

export default function App() {
  const [fontsLoaded] = useFonts({ Baloo2_500Medium, Baloo2_600SemiBold, Baloo2_700Bold, Baloo2_800ExtraBold });
  const [save, setSave] = useState<SaveData | null>(null);

  // Load, then catch the snail up on everything it did while the app was closed.
  useEffect(() => {
    loadSave().then((loaded) => {
      setClock(loaded.clock);
      setSoundEnabled(loaded.soundEnabled);
      let next = loaded;
      if (loaded.game) {
        loaded.game = normalize(loaded.game);
        next = withBest(loaded, advance(loaded.game, gameNow()));
        rescheduleWarnings(next.game);
      }
      setSave(next);
    });
  }, []);

  useEffect(() => {
    if (save) writeSave({ ...save, clock: getClock() });
  }, [save]);

  const onGame = useCallback((game: GameState, opts?: { moved?: boolean }) => {
    setSave((s) => (s ? withBest(s, game) : s));
    if (opts?.moved || !game.alive) rescheduleWarnings(game);
  }, []);

  const onAppearanceChange = useCallback((characterId: string, colorId: string) => {
    setSave((s) => {
      if (!s?.game) return s;
      return { ...s, characterId, colorId, game: { ...s.game, characterId, colorId } };
    });
  }, []);

  const onSoundEnabledChange = useCallback((enabled: boolean) => {
    setSoundEnabled(enabled);
    setSave((s) => (s ? { ...s, soundEnabled: enabled } : s));
  }, []);

  const startRun = useCallback((colorId: string, characterId?: string) => {
    const game = newRun(gameNow(), colorId, characterId);
    setSave((s) => ({ ...(s ?? EMPTY_SAVE), onboarded: true, colorId, characterId: game.characterId ?? null, game }));
    ensureNotificationPermission().then(() => rescheduleWarnings(game));
  }, []);

  let screen: React.ReactNode = null;
  if (!fontsLoaded || !save) {
    screen = <View style={{ flex: 1, backgroundColor: C.paper }} />;
  } else if (!save.onboarded) {
    screen = <Onboarding onDone={() => setSave({ ...save, onboarded: true })} />;
  } else if (!save.game) {
    screen = (
      <CharacterPicker
        initialCharacterId={save.characterId}
        initialColorId={save.colorId}
        onPick={(characterId, colorId) => startRun(colorId, characterId)}
      />
    );
  } else {
    const game = save.game;
    screen = (
      <View style={{ flex: 1 }}>
        <GameScreen
          game={game}
          onGame={onGame}
          onAppearanceChange={onAppearanceChange}
          soundEnabled={save.soundEnabled}
          onSoundEnabledChange={onSoundEnabledChange}
        />
        {!game.alive && (
          <DeathScreen
            game={game}
            bestMs={save.bestMs}
            bestTokens={save.bestTokens}
            onTryAgain={() => startRun(game.colorId, game.characterId)}
            onChangeCharacter={() =>
              setSave({ ...save, game: null, colorId: game.colorId, characterId: game.characterId ?? null })
            }
          />
        )}
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {screen}
    </SafeAreaProvider>
  );
}
