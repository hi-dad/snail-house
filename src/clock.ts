// Game clock. The saved shape retains `speed` for compatibility with older developer
// builds, but released games always resume at normal speed.

export interface ClockState {
  anchorReal: number;
  anchorGame: number;
  speed: number;
}

let clock: ClockState = { anchorReal: 0, anchorGame: 0, speed: 1 };

export const getClock = () => clock;

export function setClock(next: ClockState | null) {
  if (!next) {
    clock = { anchorReal: 0, anchorGame: 0, speed: 1 };
    return;
  }
  if (next.speed === 1) {
    clock = next;
    return;
  }
  const realNow = Date.now();
  const previousGameNow = next.anchorGame + (realNow - next.anchorReal) * next.speed;
  clock = { anchorReal: realNow, anchorGame: previousGameNow, speed: 1 };
}

export function gameNow(): number {
  if (clock.speed === 1 && clock.anchorGame === clock.anchorReal) return Date.now();
  return clock.anchorGame + (Date.now() - clock.anchorReal) * clock.speed;
}

/** The real-world moment a game time will happen (for scheduling notifications). */
export function gameToReal(gameTime: number): number {
  const now = gameNow();
  return Date.now() + (gameTime - now) / clock.speed;
}
