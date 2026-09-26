import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { gameNow, getClock, setSpeed } from '../clock';
import { MAP_DIAMETER, SNAIL_STEP_MS } from '../game/constants';
import { NEIGHBORS } from '../game/map';
import { GameState, advance } from '../game/simulation';
import { C, FONT } from './theme';

const SPEEDS = [1, 60, 3600];

interface Props {
  visible: boolean;
  game: GameState;
  onClose: () => void;
  onGame: (next: GameState) => void;
  onNewRun: () => void;
  onResetAll: () => void;
}

/** Hidden dev tools: long-press the safety timer to open. */
export function DebugMenu({ visible, game, onClose, onGame, onNewRun, onResetAll }: Props) {
  const [speed, setSpeedState] = useState(getClock().speed);

  function pickSpeed(s: number) {
    setSpeed(s);
    setSpeedState(s);
    onGame(advance(game, gameNow())); // persists the new clock
  }

  function snailAdjacent() {
    const now = gameNow();
    const g = advance(game, now);
    if (!g.alive) return;
    const next = NEIGHBORS[g.playerTile][0];
    onGame({ ...g, snailTile: next, snailLastStepTime: now, snailTrail: [] });
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card}>
          <Text style={styles.title}>🛠 Debug</Text>
          <Text style={styles.info}>
            Diameter {MAP_DIAMETER} tiles · step {(SNAIL_STEP_MS / 60000).toFixed(0)} min
          </Text>
          <Text style={styles.section}>Time speed</Text>
          <View style={styles.row}>
            {SPEEDS.map((s) => (
              <Pressable key={s} onPress={() => pickSpeed(s)} style={[styles.chip, speed === s && styles.chipOn]}>
                <Text style={styles.chipText}>{s}×</Text>
              </Pressable>
            ))}
          </View>
          <Btn label="Snail one tile away" onPress={snailAdjacent} />
          <Btn
            label="Strawberry now"
            onPress={() => {
              const g = advance(game, gameNow());
              if (g.alive && g.tokenTile === null) onGame(advance({ ...g, tokenSpawnAt: gameNow() }, gameNow()));
              onClose();
            }}
          />
          <Btn label="Start a new run" onPress={() => (onNewRun(), onClose())} />
          <Btn label="Reset everything (onboarding)" onPress={() => (onResetAll(), onClose())} />
          <Btn label="Close" onPress={onClose} muted />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Btn({ label, onPress, muted }: { label: string; onPress: () => void; muted?: boolean }) {
  return (
    <Pressable onPress={onPress} style={[styles.btn, muted && { backgroundColor: C.paperDeep }]}>
      <Text style={styles.btnText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(60,40,30,0.35)', justifyContent: 'center', padding: 24 },
  card: { backgroundColor: C.paper, borderRadius: 24, padding: 20, borderWidth: 2.5, borderColor: C.outline, gap: 10 },
  title: { fontFamily: FONT.heavy, fontSize: 24, color: C.ink },
  info: { fontFamily: FONT.regular, fontSize: 14, color: C.inkSoft },
  section: { fontFamily: FONT.bold, fontSize: 16, color: C.ink, marginTop: 4 },
  row: { flexDirection: 'row', gap: 8 },
  chip: { flex: 1, paddingVertical: 8, borderRadius: 14, borderWidth: 2, borderColor: C.outline, alignItems: 'center', backgroundColor: '#fff' },
  chipOn: { backgroundColor: C.safe },
  chipText: { fontFamily: FONT.bold, fontSize: 16, color: C.ink },
  btn: { paddingVertical: 10, borderRadius: 14, borderWidth: 2, borderColor: C.outline, alignItems: 'center', backgroundColor: '#fff' },
  btnText: { fontFamily: FONT.bold, fontSize: 16, color: C.ink },
});
