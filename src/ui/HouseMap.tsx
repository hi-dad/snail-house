import React, { memo } from 'react';
import Svg, {
  Circle, Defs, Ellipse, G, Line, Path, Pattern, RadialGradient, Rect, Stop, Text as SvgText,
} from 'react-native-svg';

import {
  BLOCKING_FURNITURE, Furniture, MAP_H, MAP_W, ROOMS, ROOM_SIZE, RoomId, wallBetween,
} from '../game/map';
import { U, VIEW } from './geometry';
import { C, FONT } from './theme';

const W = MAP_W * U;
const H = MAP_H * U;
const WALL = 1.1; // half-thickness of interior walls
const FACE = 2.4; // visible front face under horizontal walls (the 3/4 tilt)
const OUTER = 3.2; // exterior wall thickness
const FRONT = 7; // dollhouse front face under the house

const TILED_ROOMS: RoomId[] = ['bathroom', 'kitchen'];

// Room names sit in the middle of each room on a soft name tag. Dining's table fills the
// middle, so its name sits just below the table.
const LABEL_DY: Partial<Record<RoomId, number>> = { dining: 0.43 };
const LABEL_SIZE = 3.5;

type Seg = { x1: number; y1: number; x2: number; y2: number };

/** Interior wall segments (in tile units), merged into runs, with doorway gaps. */
function interiorWalls(): { horizontal: Seg[]; vertical: Seg[] } {
  const horizontal: Seg[] = [];
  const vertical: Seg[] = [];
  for (let y = ROOM_SIZE; y < MAP_H; y += ROOM_SIZE) {
    let run: Seg | null = null;
    for (let x = 0; x <= MAP_W; x++) {
      const wall = x < MAP_W && wallBetween(x, y - 1, 0, 1);
      if (wall && run) run.x2 = x + 1;
      else if (wall) run = { x1: x, y1: y, x2: x + 1, y2: y };
      else if (run) {
        horizontal.push(run);
        run = null;
      }
    }
  }
  for (let x = ROOM_SIZE; x < MAP_W; x += ROOM_SIZE) {
    let run: Seg | null = null;
    for (let y = 0; y <= MAP_H; y++) {
      const wall = y < MAP_H && wallBetween(x - 1, y, 1, 0);
      if (wall && run) run.y2 = y + 1;
      else if (wall) run = { x1: x, y1: y, x2: x, y2: y + 1 };
      else if (run) {
        vertical.push(run);
        run = null;
      }
    }
  }
  return { horizontal, vertical };
}

const WALLS = interiorWalls();

function Shadow({ x, y, w, h, r = 2 }: { x: number; y: number; w: number; h: number; r?: number }) {
  return <Rect x={x + 0.7} y={y + 1.3} width={w} height={h} rx={r} fill={C.shadow} />;
}

const stroke = { stroke: C.outline, strokeWidth: 0.55, strokeLinejoin: 'round' as const };

function FurniturePiece({ f }: { f: Furniture }) {
  const x = f.x * U;
  const y = f.y * U;
  const w = f.w * U;
  const h = f.h * U;
  switch (f.kind) {
    case 'bed':
      return (
        <G>
          <Shadow x={x + 0.8} y={y + 0.8} w={w - 1.6} h={h - 1.2} />
          <Rect x={x + 0.8} y={y + 0.6} width={w - 1.6} height={h - 1.4} rx={2.2} fill="#D2A77F" {...stroke} />
          <Rect x={x + 1.6} y={y + 1.4} width={w - 3.2} height={h - 3} rx={1.6} fill="#FFFDF8" {...stroke} />
          <Rect x={x + 2.4} y={y + 2.2} width={5} height={h - 4.6} rx={1.4} fill="#FFFFFF" {...stroke} />
          <Rect x={x + 8.6} y={y + 1.4} width={w - 10.2} height={h - 3} rx={1.6} fill="#F7B7C5" {...stroke} />
          <Line x1={x + 10.2} y1={y + 1.6} x2={x + 10.2} y2={y + h - 1.8} stroke="#EE9FB1" strokeWidth={0.7} />
          {[12.5, 15.5].map((dx) => (
            <Circle key={dx} cx={x + dx} cy={y + h / 2 - 0.4} r={0.7} fill="#FFFFFF" opacity={0.8} />
          ))}
        </G>
      );
    case 'bathtub':
      return (
        <G>
          <Shadow x={x + 0.8} y={y + 0.8} w={w - 1.6} h={h - 1.4} r={4} />
          <Rect x={x + 0.8} y={y + 0.6} width={w - 1.6} height={h - 1.6} rx={4} fill="#FFFFFF" {...stroke} />
          <Rect x={x + 2.2} y={y + 2} width={w - 4.4} height={h - 4.4} rx={3} fill="#BFE3F0" />
          {[[6, 4.5, 1.4], [8.5, 5.8, 1], [13, 4, 1.2], [15, 6, 0.8]].map(([dx, dy, r], i) => (
            <Circle key={i} cx={x + dx} cy={y + dy} r={r} fill="#FFFFFF" opacity={0.9} />
          ))}
          <Rect x={x + w - 3.2} y={y + h / 2 - 1.2} width={1.6} height={2.4} rx={0.6} fill="#C9D3DA" {...stroke} />
        </G>
      );
    case 'toybox':
      return (
        <G>
          <Shadow x={x + 1} y={y + 1.2} w={w - 2} h={h - 2.4} />
          <Rect x={x + 1} y={y + 1} width={w - 2} height={h - 2.4} rx={1.6} fill="#F4C06B" {...stroke} />
          <Rect x={x + 1} y={y + 1} width={w - 2} height={2.4} rx={1.2} fill="#E9A94B" {...stroke} />
          <Path d={star(x + w / 2, y + 5.6, 1.8, 0.8)} fill="#FFF3C4" />
        </G>
      );
    case 'bookshelf': {
      const books = ['#E88D8D', '#8FC1E3', '#F2C46D', '#A9D5A0', '#C7A6E3', '#F4A6C0'];
      // Hug whichever outer wall it stands against.
      const sx = f.x === 0 ? x + 0.3 : x + 2.9;
      return (
        <G>
          <Shadow x={sx + 0.3} y={y + 0.6} w={w - 3} h={h - 1.2} r={1} />
          <Rect x={sx} y={y + 0.6} width={w - 3.2} height={h - 1.2} rx={1} fill="#B98B64" {...stroke} />
          {Array.from({ length: 6 }, (_, i) => (
            <Rect
              key={i}
              x={f.x === 0 ? sx + 0.7 : sx + 1.2 + (i % 3) * 0.6}
              y={y + 1.6 + i * 3}
              width={w - 4.6 - (i % 3) * 0.6}
              height={2.2}
              rx={0.5}
              fill={books[i]}
              stroke={C.outline}
              strokeWidth={0.3}
            />
          ))}
        </G>
      );
    }
    case 'crafttable':
      return (
        <G>
          <Shadow x={x + 0.8} y={y + 1} w={w - 1.6} h={h - 1.6} />
          <Rect x={x + 0.8} y={y + 0.8} width={w - 1.6} height={h - 1.6} rx={1.6} fill="#E6C7A0" {...stroke} />
          <Rect x={x + 2} y={y + 2} width={5.4} height={6.4} rx={0.5} fill="#FFFFFF" {...stroke} transform={`rotate(-6 ${x + 4.7} ${y + 5.2})`} />
          <Path d={`M${x + 3.3} ${y + 5.8} q1.2 -2 2.6 0`} stroke="#F4A6C0" strokeWidth={0.7} fill="none" />
          {['#E88D8D', '#8FC1E3', '#F2C46D'].map((c, i) =>
            h > w ? (
              <Circle key={c} cx={x + 4.5} cy={y + 12 + i * 2.6} r={1.1} fill={c} {...stroke} strokeWidth={0.35} />
            ) : (
              <Circle key={c} cx={x + 12 + i * 2.6} cy={y + 4.6} r={1.1} fill={c} {...stroke} strokeWidth={0.35} />
            ),
          )}
        </G>
      );
    case 'washer':
      return (
        <G>
          {[0, 1].map((i) => (
            <G key={i}>
              <Shadow x={x + 1} y={y + i * U + 0.8} w={w - 1.8} h={U - 1.6} r={1.4} />
              <Rect x={x + 1} y={y + i * U + 0.6} width={w - 1.8} height={U - 1.6} rx={1.4} fill="#FFFFFF" {...stroke} />
              <Circle cx={x + 5.4} cy={y + i * U + 5.6} r={2.8} fill="#BFE3F0" {...stroke} />
              <Circle cx={x + 5} cy={y + i * U + 5} r={0.9} fill="#FFFFFF" opacity={0.8} />
              <Circle cx={x + 8.2} cy={y + i * U + 2} r={0.5} fill={C.outline} />
            </G>
          ))}
        </G>
      );
    case 'bench':
      // A hall bench against the wall with two cushions and shoes tucked underneath.
      return (
        <G>
          <Shadow x={x + 0.6} y={y + 0.8} w={w - 3.6} h={h - 1.6} r={1.2} />
          <Rect x={x + 0.6} y={y + 0.8} width={w - 3.6} height={h - 1.6} rx={1.2} fill="#C99A70" {...stroke} />
          <Rect x={x + 1.4} y={y + 2} width={w - 5.2} height={(h - 5) / 2} rx={1.2} fill="#9CC5E8" {...stroke} strokeWidth={0.4} />
          <Rect x={x + 1.4} y={y + 3 + (h - 5) / 2} width={w - 5.2} height={(h - 5) / 2} rx={1.2} fill="#F4A6C0" {...stroke} strokeWidth={0.4} />
          <Ellipse cx={x + w - 1.8} cy={y + 6} rx={0.9} ry={1.8} fill="#8E5E45" />
          <Ellipse cx={x + w - 1.8} cy={y + 9.8} rx={0.9} ry={1.8} fill="#8E5E45" />
        </G>
      );
    case 'table':
      return (
        <G>
          {/* chairs peek out on each side */}
          {[[w / 2 - 2, -1.6, 4, 2.6], [w / 2 - 2, h - 1, 4, 2.6], [-1.6, h / 2 - 2, 2.6, 4], [w - 1, h / 2 - 2, 2.6, 4]].map(
            ([cx, cy, cw, ch], i) => (
              <Rect key={i} x={x + cx} y={y + cy} width={cw} height={ch} rx={1} fill="#C99A70" {...stroke} />
            ),
          )}
          <Shadow x={x + 1.4} y={y + 1.4} w={w - 2.8} h={h - 2.8} r={4} />
          <Rect x={x + 1.4} y={y + 1.2} width={w - 2.8} height={h - 2.8} rx={4} fill="#D7A97E" {...stroke} />
          <Rect x={x + w / 2 - 3} y={y + 1.6} width={6} height={h - 3.6} fill="#FFF3E6" opacity={0.9} />
          {(h >= 2 * U ? [[5, 5], [w - 5, 5], [5, h - 5.5], [w - 5, h - 5.5]] : [[4.6, h / 2], [w - 4.6, h / 2]]).map(([px, py], i) => (
            <Circle key={i} cx={x + px} cy={y + py} r={1.9} fill="#FFFFFF" {...stroke} strokeWidth={0.35} />
          ))}
          <Circle cx={x + w / 2} cy={y + h / 2 - 0.5} r={1.6} fill="#9CC5E8" {...stroke} strokeWidth={0.4} />
          {[0, 72, 144, 216, 288].map((a) => (
            <Circle
              key={a}
              cx={x + w / 2 + Math.cos((a * Math.PI) / 180) * 1.5}
              cy={y + h / 2 - 2.2 + Math.sin((a * Math.PI) / 180) * 1.5}
              r={0.9}
              fill="#F7A8B8"
            />
          ))}
        </G>
      );
    case 'counter':
      return (
        <G>
          <Shadow x={x + 0.4} y={y + 0.6} w={w - 1.8} h={h - 1} r={1} />
          <Rect x={x + 0.3} y={y + 0.4} width={w - 1.8} height={h - 1} rx={1.2} fill="#F3E3C8" {...stroke} />
          {/* stove */}
          <Rect x={x + 1.2} y={y + 1.4} width={w - 3.6} height={7.6} rx={1} fill="#F8F4EE" {...stroke} strokeWidth={0.4} />
          {[[3.5, 3.6], [6.2, 3.6], [3.5, 6.8], [6.2, 6.8]].map(([dx, dy], i) => (
            <Circle key={i} cx={x + dx} cy={y + dy} r={1} fill="none" stroke={C.outline} strokeWidth={0.45} />
          ))}
          <Circle cx={x + 6.2} cy={y + 3.6} r={1.6} fill="#E88D8D" {...stroke} strokeWidth={0.4} />
          {/* sink */}
          <Rect x={x + 1.6} y={y + 11.5} width={w - 4.4} height={5.6} rx={1.6} fill="#BFE3F0" {...stroke} strokeWidth={0.4} />
        </G>
      );
    case 'couch':
      return (
        <G>
          <Shadow x={x + 0.6} y={y + 0.6} w={w - 1.2} h={h - 0.8} r={3} />
          <Rect x={x + 0.6} y={y + 0.4} width={w - 1.2} height={h - 0.6} rx={3} fill="#9CC5A1" {...stroke} />
          <Rect x={x + 0.6} y={y + h - 4} width={w - 1.2} height={3.6} rx={1.8} fill="#86B38C" {...stroke} />
          <Rect x={x + 0.6} y={y + 0.4} width={3} height={h - 0.8} rx={1.5} fill="#86B38C" {...stroke} />
          <Rect x={x + w - 3.6} y={y + 0.4} width={3} height={h - 0.8} rx={1.5} fill="#86B38C" {...stroke} />
          <Line x1={x + w / 2} y1={y + 1.4} x2={x + w / 2} y2={y + h - 4.2} stroke="#86B38C" strokeWidth={0.6} />
          <SleepingCat x={x + 7} y={y + 3.4} />
        </G>
      );
  }
}

function SleepingCat({ x, y }: { x: number; y: number }) {
  return (
    <G>
      <Path d={`M${x + 3.6} ${y + 1.8} q3 -0.2 2.2 2.4`} stroke={C.outline} strokeWidth={1.5} strokeLinecap="round" fill="none" />
      <Path d={`M${x + 3.6} ${y + 1.8} q3 -0.2 2.2 2.4`} stroke="#F2B880" strokeWidth={0.8} strokeLinecap="round" fill="none" />
      <Ellipse cx={x + 1.8} cy={y + 2.2} rx={3.4} ry={2.4} fill="#F2B880" {...stroke} />
      <Path d={`M${x - 1.2} ${y + 0.8} l0.3 -1.8 l1.2 1.1 Z M${x + 0.6} ${y + 0.2} l0.9 -1.6 l0.8 1.5 Z`} fill="#F2B880" {...stroke} strokeWidth={0.4} />
      <Circle cx={x - 0.2} cy={y + 2.2} r={2} fill="#F2B880" {...stroke} strokeWidth={0.45} />
      <Path d={`M${x - 1.1} ${y + 2} q0.4 0.4 0.8 0 M${x + 0.3} ${y + 2} q0.4 0.4 0.8 0`} stroke={C.outline} strokeWidth={0.3} fill="none" />
      <Path d={`M${x + 0.6} ${y} q1.4 -0.8 2.6 0.2`} stroke="#E0985F" strokeWidth={0.6} fill="none" />
      <SvgText x={x + 3.4} y={y - 1.4} fontSize={2.2} fill={C.inkSoft} fontFamily={FONT.bold}>z</SvgText>
      <SvgText x={x + 5} y={y - 3} fontSize={1.6} fill={C.inkSoft} fontFamily={FONT.bold}>z</SvgText>
    </G>
  );
}

function star(cx: number, cy: number, r: number, inner: number) {
  let d = '';
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 === 0 ? r : inner;
    d += `${i === 0 ? 'M' : 'L'}${(cx + Math.cos(a) * rr).toFixed(2)} ${(cy + Math.sin(a) * rr).toFixed(2)} `;
  }
  return d + 'Z';
}

function Plant({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <G transform={`translate(${x} ${y}) scale(${s})`}>
      <Ellipse cx={0.4} cy={2.6} rx={2.4} ry={0.9} fill={C.shadow} />
      {[-50, -15, 20, 55, 180 + 35, 180 - 30].map((a) => (
        <Ellipse
          key={a}
          cx={Math.cos((a * Math.PI) / 180) * 1.8}
          cy={Math.sin((a * Math.PI) / 180) * 1.8 - 1}
          rx={1.6}
          ry={0.8}
          fill="#8CC79A"
          stroke={C.outline}
          strokeWidth={0.3}
          transform={`rotate(${a} ${Math.cos((a * Math.PI) / 180) * 1.8} ${Math.sin((a * Math.PI) / 180) * 1.8 - 1})`}
        />
      ))}
      <Rect x={-1.5} y={-0.2} width={3} height={2.6} rx={0.8} fill="#E3A07A" {...stroke} strokeWidth={0.4} />
    </G>
  );
}

function Lamp({ x, y }: { x: number; y: number }) {
  return (
    <G>
      <Circle cx={x} cy={y} r={12} fill="url(#glow)" />
      <Circle cx={x + 0.4} cy={y + 0.8} r={2} fill={C.shadow} />
      <Circle cx={x} cy={y} r={2} fill="#FFE7A8" {...stroke} strokeWidth={0.45} />
      <Circle cx={x} cy={y} r={0.7} fill="#FFF8E0" />
    </G>
  );
}

function Window({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  const vertical = h > w;
  return (
    <G>
      <Rect x={x} y={y} width={w} height={h} rx={0.6} fill="#CFE8F5" stroke={C.outline} strokeWidth={0.45} />
      {vertical ? (
        <Line x1={x} y1={y + h / 2} x2={x + w} y2={y + h / 2} stroke={C.outline} strokeWidth={0.35} />
      ) : (
        <Line x1={x + w / 2} y1={y} x2={x + w / 2} y2={y + h} stroke={C.outline} strokeWidth={0.35} />
      )}
    </G>
  );
}

// Rugs lie flat on the floor: no drop shadows or dark outlines (those make things look
// solid, like furniture), and the whole layer is faded so it reads as walkable floor.
const RUG_OPACITY = 0.5;

/** Tassels along the two short ends of a rectangular rug. */
function Fringe({ x, y, w, h, color }: { x: number; y: number; w: number; h: number; color: string }) {
  const horizontal = w >= h; // fringe on the left/right ends of a wide rug
  const n = Math.max(3, Math.round((horizontal ? h : w) / 1.6));
  return (
    <G stroke={color} strokeWidth={0.55} strokeLinecap="round">
      {Array.from({ length: n }, (_, i) => {
        const t = (i + 0.5) / n;
        return horizontal ? (
          <G key={i}>
            <Line x1={x} y1={y + t * h} x2={x - 1.4} y2={y + t * h} />
            <Line x1={x + w} y1={y + t * h} x2={x + w + 1.4} y2={y + t * h} />
          </G>
        ) : (
          <G key={i}>
            <Line x1={x + t * w} y1={y} x2={x + t * w} y2={y - 1.4} />
            <Line x1={x + t * w} y1={y + h} x2={x + t * w} y2={y + h + 1.4} />
          </G>
        );
      })}
    </G>
  );
}

/** A woven rectangular rug: solid base, inset border band, a simple pattern and fringe. */
function RectRug({
  x, y, w, h, base, band, accent, pattern = 'diamond', fringe = true,
}: {
  x: number; y: number; w: number; h: number; base: string; band: string; accent: string;
  pattern?: 'diamond' | 'stripes' | 'dots'; fringe?: boolean;
}) {
  const cx = x + w / 2;
  const cy = y + h / 2;
  return (
    <G>
      {fringe && <Fringe x={x} y={y} w={w} h={h} color={band} />}
      <Rect x={x} y={y} width={w} height={h} rx={1.2} fill={base} />
      <Rect x={x + 1.4} y={y + 1.4} width={w - 2.8} height={h - 2.8} rx={0.8} fill="none" stroke={band} strokeWidth={1.1} />
      {pattern === 'diamond' && (
        <G>
          <Path d={`M${cx} ${cy - h * 0.26} L${cx + w * 0.2} ${cy} L${cx} ${cy + h * 0.26} L${cx - w * 0.2} ${cy} Z`} fill={band} />
          <Path d={`M${cx} ${cy - h * 0.13} L${cx + w * 0.1} ${cy} L${cx} ${cy + h * 0.13} L${cx - w * 0.1} ${cy} Z`} fill={accent} />
        </G>
      )}
      {pattern === 'stripes' &&
        Array.from({ length: 3 }, (_, i) =>
          w >= h ? (
            <Rect key={i} x={x + w * (0.3 + i * 0.2) - 0.8} y={y + 2.6} width={1.6} height={h - 5.2} rx={0.5} fill={i === 1 ? accent : band} />
          ) : (
            <Rect key={i} x={x + 2.6} y={y + h * (0.3 + i * 0.2) - 0.8} width={w - 5.2} height={1.6} rx={0.5} fill={i === 1 ? accent : band} />
          ),
        )}
      {pattern === 'dots' &&
        [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]].map(([dx, dy], i) => (
          <Circle key={i} cx={cx + dx * w * 0.2} cy={cy + dy * h * 0.2} r={0.9} fill={i === 2 ? accent : band} />
        ))}
    </G>
  );
}

/** A braided round rug: concentric rings. */
function BraidedRug({ cx, cy, r, colors }: { cx: number; cy: number; r: number; colors: string[] }) {
  return (
    <G>
      {colors.map((c, i) => (
        <Circle
          key={i}
          cx={cx}
          cy={cy}
          r={r * (1 - i / colors.length)}
          fill={c}
        />
      ))}
    </G>
  );
}

/** A fluffy bath mat with a scalloped edge. */
function BathMat({ cx, cy, w, h }: { cx: number; cy: number; w: number; h: number }) {
  const bumps = [];
  const nx = 6;
  const ny = 3;
  for (let i = 0; i < nx; i++) {
    const x = cx - w / 2 + ((i + 0.5) * w) / nx;
    bumps.push([x, cy - h / 2], [x, cy + h / 2]);
  }
  for (let j = 0; j < ny; j++) {
    const y = cy - h / 2 + ((j + 0.5) * h) / ny;
    bumps.push([cx - w / 2, y], [cx + w / 2, y]);
  }
  const r = w / nx / 2 + 0.3;
  return (
    <G>
      {bumps.map(([x, y], i) => (
        <Circle key={i} cx={x} cy={y} r={r} fill="#8CC6DA" />
      ))}
      <Rect x={cx - w / 2} y={cy - h / 2} width={w} height={h} rx={2} fill="#8CC6DA" />
      <Rect x={cx - w / 2 + 1.6} y={cy - h / 2 + 1.6} width={w - 3.2} height={h - 3.2} rx={1.4} fill="#B7DDEA" />
      {[-1, 0, 1].map((i) => (
        <Circle key={i} cx={cx + i * 3} cy={cy} r={0.8} fill="#FFFFFF" opacity={0.8} />
      ))}
    </G>
  );
}

function Rugs() {
  return (
    <G opacity={RUG_OPACITY}>
      {/* bedroom */}
      <RectRug x={9} y={25} w={22} h={11} base="#E7A2B6" band="#F6D2DC" accent="#D0788F" pattern="diamond" />
      {/* bathroom */}
      <BathMat cx={60} cy={31} w={13} h={7} />
      {/* kids' room: a bold star */}
      <Path d={star(100, 20, 9, 4.6)} fill="#F6C453" strokeLinejoin="round" />
      <Path d={star(100, 20, 5, 2.6)} fill="#FBDD8C" />
      {/* reading nook: braided */}
      <BraidedRug cx={100} cy={100} r={9} colors={['#9DBF7E', '#CFE2B4', '#B3D095', '#E3EED3', '#9DBF7E']} />
      {/* hallway runner */}
      <RectRug x={55} y={43} w={10} h={34} base="#D98A7E" band="#F1C0B2" accent="#B96A5E" pattern="stripes" />
      {/* sunroom: sun */}
      <G>
        {Array.from({ length: 12 }, (_, i) => {
          const t = (i * Math.PI) / 6;
          return (
            <Line key={i} x1={20 + Math.cos(t) * 9.4} y1={100 + Math.sin(t) * 9.4} x2={20 + Math.cos(t) * 12} y2={100 + Math.sin(t) * 12} stroke="#EDB548" strokeWidth={1.4} strokeLinecap="round" />
          );
        })}
        <Circle cx={20} cy={100} r={8} fill="#F6C453" />
        <Circle cx={20} cy={100} r={5} fill="#FBDD8C" />
      </G>
      {/* dining, under the table */}
      <RectRug x={45} y={85} w={30} h={30} base="#D99A85" band="#F0C6B6" accent="#C07E69" pattern="dots" fringe={false} />
      {/* kitchen runner */}
      <RectRug x={14} y={146} w={20} h={6} base="#EDBE5E" band="#F8DFA2" accent="#D69F3C" pattern="stripes" />
      {/* entry door mat */}
      <Rect x={52} y={150} width={15} height={7} rx={1.2} fill="#C99A62" />
      <Rect x={53.4} y={151.4} width={12.2} height={4.2} rx={0.6} fill="none" stroke="#B28550" strokeWidth={0.8} />
      {/* living room */}
      <RectRug x={86} y={133} w={28} h={14} base="#E5937A" band="#F6CDB9" accent="#C9735B" pattern="diamond" />
    </G>
  );
}

function Decor() {
  return (
    <G>
      <Plant x={36.5} y={36.5} />
      <Plant x={76.5} y={4} />
      <Plant x={4} y={44} />
      <Plant x={85} y={127} />
      <Plant x={44} y={155} s={1.1} />
      <Plant x={4} y={116} />
      <Plant x={115.5} y={87.5} />
      {/* kids: ball and blocks */}
      <Circle cx={88} cy={34} r={2.2} fill="#F28B82" stroke={C.outline} strokeWidth={0.45} />
      <Path d="M86 34 q2 -1.4 4 0" stroke="#FFFFFF" strokeWidth={0.6} fill="none" />
      <Rect x={106} y={33} width={3} height={3} rx={0.5} fill="#8FC1E3" stroke={C.outline} strokeWidth={0.4} />
      <Rect x={109.4} y={34} width={3} height={3} rx={0.5} fill="#A9D5A0" stroke={C.outline} strokeWidth={0.4} />
      {/* craft: yarn */}
      <Circle cx={106} cy={66} r={2} fill="#C7A6E3" stroke={C.outline} strokeWidth={0.45} />
      <Path d="M104.6 65.4 q1.4 1 2.8 -0.6 M104.8 66.8 q1.4 0.8 2.6 -0.4" stroke="#FFFFFF" strokeWidth={0.4} fill="none" />
      {/* laundry basket */}
      <Rect x={30} y={73} width={6} height={4.4} rx={1.4} fill="#E8CFA9" stroke={C.outline} strokeWidth={0.45} />
      <Path d="M31 74 q2 -1.6 4 0" stroke="#9CC5E8" strokeWidth={1.2} fill="none" />
      {/* sunroom plants */}
      <Plant x={4.5} y={88} s={1.1} />
      <Plant x={35.5} y={87.5} />
      <Fireplace />
      {/* hallway: a plant and a picture on the wall */}
      <Plant x={76} y={44} />
      <Rect x={62} y={40.6} width={7} height={4.4} rx={0.6} fill="#FFF6E6" stroke={C.outline} strokeWidth={0.45} />
      <Path d="M63 44.2 l2 -2.2 l1.6 1.4 l1.2 -1 l1.2 1.8 Z" fill="#9BD3A5" />
      <Circle cx={67.4} cy={42.2} r={0.7} fill="#F6C453" />
      <Lamp x={25} y={4} />
      <Lamp x={104} y={84} />
      <Lamp x={84} y={156} />
      <Lamp x={116} y={44} />
      <Lamp x={44} y={84} />
    </G>
  );
}

/** A little hearth tucked against the living room's right wall. */
function Fireplace() {
  const x = 115;
  const y = 122;
  return (
    <G>
      <Circle cx={x} cy={y + 7} r={11} fill="url(#hearthGlow)" />
      <Rect x={x} y={y} width={5} height={14} rx={1} fill="#D9927A" stroke={C.outline} strokeWidth={0.5} />
      <Rect x={x - 1} y={y - 0.6} width={1.6} height={15.2} rx={0.6} fill="#B98B64" stroke={C.outline} strokeWidth={0.4} />
      <Rect x={x + 1.4} y={y + 3.5} width={3.6} height={7} rx={1.6} fill="#5E4336" />
      <Path d={`M${x + 4.6} ${y + 4.5} Q${x + 1.6} ${y + 5.5} ${x + 2.4} ${y + 7} Q${x + 1.2} ${y + 8.5} ${x + 4.6} ${y + 9.5} Z`} fill="#F7B267" />
      <Path d={`M${x + 4.6} ${y + 5.8} Q${x + 3} ${y + 7} ${x + 4.6} ${y + 8.2} Z`} fill="#FFE08A" />
    </G>
  );
}

function HouseMapImpl({ width }: { width: number }) {
  const height = width / (VIEW.w / VIEW.h);
  return (
    <Svg width={width} height={height} viewBox={`${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`}>
      <Defs>
        <RadialGradient id="glow" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#FFE9A8" stopOpacity={0.55} />
          <Stop offset="1" stopColor="#FFE9A8" stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id="hearthGlow" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#FFC98A" stopOpacity={0.35} />
          <Stop offset="1" stopColor="#FFC98A" stopOpacity={0} />
        </RadialGradient>
        <Pattern id="planks" width={10} height={5} patternUnits="userSpaceOnUse">
          <Line x1={0} y1={4.9} x2={10} y2={4.9} stroke={C.outline} strokeWidth={0.25} opacity={0.12} />
          <Line x1={6} y1={0} x2={6} y2={4.9} stroke={C.outline} strokeWidth={0.2} opacity={0.08} />
        </Pattern>
        <Pattern id="tiles" width={5} height={5} patternUnits="userSpaceOnUse">
          <Rect x={0.25} y={0.25} width={4.5} height={4.5} rx={0.6} fill="#FFFFFF" opacity={0.35} />
        </Pattern>
        <Pattern id="paper" width={9} height={9} patternUnits="userSpaceOnUse">
          <Circle cx={1.2} cy={2} r={0.35} fill={C.outline} opacity={0.07} />
          <Circle cx={6.3} cy={1.1} r={0.25} fill={C.outline} opacity={0.06} />
          <Circle cx={4.1} cy={5.6} r={0.4} fill="#FFFFFF" opacity={0.25} />
          <Circle cx={7.8} cy={7.2} r={0.3} fill={C.outline} opacity={0.06} />
          <Circle cx={2.5} cy={7.9} r={0.25} fill="#FFFFFF" opacity={0.3} />
        </Pattern>
      </Defs>

      {/* ground shadow + dollhouse shell */}
      <Rect x={-OUTER + 1.5} y={-OUTER + 3} width={W + OUTER * 2} height={H + OUTER * 2 + FRONT} rx={5} fill={C.shadow} />
      <Rect x={-OUTER} y={H} width={W + OUTER * 2} height={OUTER + FRONT} rx={4} fill={C.wallFace} stroke={C.outline} strokeWidth={0.7} />
      <Rect x={-OUTER} y={-OUTER} width={W + OUTER * 2} height={H + OUTER * 2} rx={4} fill={C.wallTop} stroke={C.outline} strokeWidth={0.7} />

      {/* floors */}
      {ROOMS.map((r) => {
        const x = r.bx * ROOM_SIZE * U;
        const y = r.by * ROOM_SIZE * U;
        const w = r.bw * ROOM_SIZE * U;
        const h = r.bh * ROOM_SIZE * U;
        return (
          <G key={r.id}>
            <Rect x={x} y={y} width={w} height={h} fill={r.floor} />
            <Rect x={x} y={y} width={w} height={h} fill={TILED_ROOMS.includes(r.id) ? 'url(#tiles)' : 'url(#planks)'} />
          </G>
        );
      })}
      <Rugs />

      {/* wall faces: the tilt shows the front of every horizontal wall */}
      <Rect x={0} y={0} width={W} height={FACE} fill={C.wallFace} />
      {WALLS.horizontal.map((s, i) => (
        <Rect key={i} x={s.x1 * U} y={s.y1 * U + WALL} width={(s.x2 - s.x1) * U} height={FACE - 0.6} fill={C.wallFace} />
      ))}

      {/* wall tops */}
      {WALLS.horizontal.map((s, i) => (
        <Rect
          key={i}
          x={s.x1 * U - (s.x1 === 0 ? 0 : WALL)}
          y={s.y1 * U - WALL}
          width={(s.x2 - s.x1) * U + (s.x1 === 0 ? 0 : WALL) + (s.x2 === MAP_W ? 0 : WALL)}
          height={WALL * 2}
          rx={WALL}
          fill={C.wallTop}
          stroke={C.outline}
          strokeWidth={0.5}
        />
      ))}
      {WALLS.vertical.map((s, i) => (
        <Rect
          key={i}
          x={s.x1 * U - WALL}
          y={s.y1 * U - (s.y1 === 0 ? 0 : WALL)}
          width={WALL * 2}
          height={(s.y2 - s.y1) * U + (s.y1 === 0 ? 0 : WALL) + (s.y2 === MAP_H ? 0 : WALL)}
          rx={WALL}
          fill={C.wallTop}
          stroke={C.outline}
          strokeWidth={0.5}
        />
      ))}
      {/* inner edge of the outer wall */}
      <Rect x={0} y={0} width={W} height={H} fill="none" stroke={C.outline} strokeWidth={0.5} />

      {/* windows and the front door */}
      <Window x={25} y={-OUTER + 0.4} w={9} h={OUTER - 0.8} />
      <Window x={86} y={-OUTER + 0.4} w={9} h={OUTER - 0.8} />
      <Window x={-OUTER + 0.4} y={45} w={OUTER - 0.8} h={9} />
      <Window x={-OUTER + 0.4} y={126} w={OUTER - 0.8} h={9} />
      <Window x={W + 0.4} y={86} w={OUTER - 0.8} h={9} />
      <Window x={W + 0.4} y={126} w={OUTER - 0.8} h={9} />
      <Rect x={54} y={H - 0.4} width={12} height={OUTER + FRONT - 1.2} rx={1.2} fill="#E3A07A" stroke={C.outline} strokeWidth={0.55} />
      <Circle cx={63.5} cy={H + 5} r={0.7} fill="#FFE08A" stroke={C.outline} strokeWidth={0.3} />

      {BLOCKING_FURNITURE.map((f, i) => (
        <FurniturePiece key={i} f={f} />
      ))}
      <Decor />

      {/* room name tags */}
      {ROOMS.map((r) => {
        const cx = (r.bx + r.bw / 2) * ROOM_SIZE * U;
        const cy = (r.by + r.bh / 2 + (LABEL_DY[r.id] ?? 0)) * ROOM_SIZE * U;
        const w = r.label.length * LABEL_SIZE * 0.5 + 3.4;
        const h = LABEL_SIZE + 1.8;
        return (
          <G key={r.id}>
            <Rect x={cx - w / 2} y={cy - h / 2} width={w} height={h} rx={h / 2} fill="#FFF9F0" opacity={0.45} />
            <SvgText
              x={cx}
              y={cy + LABEL_SIZE * 0.36}
              fontSize={LABEL_SIZE}
              textAnchor="middle"
              fill={C.inkSoft}
              fontFamily={FONT.semibold}
            >
              {r.label}
            </SvgText>
          </G>
        );
      })}

      {/* paper grain over everything */}
      <Rect x={VIEW.x} y={VIEW.y} width={VIEW.w} height={VIEW.h} fill="url(#paper)" />
    </Svg>
  );
}

export const HouseMap = memo(HouseMapImpl);
