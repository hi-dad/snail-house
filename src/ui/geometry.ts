import { MAP_H, MAP_W, Tile, xOf, yOf } from '../game/map';

/** SVG units per tile. */
export const U = 10;

/** The house drawing's viewBox: tile area plus room for the outer wall and dollhouse front. */
export const VIEW = { x: -7, y: -8, w: MAP_W * U + 14, h: MAP_H * U + 20 };

export const ASPECT = VIEW.w / VIEW.h;

/** Pixel position of a tile's top-left corner inside a map drawn `width` pixels wide. */
export function tileToPx(tx: number, ty: number, width: number) {
  const s = width / VIEW.w;
  return { x: (tx * U - VIEW.x) * s, y: (ty * U - VIEW.y) * s, size: U * s };
}

/** The tile under a tap at (px, py), or null if outside the tile area. */
export function pxToTile(px: number, py: number, width: number): { x: number; y: number } | null {
  const s = width / VIEW.w;
  const x = Math.floor((px / s + VIEW.x) / U);
  const y = Math.floor((py / s + VIEW.y) / U);
  if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || x >= MAP_W || y < 0 || y >= MAP_H) return null;
  return { x, y };
}

export const tileXY = (t: Tile) => ({ x: xOf(t), y: yOf(t) });
