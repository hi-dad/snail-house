import { describe, expect, it } from '@jest/globals';


import {
  DAY_MS, DIAMETER_ENDPOINTS, HOUR_MS, MAP_DIAMETER, MAX_LEAD_MS, SNAIL_STEP_MS, TOKEN_RESPAWN_MS,
} from '../constants';
import { DOORS, NEIGHBORS, WALKABLE_TILES, isWalkable, roomAt, tileOf, xOf, yOf } from '../map';
import { bfs, eccentricity } from '../pathfinding';
import { GameState, advance, catchTime, movePlayer, newRun, safetyMs, survivedMs } from '../simulation';

const T0 = Date.UTC(2026, 0, 1);

/** A run with the player and snail as far apart as possible (exactly 40h). */
const farRun = (now: number): GameState => ({
  ...newRun(now, 'peach'),
  playerTile: DIAMETER_ENDPOINTS.a,
  snailTile: DIAMETER_ENDPOINTS.b,
});

describe('map', () => {
  it('is fully connected', () => {
    const dist = bfs(WALKABLE_TILES[0]);
    for (const t of WALKABLE_TILES) expect(dist[t]).toBeGreaterThanOrEqual(0);
  });

  it('has no dead ends: removing any one tile (the snail) never cuts the house apart', () => {
    for (const snail of WALKABLE_TILES) {
      const others = WALKABLE_TILES.filter((t) => t !== snail);
      const dist = bfs(others[0], snail);
      const cutOff = others.filter((t) => dist[t] === -1);
      expect({ snail, cutOff }).toEqual({ snail, cutOff: [] });
    }
  });

  it('has exactly the listed 2-wide doorways and walls everywhere else', () => {
    const crossings = new Map<string, number>();
    for (const t of WALKABLE_TILES) {
      for (const n of NEIGHBORS[t]) {
        const a = roomAt(xOf(t), yOf(t))!.id;
        const b = roomAt(xOf(n), yOf(n))!.id;
        if (a < b) crossings.set(`${a}-${b}`, (crossings.get(`${a}-${b}`) ?? 0) + 1);
      }
    }
    const expected = new Map(DOORS.map(([a, b]) => [a < b ? `${a}-${b}` : `${b}-${a}`, 2]));
    expect(Object.fromEntries(crossings)).toEqual(Object.fromEntries(expected));
  });
});

describe('snail speed', () => {
  it('has a diameter in the expected range', () => {
    expect(MAP_DIAMETER).toBeGreaterThanOrEqual(24);
    expect(MAP_DIAMETER).toBeLessThanOrEqual(32);
  });

  it('makes the maximum possible lead exactly 40 hours', () => {
    let maxDist = 0;
    for (const t of WALKABLE_TILES) maxDist = Math.max(maxDist, eccentricity(t));
    expect(maxDist).toBe(MAP_DIAMETER);
    expect(maxDist * SNAIL_STEP_MS).toBeCloseTo(40 * HOUR_MS, 3);
  });

  it('makes position matter: the snail in the middle gives a shorter lead than in a corner', () => {
    // Every other tile is reachable for the player (see the no-dead-ends test), so the
    // best lead available is the snail tile's eccentricity.
    const leads = WALKABLE_TILES.map((snail) => eccentricity(snail) * SNAIL_STEP_MS);
    const worst = Math.min(...leads);
    const best = Math.max(...leads);
    expect(best).toBeCloseTo(MAX_LEAD_MS, 3);
    expect(worst).toBeGreaterThan(20 * HOUR_MS); // never a trap
    expect(best - worst).toBeGreaterThan(10 * HOUR_MS); // but a big reason to herd the snail
  });

  it('starts a new run with the snail in the same room, so you must move right away', () => {
    const s = newRun(T0, 'peach');
    const room = (t: number) => roomAt(xOf(t), yOf(t))!.id;
    expect(room(s.playerTile)).toBe('craft');
    expect(room(s.snailTile)).toBe('craft');
    expect(safetyMs(s, T0)).toBeLessThan(6 * HOUR_MS);
    // ...but running to the far side of the house gets you well clear.
    const dist = bfs(s.snailTile);
    const far = WALKABLE_TILES.reduce((best, t) => (dist[t] > dist[best] ? t : best));
    expect(safetyMs(movePlayer(s, far, T0)!.state, T0)).toBeGreaterThan(24 * HOUR_MS);
  });

  it('can put you exactly 40 hours from the snail', () => {
    expect(safetyMs(farRun(T0), T0)).toBeCloseTo(MAX_LEAD_MS, 3);
  });
});

describe('advance()', () => {
  it('gives the same result called once after 30h or every minute for 30h', () => {
    const start = farRun(T0);
    const once = advance(start, T0 + 30 * HOUR_MS);
    let stepped: GameState = start;
    for (let t = T0; t <= T0 + 30 * HOUR_MS; t += 60 * 1000) stepped = advance(stepped, t);
    expect(stepped).toEqual(once);
    expect(once.alive).toBe(true);
    expect(once.snailTile).not.toBe(start.snailTile);
  });

  it('moves the snail one tile per step interval', () => {
    const start = farRun(T0);
    const before = bfs(start.playerTile)[start.snailTile];
    const s = advance(start, T0 + 5 * SNAIL_STEP_MS + 1);
    expect(bfs(s.playerTile)[s.snailTile]).toBe(before - 5);
    expect(s.snailLastStepTime).toBeCloseTo(T0 + 5 * SNAIL_STEP_MS, 3);
  });

  it('records the real catch time when reopened long after the catch', () => {
    const start = farRun(T0);
    const expectedDeath = catchTime(start);
    const later = advance(start, T0 + 30 * DAY_MS);
    expect(later.alive).toBe(false);
    expect(later.snailTile).toBe(later.playerTile);
    expect(later.deathTime).toBeCloseTo(expectedDeath, 3);
    expect(survivedMs(later, T0 + 30 * DAY_MS)).toBeCloseTo(MAX_LEAD_MS, 3);
    // Advancing a dead run changes nothing.
    expect(advance(later, T0 + 60 * DAY_MS)).toBe(later);
  });

  it('keeps counting down between steps', () => {
    const s = farRun(T0);
    expect(safetyMs(s, T0 + HOUR_MS)).toBeCloseTo(MAX_LEAD_MS - HOUR_MS, 3);
  });
});

describe('strawberries', () => {
  it('puts one on the map as soon as a run starts', () => {
    const s = advance(newRun(T0, 'peach'), T0);
    expect(s.tokenTile).not.toBeNull();
    expect(isWalkable(s.tokenTile!)).toBe(true);
    expect(s.tokenTile).not.toBe(s.playerTile);
    expect(s.tokenTile).not.toBe(s.snailTile);
  });

  it('is collected by walking over it, and the next one appears 3 hours later', () => {
    const s = advance(newRun(T0, 'peach'), T0);
    const moved = movePlayer(s, s.tokenTile!, T0 + 1000)!;
    expect(moved.collected).toBe(true);
    expect(moved.state.tokens).toBe(1);
    expect(moved.state.tokenTile).toBeNull();
    expect(advance(moved.state, T0 + 1000 + TOKEN_RESPAWN_MS - 1).tokenTile).toBeNull();
    expect(advance(moved.state, T0 + 1000 + TOKEN_RESPAWN_MS).tokenTile).not.toBeNull();
  });

  it('gets eaten if the snail crawls over it first', () => {
    const s = advance(newRun(T0, 'peach'), T0);
    // Put the strawberry right where the snail is about to step.
    const next = advance({ ...s, tokenTile: null, tokenSpawnAt: Infinity }, T0 + SNAIL_STEP_MS).snailTile;
    const eaten = advance({ ...s, tokenTile: next }, T0 + SNAIL_STEP_MS);
    expect(eaten.snailTile).toBe(next);
    expect(eaten.tokenTile).toBeNull();
    expect(eaten.tokens).toBe(0);
    expect(eaten.tokenSpawnAt).toBeCloseTo(T0 + SNAIL_STEP_MS + TOKEN_RESPAWN_MS, 3);
  });
});

describe('movePlayer()', () => {
  it('never walks through the snail and survives checking in once a day', () => {
    let s = newRun(T0, 'peach');
    let now = T0;
    // Run on the first open, then check in once a day for 60 days, always running to
    // the tile farthest from the snail.
    for (let day = 0; day <= 60; day++) {
      if (day > 0) now += DAY_MS;
      s = advance(s, now);
      expect(s.alive).toBe(true);
      const dist = bfs(s.snailTile);
      const target = WALKABLE_TILES.reduce((best, t) => (dist[t] > dist[best] ? t : best));
      const moved = movePlayer(s, target, now);
      expect(moved).not.toBeNull();
      expect(moved!.path).not.toContain(s.snailTile);
      s = moved!.state;
    }
    expect(survivedMs(s, now)).toBe(60 * DAY_MS);
  });

  it('refuses the snail tile and blocking furniture', () => {
    const s = newRun(T0, 'peach');
    expect(movePlayer(s, s.snailTile, T0)).toBeNull();
    expect(movePlayer(s, tileOf(0, 0), T0)).toBeNull(); // the bed
  });
});
