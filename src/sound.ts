import { AudioPlayer, createAudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';

const sources = {
  pop: require('../assets/sounds/pop.wav'),
  bonk: require('../assets/sounds/bonk.wav'),
  chime: require('../assets/sounds/chime.wav'),
};

type SoundName = keyof typeof sources;
const PLAYER_POOL_SIZE = 3;
const playerPools: Partial<Record<SoundName, AudioPlayer[]>> = {};
const nextPlayer: Partial<Record<SoundName, number>> = {};
let soundEnabled = true;

export function setSoundEnabled(enabled: boolean) {
  soundEnabled = enabled;
}

function play(name: SoundName) {
  if (!soundEnabled) return;
  try {
    const pool = (playerPools[name] ??= []);
    // Short effects can overlap when the player taps again quickly. Rotating through a
    // small pool prevents iOS from dropping the new sound while the last one is active.
    while (pool.length < PLAYER_POOL_SIZE) pool.push(createAudioPlayer(sources[name]));
    const index = nextPlayer[name] ?? 0;
    const player = pool[index];
    nextPlayer[name] = (index + 1) % PLAYER_POOL_SIZE;
    player.seekTo(0);
    player.play();
  } catch {
    // Sound is optional.
  }
}

/** A successful move, whether it increases or decreases the safety timer. */
export function playMove() {
  play('pop');
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

/** A tap that can't be walked to. */
export function playBlocked() {
  play('bonk');
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
}

/** Picked up a strawberry. */
export function playCollect() {
  play('chime');
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
}
