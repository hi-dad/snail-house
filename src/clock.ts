// Game clock. Normally equal to Date.now(); the debug menu can speed it up.
// Game time = anchorGame + (realNow - anchorReal) * speed, so it never jumps backwards.

export interface ClockState {
  anchorReal: number;
  anchorGame: number;
  speed: number;
}

let clock: ClockState = { anchorReal: 0, anchorGame: 0, speed: 1 };

export const getClock = () => clock;

export function setClock(next: ClockState | null) {
  clock = next ?? { anchorReal: 0, anchorGame: 0, speed: 1 };
}

export function gameNow(): number {
  if (clock.speed === 1 && clock.anchorGame === clock.anchorReal) return Date.now();
  return clock.anchorGame + (Date.now() - clock.anchorReal) * clock.speed;
}

export function setSpeed(speed: number) {
  const now = gameNow();
  clock = { anchorReal: Date.now(), anchorGame: now, speed };
}

/** The real-world moment a game time will happen (for scheduling notifications). */
export function gameToReal(gameTime: number): number {
  const now = gameNow();
  return Date.now() + (gameTime - now) / clock.speed;
}
