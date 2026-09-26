import { NEIGHBORS, TILE_COUNT, Tile, WALKABLE_TILES } from './map';

/** BFS distances from `from`. Unreachable tiles are -1. `avoid` tiles are never entered. */
export function bfs(from: Tile, avoid: Tile = -1): Int32Array {
  const dist = new Int32Array(TILE_COUNT).fill(-1);
  const queue = new Int32Array(TILE_COUNT);
  let head = 0;
  let tail = 0;
  dist[from] = 0;
  queue[tail++] = from;
  while (head < tail) {
    const t = queue[head++];
    for (const n of NEIGHBORS[t]) {
      if (dist[n] !== -1 || n === avoid) continue;
      dist[n] = dist[t] + 1;
      queue[tail++] = n;
    }
  }
  return dist;
}

/** Shortest path from `from` to `to` (excluding `from`), avoiding `avoid`. null if unreachable. */
export function shortestPath(from: Tile, to: Tile, avoid: Tile = -1): Tile[] | null {
  if (to === avoid) return null;
  if (from === to) return [];
  const dist = bfs(to, avoid);
  if (dist[from] === -1) return null;
  const path: Tile[] = [];
  let cur = from;
  while (cur !== to) {
    cur = NEIGHBORS[cur].find((n) => dist[n] === dist[cur] - 1)!;
    path.push(cur);
  }
  return path;
}

/**
 * The tile to step onto when chasing `target` from `from`, given distances already
 * computed from the target. Ties break by the fixed neighbour order.
 */
export function stepToward(from: Tile, distFromTarget: Int32Array): Tile {
  const d = distFromTarget[from];
  if (d <= 0) return from;
  return NEIGHBORS[from].find((n) => distFromTarget[n] === d - 1)!;
}

export function distance(a: Tile, b: Tile): number {
  return bfs(a)[b];
}

/** The walkable tile farthest from `from` (lowest index wins ties). */
export function farthestTile(from: Tile): { tile: Tile; dist: number } {
  const dist = bfs(from);
  let tile = from;
  for (const t of WALKABLE_TILES) if (dist[t] > dist[tile]) tile = t;
  return { tile, dist: dist[tile] };
}

/** The map's diameter: the longest shortest-path distance between any two walkable tiles. */
export function computeDiameter(): { diameter: number; a: Tile; b: Tile } {
  let best = { diameter: -1, a: 0, b: 0 };
  for (const a of WALKABLE_TILES) {
    const { tile, dist } = farthestTile(a);
    if (dist > best.diameter) best = { diameter: dist, a, b: tile };
  }
  return best;
}

/** Largest distance from `from` to any tile (its eccentricity). */
export function eccentricity(from: Tile): number {
  return farthestTile(from).dist;
}
