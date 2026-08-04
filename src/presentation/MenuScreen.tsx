import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { GameSnapshot } from '../domain/types';
import type { PlayerProgress } from '../infrastructure/ProgressRepository';
import { GameCanvas } from './GameCanvas';

interface MenuScreenProps {
  readonly progress: PlayerProgress;
  readonly onPlay: () => void;
  readonly onParents: () => void;
}

const MENU_SNAPSHOT: GameSnapshot = {
  phase: 'ready',
  elapsedSeconds: 0,
  ship: { x: 0, y: 0.32, hearts: 3, shieldSeconds: 0, magnetSeconds: 0 },
  entities: [
    { id: 'menu-4', kind: 'answer', x: -0.58, y: -0.05, z: 0.63, radius: 0.2, color: '#36A8FF', label: '4', correct: false },
    { id: 'menu-5', kind: 'answer', x: 0, y: 0.03, z: 0.58, radius: 0.2, color: '#73E632', label: '5', correct: true },
    { id: 'menu-6', kind: 'answer', x: 0.58, y: -0.02, z: 0.66, radius: 0.2, color: '#FF8B20', label: '6', correct: false },
    { id: 'menu-h1', kind: 'hazard', x: -0.83, y: 0.4, z: 0.4, radius: 0.13, color: '#FF472E' },
    { id: 'menu-h2', kind: 'hazard', x: 0.82, y: 0.47, z: 0.48, radius: 0.13, color: '#8D2CFF' },
  ],
  challenge: { id: 'menu', kind: 'addition', prompt: 'Solve 2 + 3', answer: 5, targetCount: 1, progress: 0 },
  score: 3850,
  stars: 0,
  challengeNumber: 1,
  totalChallenges: 6,
  lockTargetId: 'menu-5',
  lockProgress: 0.75,
  lockIsCorrect: true,
  bossHealth: 3,
  bossMaxHealth: 3,
  feedback: null,
  laser: null,
  shieldCharges: 2,
  magnetCharges: 2,
};

export const MenuScreen = ({ progress, onPlay, onParents }: MenuScreenProps) => (
  <View style={styles.background}>
    <GameCanvas snapshot={MENU_SNAPSHOT} />
    <View style={styles.scrim} />
    <View style={styles.content}>
      <View style={styles.logoPanel}>
        <Text style={styles.number}>NUMBER</Text>
        <Text style={styles.nova}>NOVA</Text>
        <Text style={styles.tagline}>TILT TO FLY • SOLVE TO BLAST</Text>
      </View>

      <View style={styles.actionPanel}>
        <Text style={styles.hero}>Save the galaxy with math</Text>
        <Text style={styles.subhero}>Steer your ship through asteroids, collect stars, and blast the correct answers.</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Start mission"
          onPress={onPlay}
          style={({ pressed }) => [styles.playButton, pressed && styles.pressed]}
        >
          <Text style={styles.playIcon}>🚀</Text>
          <Text style={styles.playText}>START MISSION</Text>
        </Pressable>
        <View style={styles.statsRow}>
          <View style={styles.stat}><Text style={styles.statValue}>{progress.highScore.toLocaleString()}</Text><Text style={styles.statLabel}>HIGH SCORE</Text></View>
          <View style={styles.stat}><Text style={styles.statValue}>{progress.bestStars}</Text><Text style={styles.statLabel}>BEST STARS</Text></View>
          <View style={styles.stat}><Text style={styles.statValue}>{progress.gamesPlayed}</Text><Text style={styles.statLabel}>FLIGHTS</Text></View>
        </View>
      </View>
    </View>
    <Pressable accessibilityRole="button" onLongPress={onParents} delayLongPress={850} style={styles.parentButton}>
      <Text style={styles.parentText}>Hold for Parents</Text>
    </Pressable>
    <Text style={styles.version}>MVP 0.1 • Works offline • No ads</Text>
  </View>
);

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: '#02031A' },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: '#02031A88' },
  content: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: '7%' },
  logoPanel: { width: '39%', alignItems: 'center', transform: [{ rotate: '-2deg' }] },
  number: { color: '#FFE34B', fontSize: 45, fontWeight: '900', letterSpacing: 2, textShadowColor: '#FF6A00', textShadowRadius: 6 },
  nova: { color: '#6BE8FF', fontSize: 78, lineHeight: 78, fontWeight: '900', letterSpacing: 3, textShadowColor: '#294CFF', textShadowRadius: 12 },
  tagline: { color: '#FFFFFF', fontSize: 13, fontWeight: '900', letterSpacing: 1.8, marginTop: 5 },
  actionPanel: {
    width: '45%',
    alignItems: 'center',
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#39D6FF',
    backgroundColor: '#06113DDE',
    paddingHorizontal: 30,
    paddingVertical: 25,
  },
  hero: { color: '#FFFFFF', fontSize: 29, fontWeight: '900', textAlign: 'center' },
  subhero: { color: '#C6D6FF', fontSize: 16, lineHeight: 22, textAlign: 'center', marginTop: 7, marginBottom: 18 },
  playButton: {
    minWidth: 280,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 27,
    borderWidth: 3,
    borderColor: '#FFF5AE',
    backgroundColor: '#F05B20',
    paddingHorizontal: 28,
    paddingVertical: 15,
    shadowColor: '#FFB638',
    shadowOpacity: 0.9,
    shadowRadius: 12,
  },
  playIcon: { fontSize: 28 },
  playText: { color: '#FFFFFF', fontSize: 20, fontWeight: '900', letterSpacing: 0.7 },
  pressed: { transform: [{ scale: 0.97 }] },
  statsRow: { flexDirection: 'row', marginTop: 20, gap: 24 },
  stat: { alignItems: 'center', minWidth: 72 },
  statValue: { color: '#FFE34B', fontSize: 20, fontWeight: '900' },
  statLabel: { color: '#9EB5EC', fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },
  parentButton: { position: 'absolute', right: 18, bottom: 15, paddingHorizontal: 15, paddingVertical: 9, borderRadius: 15, backgroundColor: '#07143DC9' },
  parentText: { color: '#C6D6FF', fontSize: 12, fontWeight: '800' },
  version: { position: 'absolute', left: 18, bottom: 16, color: '#8396C7', fontSize: 10, fontWeight: '700' },
});
