// The house: a fixed 12×16 tile grid split into 4×4-tile blocks, one room per block. Walls live on tile edges and only the listed doorways are open, so the house is
// an outer ring with shortcuts through the Hallway and Dining room.

export const MAP_W = 12;
export const MAP_H = 16;
export const ROOM_SIZE = 4;
export const TILE_COUNT = MAP_W * MAP_H;

export type Tile = number; // y * MAP_W + x

export const tileOf = (x: number, y: number): Tile => y * MAP_W + x;
export const xOf = (t: Tile) => t % MAP_W;
export const yOf = (t: Tile) => Math.floor(t / MAP_W);
export const inBounds = (x: number, y: number) => x >= 0 && x < MAP_W && y >= 0 && y < MAP_H;

export type RoomId =
  | 'bedroom' | 'bathroom' | 'kids' | 'reading' | 'hallway' | 'craft'
  | 'sunroom' | 'dining' | 'laundry' | 'kitchen' | 'entry' | 'living';

export interface Room {
  id: RoomId;
  label: string;
  bx: number; // top-left block column (0..2)
  by: number; // top-left block row (0..3)
  bw: number; // width in blocks
  bh: number; // height in blocks
  floor: string; // floor color
}

//  Bedroom | Bathroom | Kids'
//  Laundry | Hallway  | Craft
//  Sunroom | Dining   | Reading
//  Kitchen | Entry    | Living
export const ROOMS: Room[] = [
  { id: 'bedroom', label: 'Bedroom', bx: 0, by: 0, bw: 1, bh: 1, floor: '#F6D9E3' },
  { id: 'bathroom', label: 'Bathroom', bx: 1, by: 0, bw: 1, bh: 1, floor: '#D5ECF2' },
  { id: 'kids', label: "Kids' Room", bx: 2, by: 0, bw: 1, bh: 1, floor: '#FCE7B8' },
  { id: 'reading', label: 'Reading Nook', bx: 2, by: 2, bw: 1, bh: 1, floor: '#DCE8CF' },
  { id: 'hallway', label: 'Hallway', bx: 1, by: 1, bw: 1, bh: 1, floor: '#EADBC6' },
  { id: 'craft', label: 'Craft Room', bx: 2, by: 1, bw: 1, bh: 1, floor: '#E4DAF5' },
  { id: 'sunroom', label: 'Sunroom', bx: 0, by: 2, bw: 1, bh: 1, floor: '#FFF0C9' },
  { id: 'dining', label: 'Dining', bx: 1, by: 2, bw: 1, bh: 1, floor: '#F3D6CC' },
  { id: 'laundry', label: 'Laundry', bx: 0, by: 1, bw: 1, bh: 1, floor: '#D8EEDC' },
  { id: 'kitchen', label: 'Kitchen', bx: 0, by: 3, bw: 1, bh: 1, floor: '#FBEFC9' },
  { id: 'entry', label: 'Entry Hall', bx: 1, by: 3, bw: 1, bh: 1, floor: '#EFE3CF' },
  { id: 'living', label: 'Living Room', bx: 2, by: 3, bw: 1, bh: 1, floor: '#F7DCC8' },
];

/**
 * Every doorway: 2 tiles wide, centred on the shared edge. Rooms that touch without a
 * doorway are walled off. The middle rooms are a partial shortcut on purpose: there's no
 * Bathroom→Hallway door, so where the snail is when you leave decides how long you're safe
 * (25h from the middle, up to 40h from a corner).
 */
export const DOORS: [RoomId, RoomId][] = [
  ['bedroom', 'bathroom'],
  ['bathroom', 'kids'],
  ['bedroom', 'laundry'],
  ['kids', 'craft'],
  ['hallway', 'dining'],
  ['hallway', 'craft'],
  ['laundry', 'sunroom'],
  ['sunroom', 'dining'],
  ['sunroom', 'kitchen'],
  ['dining', 'entry'],
  ['craft', 'reading'],
  ['reading', 'living'],
  ['kitchen', 'entry'],
  ['entry', 'living'],
];

export type FurnitureKind =
  | 'bed' | 'bathtub' | 'toybox' | 'crafttable' | 'bench' | 'washer'
  | 'couch' | 'counter' | 'table' | 'bookshelf';

export interface Furniture {
  kind: FurnitureKind;
  x: number;
  y: number;
  w: number;
  h: number;
}

// Furniture that blocks movement. Everything else in the art is decorative.
// Careful: blocking a tile next to a room corner turns that corner into a dead end
// (the map tests catch this).
export const BLOCKING_FURNITURE: Furniture[] = [
  { kind: 'bed', x: 0, y: 0, w: 2, h: 1 },
  { kind: 'bathtub', x: 4, y: 0, w: 2, h: 1 },
  { kind: 'toybox', x: 11, y: 0, w: 1, h: 1 },
  { kind: 'washer', x: 0, y: 6, w: 1, h: 2 },
  { kind: 'bench', x: 4, y: 4, w: 1, h: 2 },
  { kind: 'crafttable', x: 11, y: 6, w: 1, h: 2 },
  { kind: 'bookshelf', x: 11, y: 10, w: 1, h: 2 },
  { kind: 'table', x: 5, y: 9, w: 2, h: 2 },
  { kind: 'counter', x: 0, y: 14, w: 1, h: 2 },
  { kind: 'couch', x: 10, y: 15, w: 2, h: 1 },
];

/**
 * Where a new run starts: the player and the snail together in the Craft Room, 3 tiles
 * apart. The first thing you see is the snail right next to you, so you have to move.
 */
export const START_PLAYER: Tile = tileOf(8, 5);
export const START_SNAIL: Tile = tileOf(10, 6);

const blockOf = (x: number, y: number) => [Math.floor(x / ROOM_SIZE), Math.floor(y / ROOM_SIZE)] as const;

const inRoom = (r: Room, bx: number, by: number) => bx >= r.bx && bx < r.bx + r.bw && by >= r.by && by < r.by + r.bh;

export function roomAt(x: number, y: number): Room | undefined {
  const [bx, by] = blockOf(x, y);
  return ROOMS.find((r) => inRoom(r, bx, by));
}

export const roomById = (id: RoomId) => ROOMS.find((r) => r.id === id)!;

// Doorway tiles: the middle two tiles of a shared 4-tile block edge.
const DOOR_OFFSETS = [1, 2];
const edgeKey = (a: Tile, b: Tile) => Math.min(a, b) * TILE_COUNT + Math.max(a, b);
const openEdges = new Set<number>();

for (const [aId, bId] of DOORS) {
  const a = roomById(aId);
  const b = roomById(bId);
  let found = false;
  for (let ay = a.by; ay < a.by + a.bh && !found; ay++) {
    for (let ax = a.bx; ax < a.bx + a.bw && !found; ax++) {
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        if (!inRoom(b, ax + dx, ay + dy)) continue;
        for (const o of DOOR_OFFSETS) {
          // Tile in block (ax, ay) on the shared edge, and its neighbour across it.
          const x = dx === 1 ? ax * ROOM_SIZE + ROOM_SIZE - 1 : dx === -1 ? ax * ROOM_SIZE : ax * ROOM_SIZE + o;
          const y = dy === 1 ? ay * ROOM_SIZE + ROOM_SIZE - 1 : dy === -1 ? ay * ROOM_SIZE : ay * ROOM_SIZE + o;
          openEdges.add(edgeKey(tileOf(x, y), tileOf(x + dx, y + dy)));
        }
        found = true;
        break;
      }
    }
  }
  if (!found) throw new Error(`Rooms ${aId} and ${bId} don't touch`);
}

const blocked = new Uint8Array(TILE_COUNT);
for (const f of BLOCKING_FURNITURE) {
  for (let dy = 0; dy < f.h; dy++) for (let dx = 0; dx < f.w; dx++) blocked[tileOf(f.x + dx, f.y + dy)] = 1;
}

export const isWalkable = (t: Tile) => t >= 0 && t < TILE_COUNT && blocked[t] === 0;

/** Is there a wall between (x,y) and its neighbour (x+dx, y+dy)? */
export function wallBetween(x: number, y: number, dx: number, dy: number): boolean {
  const nx = x + dx;
  const ny = y + dy;
  if (!inBounds(nx, ny)) return true;
  if (roomAt(x, y) === roomAt(nx, ny)) return false;
  return !openEdges.has(edgeKey(tileOf(x, y), tileOf(nx, ny)));
}

// Fixed neighbour order (up, right, down, left) keeps pathfinding deterministic.
export const DIRS: readonly (readonly [number, number])[] = [[0, -1], [1, 0], [0, 1], [-1, 0]];

export const NEIGHBORS: readonly (readonly Tile[])[] = Array.from({ length: TILE_COUNT }, (_, t) => {
  if (!isWalkable(t)) return [];
  const x = xOf(t);
  const y = yOf(t);
  const out: Tile[] = [];
  for (const [dx, dy] of DIRS) {
    const n = tileOf(x + dx, y + dy);
    if (!wallBetween(x, y, dx, dy) && isWalkable(n)) out.push(n);
  }
  return out;
});

export const WALKABLE_TILES: readonly Tile[] = Array.from({ length: TILE_COUNT }, (_, t) => t).filter(isWalkable);
