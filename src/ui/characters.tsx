import React from 'react';
import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';

import { BlobColor, C } from './theme';

export type Mood = 'happy' | 'sleepy' | 'hugged';

export interface CharacterDef {
  id: string;
  name: string;
}

export const CHARACTERS: CharacterDef[] = [
  { id: 'blob', name: 'Blob' },
  { id: 'bunny', name: 'Bunny' },
  { id: 'kitty', name: 'Kitty' },
  { id: 'sprout', name: 'Sprout' },
  { id: 'ghostie', name: 'Ghostie' },
  { id: 'chick', name: 'Chick' },
];

export const characterDef = (id: string | undefined) => CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[0];

interface CharacterProps {
  kind?: string;
  color: BlobColor;
  size: number;
  mood?: Mood;
}

const line = { stroke: C.outline, strokeWidth: 2, strokeLinejoin: 'round' as const };
const BLUSH = '#F59AA0';

// A plump round body shared by most characters; `top` lowers the crown for ears/leaves.
const roundBody = (top: number) =>
  `M20 ${top} C31 ${top} 35 ${top + 9} 35 ${top + 17} C35 30.5 29 34 20 34 C11 34 5 30.5 5 ${top + 17} C5 ${top + 9} 9 ${top} 20 ${top} Z`;

const GHOST_BODY =
  'M6 21 C6 11 12 5 20 5 C28 5 34 11 34 21 L34 33 Q31.5 30.5 29 33 Q26.5 35.5 24 33 Q21.5 30.5 19 33 Q16.5 35.5 14 33 Q11.5 30.5 9 33 Q7.5 34.5 6 33 Z';

/** The player. Several original characters, each tinted by the chosen color. 40×40 box. */
export function CharacterArt({ kind = 'blob', color, size, mood = 'happy' }: CharacterProps) {
  const ghost = kind === 'ghostie';
  const top = kind === 'bunny' ? 11 : kind === 'kitty' ? 9 : kind === 'sprout' ? 9 : 6;
  const eyeY = kind === 'bunny' ? 22 : kind === 'kitty' || kind === 'sprout' ? 21 : 19.5;
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Ellipse cx={20} cy={36.5} rx={ghost ? 9 : 12} ry={ghost ? 2 : 2.6} fill={C.shadow} />

      {/* behind the body */}
      {kind === 'bunny' && (
        <G>
          <Ellipse cx={14} cy={8} rx={3.6} ry={7.5} fill={color.body} {...line} transform="rotate(-14 14 8)" />
          <Ellipse cx={26} cy={8} rx={3.6} ry={7.5} fill={color.body} {...line} transform="rotate(14 26 8)" />
          <Ellipse cx={14} cy={8.5} rx={1.6} ry={5} fill={BLUSH} opacity={0.6} transform="rotate(-14 14 8.5)" />
          <Ellipse cx={26} cy={8.5} rx={1.6} ry={5} fill={BLUSH} opacity={0.6} transform="rotate(14 26 8.5)" />
        </G>
      )}
      {kind === 'kitty' && (
        <G>
          <Path d="M7.5 17 L9 3.5 L18 10 Z" fill={color.body} {...line} />
          <Path d="M32.5 17 L31 3.5 L22 10 Z" fill={color.body} {...line} />
          <Path d="M10 12 L10.8 6.5 L14.6 9.4 Z" fill={BLUSH} opacity={0.6} />
          <Path d="M30 12 L29.2 6.5 L25.4 9.4 Z" fill={BLUSH} opacity={0.6} />
        </G>
      )}
      {kind === 'chick' && (
        <G>
          <Ellipse cx={5.5} cy={23} rx={3.4} ry={2.2} fill={color.shade} {...line} strokeWidth={1.6} transform="rotate(-30 5.5 23)" />
          <Ellipse cx={34.5} cy={23} rx={3.4} ry={2.2} fill={color.shade} {...line} strokeWidth={1.6} transform="rotate(30 34.5 23)" />
        </G>
      )}

      {/* feet */}
      {!ghost && (
        <G>
          <Ellipse cx={13.5} cy={34} rx={4.2} ry={2.8} fill={kind === 'chick' ? '#F4A261' : color.shade} stroke={C.outline} strokeWidth={1.6} />
          <Ellipse cx={26.5} cy={34} rx={4.2} ry={2.8} fill={kind === 'chick' ? '#F4A261' : color.shade} stroke={C.outline} strokeWidth={1.6} />
        </G>
      )}

      {/* body */}
      <Path d={ghost ? GHOST_BODY : roundBody(top)} fill={color.body} {...line} />
      {!ghost && (
        <Path d="M8 25 C11 31 29 31 32 25 C31 30.5 26 32.6 20 32.6 C14 32.6 9 30.5 8 25 Z" fill={color.shade} opacity={0.55} />
      )}
      <Ellipse cx={13} cy={top + 6.5} rx={3.2} ry={2} fill="#fff" opacity={0.7} transform={`rotate(-30 13 ${top + 6.5})`} />

      {/* on top */}
      {kind === 'sprout' && (
        <G>
          <Path d="M20 9.5 Q19.5 5.5 20.5 3" stroke="#6FAE7B" strokeWidth={1.8} strokeLinecap="round" fill="none" />
          <Path d="M20.5 4 C17 0.5 12.5 1.5 12 4.5 C15 6.5 18.5 6 20.5 4 Z" fill="#9BD3A5" {...line} strokeWidth={1.4} />
          <Path d="M20.5 4 C23.5 0 28 0.8 28.8 3.8 C26 6.2 22.5 6 20.5 4 Z" fill="#9BD3A5" {...line} strokeWidth={1.4} />
        </G>
      )}
      {kind === 'chick' && (
        <Path d="M18 6.5 Q18.5 2.5 20 5.8 Q21 1.5 22.3 6.3" stroke={C.outline} strokeWidth={1.5} strokeLinecap="round" fill="none" />
      )}

      <Face mood={mood} eyeY={eyeY} mouth={kind === 'kitty' ? 'cat' : kind === 'chick' ? 'beak' : kind === 'ghostie' ? 'oh' : 'smile'} />
      {kind === 'kitty' && (
        <G stroke={C.outline} strokeWidth={0.8} strokeLinecap="round">
          <Path d="M5 23.5 L9.5 24.2 M5.5 26.5 L9.5 25.6" />
          <Path d="M35 23.5 L30.5 24.2 M34.5 26.5 L30.5 25.6" />
        </G>
      )}
    </Svg>
  );
}

function Face({ mood, eyeY, mouth }: { mood: Mood; eyeY: number; mouth: 'smile' | 'cat' | 'beak' | 'oh' }) {
  const m = eyeY + 4;
  return (
    <G>
      {mood === 'sleepy' ? (
        <G stroke={C.outline} strokeWidth={1.6} strokeLinecap="round" fill="none">
          <Path d={`M13 ${eyeY + 0.5} q2 1.6 4 0`} />
          <Path d={`M23 ${eyeY + 0.5} q2 1.6 4 0`} />
        </G>
      ) : mood === 'hugged' ? (
        <G stroke={C.outline} strokeWidth={1.6} strokeLinecap="round" fill="none">
          <Path d={`M13 ${eyeY + 1} q2 -2.2 4 0`} />
          <Path d={`M23 ${eyeY + 1} q2 -2.2 4 0`} />
        </G>
      ) : (
        <G fill={C.outline}>
          <Ellipse cx={15} cy={eyeY} rx={1.7} ry={2.2} />
          <Ellipse cx={25} cy={eyeY} rx={1.7} ry={2.2} />
          <Circle cx={15.5} cy={eyeY - 0.8} r={0.6} fill="#fff" />
          <Circle cx={25.5} cy={eyeY - 0.8} r={0.6} fill="#fff" />
        </G>
      )}
      {mouth === 'smile' && <Path d={`M18 ${m} q2 1.8 4 0`} stroke={C.outline} strokeWidth={1.5} strokeLinecap="round" fill="none" />}
      {mouth === 'cat' && (
        <Path d={`M17.6 ${m - 0.4} q1.2 1.6 2.4 0 q1.2 1.6 2.4 0`} stroke={C.outline} strokeWidth={1.3} strokeLinecap="round" fill="none" />
      )}
      {mouth === 'beak' && <Path d={`M17.8 ${m - 1.2} L22.2 ${m - 1.2} L20 ${m + 1.2} Z`} fill="#F4A261" stroke={C.outline} strokeWidth={1.1} strokeLinejoin="round" />}
      {mouth === 'oh' && <Ellipse cx={20} cy={m + 0.2} rx={1.3} ry={1.6} fill={C.outline} />}
      <Ellipse cx={11.5} cy={m} rx={2.4} ry={1.4} fill={BLUSH} opacity={0.55} />
      <Ellipse cx={28.5} cy={m} rx={2.4} ry={1.4} fill={BLUSH} opacity={0.55} />
    </G>
  );
}

const SHELL = '#F4A261';
const SHELL_DEEP = '#E07A4F';
const SNAIL_BODY = '#FFE3B0';
const SNAIL_BODY_SHADE = '#F2C98A';

/** The snail: round, cheerful, relentless. Faces right. Drawn in a 48×40 box. */
export function SnailArt({ size }: { size: number }) {
  return (
    <Svg width={size * 1.2} height={size} viewBox="0 0 48 40">
      <Ellipse cx={24} cy={36.5} rx={19} ry={2.6} fill={C.shadow} />
      {/* foot / body */}
      <Path
        d="M4 34 C4 30 10 29 18 29 L34 29 C36 22 36 14 40 12 C45 10 47 15 46 21 C45 27 44 34 36 34 Z"
        fill={SNAIL_BODY}
        stroke={C.outline}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <Path d="M6 33.4 C10 31.5 30 31.5 38 33" stroke={SNAIL_BODY_SHADE} strokeWidth={2} fill="none" strokeLinecap="round" />
      {/* eye stalks */}
      <Path d="M39 13 L37 5" stroke={C.outline} strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M43 12.5 L44.5 5" stroke={C.outline} strokeWidth={1.8} strokeLinecap="round" />
      <Circle cx={37} cy={4.5} r={2.4} fill={SNAIL_BODY} stroke={C.outline} strokeWidth={1.6} />
      <Circle cx={44.5} cy={4.5} r={2.4} fill={SNAIL_BODY} stroke={C.outline} strokeWidth={1.6} />
      <Circle cx={37.5} cy={4.7} r={1} fill={C.outline} />
      <Circle cx={45} cy={4.7} r={1} fill={C.outline} />
      {/* smile + blush */}
      <Path d="M39.5 19 q2.4 2.6 5 0" stroke={C.outline} strokeWidth={1.5} strokeLinecap="round" fill="none" />
      <Ellipse cx={39} cy={17.2} rx={1.6} ry={1} fill="#F59AA0" opacity={0.7} />
      {/* shell */}
      <Circle cx={21} cy={19} r={12.5} fill={SHELL} stroke={C.outline} strokeWidth={2} />
      <Path
        d="M21 19 m0 0 c1.8 0 2.8 1.6 2.4 3 c-0.6 2.2 -3.6 2.6 -5.2 1.2 c-2.4 -2 -1.4 -6 1.4 -7 c3.8 -1.4 7.6 1.4 7.6 5.4 c0 4.6 -4.4 7.8 -8.8 6.8 c-5 -1.2 -7.2 -6.8 -5 -11.2 c2 -4.2 7 -6 11.2 -4.4"
        stroke={SHELL_DEEP}
        strokeWidth={1.8}
        fill="none"
        strokeLinecap="round"
      />
      <Ellipse cx={15} cy={11.5} rx={3.2} ry={1.8} fill="#fff" opacity={0.55} transform="rotate(-35 15 11.5)" />
    </Svg>
  );
}

/** The collectible: a plump, shiny strawberry. Drawn in a 24×24 box. */
export function StrawberryArt({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Ellipse cx={12} cy={22} rx={6} ry={1.4} fill={C.shadow} />
      <Path
        d="M12 21 C6.5 19.5 3.6 14 4.4 10.2 C5 7.6 8 6.8 12 6.8 C16 6.8 19 7.6 19.6 10.2 C20.4 14 17.5 19.5 12 21 Z"
        fill="#F2727A"
        stroke={C.outline}
        strokeWidth={1.4}
        strokeLinejoin="round"
      />
      {[[8, 11], [12, 10.2], [16, 11], [9.8, 14.4], [14.2, 14.4], [12, 17.6]].map(([x, y], i) => (
        <Ellipse key={i} cx={x} cy={y} rx={0.55} ry={0.8} fill="#FFE3A3" />
      ))}
      <Path
        d="M12 7.6 L8.2 5.6 L10.4 8.4 L7.4 8.6 L12 9.6 L16.6 8.6 L13.6 8.4 L15.8 5.6 Z"
        fill="#8CC79A"
        stroke={C.outline}
        strokeWidth={1}
        strokeLinejoin="round"
      />
      <Path d="M12 7.4 Q12.2 4.6 13.6 3.4" stroke={C.outline} strokeWidth={1.2} strokeLinecap="round" fill="none" />
      <Ellipse cx={8.2} cy={12.6} rx={1.2} ry={2} fill="#fff" opacity={0.55} transform="rotate(20 8.2 12.6)" />
    </Svg>
  );
}
