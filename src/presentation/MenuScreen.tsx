import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { GameSnapshot } from '../domain/types';
import type { PlayerProgress } from '../infrastructure/ProgressRepository';
import { GameCanvas } from './GameCanvas';

interface MenuScreenProps {
  readonly progress: PlayerProgress;
  readonly onPlay: () => void;
  readonly onHangar: () => void;
  readonly onParents: () => void;
}

const BASE_MENU_SNAPSHOT: GameSnapshot = {
  phase: 'ready', elapsedSeconds: 0,
  ship: { x: 0, y: 0.32, hearts: 3, shieldSeconds: 0, magnetSeconds: 0, weapon: 'triple-shot', weaponSeconds: 8 },
  entities: [
    { id: 'menu-4', kind: 'enemy', archetype: 'number-drone', x: -0.58, y: -0.05, z: 0.63, radius: 0.2, color: '#36A8FF', label: '4', correct: false, shootable: true, health: 1, maxHealth: 1 },
    { id: 'menu-5', kind: 'enemy', archetype: 'zigzag-alien', x: 0, y: 0.03, z: 0.58, radius: 0.2, color: '#73E632', label: '5', correct: true, shootable: true, health: 1, maxHealth: 1 },
    { id: 'menu-6', kind: 'enemy', archetype: 'bomber-alien', x: 0.58, y: -0.02, z: 0.66, radius: 0.2, color: '#FF8B20', label: '6', correct: false, shootable: true, health: 1, maxHealth: 1 },
    { id: 'menu-h1', kind: 'hazard', x: -0.84, y: 0.4, z: 0.4, radius: 0.13, color: '#FF472E' },
    { id: 'menu-h2', kind: 'hazard', x: 0.82, y: 0.47, z: 0.48, radius: 0.13, color: '#8D2CFF' },
    { id: 'menu-power', kind: 'powerUp', powerUp: 'triple-shot', x: 0.7, y: -0.25, z: 0.72, radius: 0.13, color: '#50E8FF', label: '3X' },
  ],
  challenge: { id: 'menu', kind: 'addition', prompt: 'Solve 2 + 3', answer: 5, targetCount: 1, progress: 0, mathLevel: 1 },
  score: 3850, stars: 8, combo: 3, bestCombo: 5, shotsFired: 14, shotsHit: 12, accuracy: 12 / 14, collisions: 1,
  challengeNumber: 4, totalChallenges: 10, lockTargetId: 'menu-5', lockProgress: 0.78, lockIsCorrect: true,
  bossHealth: 3, bossMaxHealth: 3, bossStage: 1, feedback: null,
  laser: { x: 0, y: 0.03, z: 0.58, seconds: 0.3, beams: 3 },
  shieldCharges: 2, magnetCharges: 2, waveName: 'Alien ambush', wavePattern: 'alien-ambush', screenShake: 0, reward: null,
};

export const MenuScreen = ({ progress, onPlay, onHangar, onParents }: MenuScreenProps) => {
  const [previewSeconds, setPreviewSeconds] = useState(0);
  const frameRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    const tick = (timestamp: number) => {
      const start = startRef.current ?? timestamp;
      startRef.current = start;
      setPreviewSeconds((timestamp - start) / 1000);
      frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => { if (frameRef.current !== null) cancelAnimationFrame(frameRef.current); };
  }, []);

  const snapshot = useMemo<GameSnapshot>(() => ({
    ...BASE_MENU_SNAPSHOT,
    elapsedSeconds: previewSeconds,
    ship: { ...BASE_MENU_SNAPSHOT.ship, x: Math.sin(previewSeconds * 0.55) * 0.16, shieldSeconds: previewSeconds % 9 > 7.2 ? 1 : 0, weaponSeconds: 8 },
    screenShake: previewSeconds % 4 < 0.2 ? 0.2 : 0,
    laser: previewSeconds % 3.8 < 0.55 ? BASE_MENU_SNAPSHOT.laser : null,
  }), [previewSeconds]);

  return (
    <View style={styles.background}>
      <GameCanvas snapshot={snapshot} />
      <View pointerEvents="none" style={styles.topShade} />
      <View pointerEvents="none" style={styles.logoPanel}>
        <Text style={styles.number}>NUMBER</Text><Text style={styles.nova}>NOVA</Text><Text style={styles.tagline}>SPACE MATH BATTLE</Text><View style={styles.logoOrbit} />
      </View>
      <View style={styles.actionPanel}>
        <Text style={styles.eyebrow}>THE GALAXY NEEDS A PILOT</Text>
        <Text style={styles.hero}>Choose your next planet</Text>
        <Text style={styles.subhero}>Fly real missions that adapt to what the child knows, review older skills, and keep the battles exciting.</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Choose mission" onPress={onPlay} style={({ pressed }: { pressed: boolean }) => [styles.playButton, pressed && styles.pressed]}>
          <View style={styles.playTriangle} /><Text style={styles.playText}>CHOOSE MISSION</Text>
        </Pressable>
        <Pressable onPress={onHangar} style={styles.hangarButton}><Text style={styles.hangarText}>CUSTOMIZE SHIP</Text></Pressable>
        <View style={styles.statsRow}>
          <View style={styles.stat}><Text style={styles.statValue}>{progress.missionsCompleted}</Text><Text style={styles.statLabel}>PLANETS</Text></View><View style={styles.statDivider} />
          <View style={styles.stat}><Text style={styles.statValue}>{Math.max(1, progress.highestMathLevel)}</Text><Text style={styles.statLabel}>MATH LEVEL</Text></View><View style={styles.statDivider} />
          <View style={styles.stat}><Text style={styles.statValue}>{progress.unlockedRewards.length}</Text><Text style={styles.statLabel}>REWARDS</Text></View>
        </View>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Hold for Parents"
        accessibilityHint="Hold to open the parent dashboard"
        testID="parent-access"
        hitSlop={12}
        onLongPress={onParents}
        delayLongPress={500}
        style={styles.parentButton}
      >
        <Text style={styles.parentText}>Hold for Parents</Text>
      </Pressable>
      <Text style={styles.version}>MASTERY LEARNING • OFFLINE • NO ADS • KID SAFE</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: '#02031A' }, topShade: { ...StyleSheet.absoluteFillObject, backgroundColor: '#02031A16' },
  logoPanel: { position: 'absolute', left: 38, top: 35, width: 280, alignItems: 'center', transform: [{ rotate: '-4deg' }] },
  number: { color: '#FFE34B', fontSize: 48, lineHeight: 50, fontWeight: '900', letterSpacing: 2, textShadowColor: '#FF6A00', textShadowOffset: { width: 0, height: 4 }, textShadowRadius: 7, zIndex: 3 },
  nova: { color: '#6BE8FF', fontSize: 84, lineHeight: 84, fontWeight: '900', letterSpacing: 3, textShadowColor: '#294CFF', textShadowOffset: { width: 1, height: 6 }, textShadowRadius: 13, zIndex: 3 },
  tagline: { color: '#FFFFFF', fontSize: 14, fontWeight: '900', letterSpacing: 2.2, marginTop: 8, zIndex: 3 },
  logoOrbit: { position: 'absolute', left: 0, right: 0, bottom: 13, height: 48, borderWidth: 6, borderColor: '#C752FFCC', borderRadius: 100, transform: [{ rotate: '-7deg' }] },
  actionPanel: { position: 'absolute', right: 42, bottom: 32, width: '40%', minWidth: 450, maxWidth: 640, alignItems: 'center', borderRadius: 34, borderWidth: 3, borderColor: '#39D6FF', backgroundColor: '#06113DEC', paddingHorizontal: 34, paddingVertical: 20 },
  eyebrow: { color: '#FFE85A', fontSize: 12, fontWeight: '900', letterSpacing: 1.8 }, hero: { color: '#FFFFFF', fontSize: 34, lineHeight: 39, fontWeight: '900', textAlign: 'center', marginTop: 2 },
  subhero: { color: '#C8D8FF', fontSize: 15, lineHeight: 21, fontWeight: '600', textAlign: 'center', marginTop: 5, maxWidth: 480 },
  playButton: { minWidth: 310, height: 68, marginTop: 16, borderRadius: 34, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FF552D', borderWidth: 4, borderColor: '#FFD64C' },
  pressed: { transform: [{ scale: 0.97 }] }, playTriangle: { width: 0, height: 0, borderTopWidth: 12, borderBottomWidth: 12, borderLeftWidth: 20, borderTopColor: 'transparent', borderBottomColor: 'transparent', borderLeftColor: '#FFFFFF', marginRight: 14 },
  playText: { color: '#FFFFFF', fontSize: 21, fontWeight: '900', letterSpacing: 1.1 },
  hangarButton: { marginTop: 9, borderRadius: 16, borderWidth: 1, borderColor: '#6E83BC', paddingHorizontal: 22, paddingVertical: 9 }, hangarText: { color: '#BFE9FF', fontSize: 12, fontWeight: '900', letterSpacing: 0.8 },
  statsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 13 }, stat: { minWidth: 104, alignItems: 'center' }, statValue: { color: '#FFE153', fontSize: 20, fontWeight: '900' }, statLabel: { color: '#A7B9E9', fontSize: 10, fontWeight: '900', letterSpacing: 1 }, statDivider: { width: 1, height: 32, backgroundColor: '#52679B', marginHorizontal: 8 },
  parentButton: { position: 'absolute', left: 28, bottom: 26, zIndex: 10, borderRadius: 17, borderWidth: 2, borderColor: '#6574A8', backgroundColor: '#080E32CC', paddingHorizontal: 18, paddingVertical: 10 }, parentText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  version: { position: 'absolute', right: 30, bottom: 15, color: '#8293C2', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
});
