# Snail House 🐌

A cute snail crawls toward you through a cozy house, forever — even while the app is closed.
Check in, walk away, come back tomorrow. If it touches you, your streak ends.

Expo SDK 57 · React Native · TypeScript · local-only (AsyncStorage + local notifications).

## Run it

Requires **Node 20.19+** (Expo SDK 57 won't run on Node 18).

```bash
npm install
npx expo start        # scan the QR code with Expo Go, or press i / a for a simulator
npm test              # game-logic tests
npm run typecheck
```

## How it works

| File | What it does |
| --- | --- |
| `src/game/map.ts` | 12×16 tile grid, rooms, explicit doorway list, walls on tile edges, blocking furniture |
| `src/game/pathfinding.ts` | BFS, shortest paths, map diameter, farthest tile |
| `src/game/constants.ts` | `MAX_LEAD_HOURS = 40`, `SNAIL_STEP_MS = 40h / diameter` |
| `src/game/simulation.ts` | Pure `advance(state, now)`, catch detection, safety time, `movePlayer` |
| `src/clock.ts` | Game clock (debug speed multiplier) |
| `src/storage.ts` / `src/notifications.ts` / `src/sound.ts` | Save/load, scheduled warnings, sound + haptics |
| `src/ui/*` | House art (SVG), characters, board, screens |

## The house

```
Bedroom ─── Bathroom ─── Kids' Room
   │                         │
Laundry      Hallway ──── Craft Room
   │           │             │
   │           │             │
Sunroom ──── Dining     Reading Nook
   │           │             │
Kitchen ── Entry Hall ── Living Room
```

Every room is one 4×4 block, and every doorway is 2 tiles wide and centered.
The middle rooms (Hallway, Dining) are a partial shortcut, with no Bathroom→Hallway door. So where
you leave the snail matters: in a corner you're safe for up to **40h**, in the middle only
**25h**. The snail steps every **100 minutes** (the map's diameter is 24 tiles).

## Strawberries 🍓

There are two scores: your **streak** (days survived) and **strawberries** collected.
- There is only ever one strawberry on the map. Walk over it to collect it.
- The next one appears **3 hours** after the last one is gone (`TOKEN_RESPAWN_MS`), at a
  random spot at least 5 tiles from you. So checking in more often gets you more strawberries.
- If the snail crawls over a strawberry first, it eats it.
- Strawberry spawns are seeded and handled inside `advance()`, so they stay deterministic
  offline too.

## Ghostie

Ghostie is the one character with a movement ability: it flies in a straight line to any
walkable destination instead of following doors and hallways. While crossing a closed wall
or blocking furniture, Ghostie fades translucent, then returns to normal on clear floor.

The tests in `src/game/__tests__` check that:
- there are no dead ends (removing any single tile, i.e. the snail, never cuts the house apart)
- only the listed doorways exist, each 2 tiles wide
- the snail's position matters: 40h lead from a corner, much less from the middle
- strawberries spawn, get collected, respawn after 3h, and get eaten by the snail
- the maximum possible lead is exactly 40h, and a new run starts at exactly 40h
- `advance()` gives the same result called once or every minute
- death time is right when the app is reopened long after the catch
- a player who checks in daily survives indefinitely

## Debug menu

**Long-press the safety timer** (about 1 second) to open it. It has:
- time speed: 1×, 60×, or 3600× (a full 40h run takes about 40s)
- move the snail to one tile away
- spawn a strawberry now
- start a new run
- reset everything

## Notes

- One notification is rescheduled after every move, 1h before the catch.
  Local notifications work in Expo Go.
- `react-dom` / `react-native-web` are installed only for quick previews in a browser (`npx expo start --web`).
- The game trusts the device clock. Setting the clock back would buy extra time.
