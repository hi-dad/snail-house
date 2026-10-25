import { AudioPlayer, createAudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';

const sources = {
  pop: require('../assets/sounds/pop.wav'),
  bonk: require('../assets/sounds/bonk.wav'),
  chime: require('../assets/sounds/chime.wav'),
};

type SoundName = keyof typeof sources;
const players: Partial<Record<SoundName, AudioPlayer>> = {};
let soundEnabled = true;

export function setSoundEnabled(enabled: boolean) {
  soundEnabled = enabled;
}

function play(name: SoundName) {
  if (!soundEnabled) return;
  try {
    const player = (players[name] ??= createAudioPlayer(sources[name]));
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
