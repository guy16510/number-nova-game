import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { GameSnapshot } from '../domain/types';
import type { PlayerProgress } from '../infrastructure/ProgressRepository';
import { GameCanvas } from './GameCanvas';

interface MenuScreenProps {
  readonly progress: PlayerProgress;
  readonly onPlay: () => void;
  readonly onParents: () => void;
}

const BASE_MENU_SNAPSHOT: GameSnapshot = {
  phase: 'ready',
  elapsedSeconds: 0,
  ship: { x: 0, y: 0.32, hearts: 3, shieldSeconds: 0, magnetSeconds: 0 },
  entities: [
    { id: 'menu-4', kind: 'answer', x: -0.58, y: -0.05, z: 0.63, radius: 0.2, color: '#36A8FF', label: '4', correct: false },
    { id: 'menu-5', kind: 'answer', x: 0, y: 0.03, z: 0.58, radius: 0.2, color: '#73E632', label: '5', correct: true },
    { id: 'menu-6', kind: 'answer', x: 0.58, y: -0.02, z: 0.66, radius: 0.2, color: '#FF8B20', label: '6', correct: false },
    { id: 'menu-h1', kind: 'hazard', x: -0.84, y: 0.4, z: 0.4, radius: 0.13, color: '#FF472E' },
    { id: 'menu-h2', kind: 'hazard', x: 0.82, y: 0.47, z: 0.48, radius: 0.13, color: '#8D2CFF' },
    { id: 'menu-h3', kind: 'hazard', x: 0.7, y: -0.32, z: 0.7, radius: 0.1, color: '#FF472E' },
  ],
  challenge: { id: 'menu', kind: 'addition', prompt: 'Solve 2 + 3 = ?', answer: 5, targetCount: 1, progress: 0 },
  score: 3850,
  stars: 0,
  challengeNumber: 1,
  totalChallenges: 6,
  lockTargetId: 'menu-5',
  lockProgress: 0.78,
  lockIsCorrect: true,
  bossHealth: 3,
  bossMaxHealth: 3,
  feedback: null,
  laser: { x: 0, y: 0.03, z: 0.58, seconds: 0.3 },
  shieldCharges: 2,
  magnetCharges: 3,
};

export const MenuScreen = ({ progress, onPlay, onParents }: MenuScreenProps) => {
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
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  const snapshot = useMemo<GameSnapshot>(() => ({
    ...BASE_MENU_SNAPSHOT,
    elapsedSeconds: previewSeconds,
    ship: {
      ...BASE_MENU_SNAPSHOT.ship,
      x: Math.sin(previewSeconds * 0.55) * 0.16,
      shieldSeconds: previewSeconds % 9 > 7.2 ? 1 : 0,
      magnetSeconds: previewSeconds % 11 > 9.6 ? 1 : 0,
    },
    laser: previewSeconds % 3.8 < 0.55 ? BASE_MENU_SNAPSHOT.laser : null,
  }), [previewSeconds]);

  return (
    <View style={styles.background}>
      <GameCanvas snapshot={snapshot} />
      <View pointerEvents="none" style={styles.topShade} />

      <View pointerEvents="none" style={styles.logoPanel}>
        <Text style={styles.number}>NUMBER</Text>
        <Text style={styles.nova}>NOVA</Text>
        <Text style={styles.tagline}>SPACE MATH BATTLE</Text>
        <View style={styles.logoOrbit} />
      </View>

      <View style={styles.actionPanel}>
        <Text style={styles.hero}>Ready for launch?</Text>
        <Text style={styles.subhero}>Tilt to fly, dodge the danger, and blast the right answer.</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Start mission"
          onPress={onPlay}
          style={({ pressed }) => [styles.playButton, pressed && styles.pressed]}
        >
          <View style={styles.playTriangle} />
          <Text style={styles.playText}>START MISSION</Text>
        </Pressable>
        <View style={styles.statsRow}>
          <View style={styles.stat}><Text style={styles.statValue}>{progress.highScore.toLocaleString()}</Text><Text style={styles.statLabel}>HIGH SCORE</Text></View>
          <View style={styles.statDivider} />
          <View style={styles.stat}><Text style={styles.statValue}>{progress.bestStars}</Text><Text style={styles.statLabel}>BEST STARS</Text></View>
          <View style={styles.statDivider} />
          <View style={styles.stat}><Text style={styles.statValue}>{progress.gamesPlayed}</Text><Text style={styles.statLabel}>FLIGHTS</Text></View>
        </View>
      </View>

      <Pressable accessibilityRole="button" onLongPress={onParents} delayLongPress={850} style={styles.parentButton}>
        <Text style={styles.parentText}>Hold for Parents</Text>
      </Pressable>
      <Text style={styles.version}>OFFLINE • NO ADS • KID SAFE</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: '#02031A' },
  topShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#02031A1F',
  },
  logoPanel: {
    position: 'absolute',
    left: 38,
    top: 40,
    width: 280,
    alignItems: 'center',
    transform: [{ rotate: '-4deg' }],
  },
  number: {
    color: '#FFE34B',
    fontSize: 48,
    lineHeight: 50,
    fontWeight: '900',
    letterSpacing: 2,
    textShadowColor: '#FF6A00',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 7,
    zIndex: 3,
  },
  nova: {
    color: '#6BE8FF',
    fontSize: 84,
    lineHeight: 84,
    fontWeight: '900',
    letterSpacing: 3,
    textShadowColor: '#294CFF',
    textShadowOffset: { width: 1, height: 6 },
    textShadowRadius: 13,
    zIndex: 3,
  },
  tagline: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 2.2,
    marginTop: 8,
    zIndex: 3,
  },
  logoOrbit: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 13,
    height: 48,
    borderWidth: 6,
    borderColor: '#C752FFCC',
    borderRadius: 100,
    transform: [{ rotate: '-7deg' }],
  },
  actionPanel: {
    position: 'absolute',
    right: 42,
    bottom: 44,
    width: '38%',
    minWidth: 430,
    maxWidth: 610,
    alignItems: 'center',
    borderRadius: 34,
    borderWidth: 3,
    borderColor: '#39D6FF',
    backgroundColor: '#06113DEB',
    paddingHorizontal: 34,
    paddingVertical: 24,
    shadowColor: '#7A28FF',
    shadowOpacity: 0.95,
    shadowRadius: 18,
  },
  hero: { color: '#FFFFFF', fontSize: 34, lineHeight: 40, fontWeight: '900', textAlign: 'center' },
  subhero: { color: '#C6D6FF', fontSize: 17, lineHeight: 23, textAlign: 'center', marginTop: 5, marginBottom: 18 },
  playButton: {
    minWidth: 310,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    borderRadius: 29,
    borderWidth: 4,
    borderColor: '#FFF5AE',
    backgroundColor: '#F05B20',
    paddingHorizontal: 30,
    paddingVertical: 16,
    shadowColor: '#FFB638',
    shadowOpacity: 0.95,
    shadowRadius: 14,
  },
  playTriangle: {
    width: 0,
    height: 0,
    borderTopWidth: 11,
    borderBottomWidth: 11,
    borderLeftWidth: 18,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: '#FFFFFF',
  },
  playText: { color: '#FFFFFF', fontSize: 21, fontWeight: '900', letterSpacing: 0.8 },
  pressed: { transform: [{ scale: 0.97 }] },
  statsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 19 },
  stat: { alignItems: 'center', minWidth: 90 },
  statDivider: { width: 1, height: 33, backgroundColor: '#5A6DA6', marginHorizontal: 13 },
  statValue: { color: '#FFE34B', fontSize: 21, fontWeight: '900' },
  statLabel: { color: '#9EB5EC', fontSize: 9, fontWeight: '900', letterSpacing: 0.9 },
  parentButton: {
    position: 'absolute',
    left: 22,
    bottom: 16,
    paddingHorizontal: 15,
    paddingVertical: 9,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#52689D',
    backgroundColor: '#07143DD9',
  },
  parentText: { color: '#D0DCFF', fontSize: 12, fontWeight: '800' },
  version: { position: 'absolute', right: 20, top: 14, color: '#9BAEDD', fontSize: 10, fontWeight: '900', letterSpacing: 0.7 },
});
