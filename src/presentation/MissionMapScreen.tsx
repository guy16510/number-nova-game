import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SKILL_METADATA, type MissionPlan } from '../domain/LearningModel';
import type { PlayerProgress } from '../infrastructure/ProgressRepository';

interface MissionMapScreenProps {
  readonly missions: readonly MissionPlan[];
  readonly progress: PlayerProgress;
  readonly onSelect: (mission: MissionPlan) => void;
  readonly onBack: () => void;
  readonly onHangar: () => void;
  readonly onParents: () => void;
}

const MissionCard = ({ mission, onSelect }: { readonly mission: MissionPlan; readonly onSelect: () => void }) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={`${mission.title}, ${mission.difficultyLabel}`}
    onPress={onSelect}
    style={({ pressed }: { pressed: boolean }) => [styles.missionCard, { borderColor: mission.accent }, pressed && styles.pressed]}
  >
    <View style={[styles.planet, { borderColor: mission.accent }]}>
      <View style={[styles.planetCore, { backgroundColor: mission.accent }]} />
      <View style={[styles.orbit, { borderColor: mission.accent }]} />
    </View>
    <Text style={[styles.mode, { color: mission.accent }]}>{mission.mode.toUpperCase()}</Text>
    <Text style={styles.missionTitle}>{mission.title}</Text>
    <Text style={styles.planetName}>{mission.planet}</Text>
    <Text style={styles.subtitle}>{mission.subtitle}</Text>
    <View style={styles.detailRow}>
      <Text style={styles.detail}>{SKILL_METADATA[mission.focusSkill].shortName}</Text>
      <Text style={styles.dot}>•</Text>
      <Text style={styles.detail}>Level {mission.mathLevel + 1}</Text>
      <Text style={styles.dot}>•</Text>
      <Text style={styles.detail}>{mission.challengeCount} encounters</Text>
    </View>
    <Text style={styles.reward}>{mission.rewardPreview}</Text>
    <View style={[styles.launchButton, { backgroundColor: mission.accent }]}>
      <Text style={styles.launchText}>LAUNCH</Text>
    </View>
  </Pressable>
);

export const MissionMapScreen = ({ missions, progress, onSelect, onBack, onHangar, onParents }: MissionMapScreenProps) => (
  <View style={styles.container}>
    <View style={styles.nebulaOne} />
    <View style={styles.nebulaTwo} />
    <View style={styles.header}>
      <Pressable onPress={onBack} style={styles.headerButton}><Text style={styles.headerButtonText}>‹ HANGAR</Text></Pressable>
      <View style={styles.headerCenter}>
        <Text style={styles.kicker}>GALAXY MAP</Text>
        <Text style={styles.title}>Choose the next mission</Text>
        <Text style={styles.body}>Every route mixes focused practice, spaced review, and one small stretch challenge.</Text>
      </View>
      <View style={styles.headerActions}>
        <Pressable onPress={onHangar} style={styles.headerButton}><Text style={styles.headerButtonText}>CUSTOMIZE</Text></Pressable>
        <Pressable onPress={onParents} style={styles.headerButton}><Text style={styles.headerButtonText}>PARENTS</Text></Pressable>
      </View>
    </View>

    <View style={styles.cards}>
      {missions.map((mission) => <MissionCard key={mission.id} mission={mission} onSelect={() => onSelect(mission)} />)}
    </View>

    <View style={styles.footer}>
      <Text style={styles.footerStrong}>{progress.missionsCompleted} planets restored</Text>
      <Text style={styles.footerText}>Math level {Math.max(1, progress.highestMathLevel)}  •  {progress.unlockedRewards.length} rewards unlocked</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#02031A', paddingHorizontal: 24, paddingVertical: 16, overflow: 'hidden' },
  nebulaOne: { position: 'absolute', width: 520, height: 520, borderRadius: 260, left: -210, top: -230, backgroundColor: '#5E2BC0', opacity: 0.28 },
  nebulaTwo: { position: 'absolute', width: 430, height: 430, borderRadius: 215, right: -170, bottom: -230, backgroundColor: '#0B8FB8', opacity: 0.25 },
  header: { minHeight: 94, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerCenter: { flex: 1, alignItems: 'center', paddingHorizontal: 24 },
  headerActions: { flexDirection: 'row', gap: 8 },
  headerButton: { borderWidth: 1, borderColor: '#5369A3', borderRadius: 15, backgroundColor: '#07143DDD', paddingHorizontal: 14, paddingVertical: 9 },
  headerButtonText: { color: '#BFE9FF', fontSize: 11, fontWeight: '900', letterSpacing: 0.7 },
  kicker: { color: '#FFE154', fontSize: 11, fontWeight: '900', letterSpacing: 2 },
  title: { color: '#FFFFFF', fontSize: 30, fontWeight: '900', marginTop: 1 },
  body: { color: '#AFC5F4', fontSize: 13, fontWeight: '600', marginTop: 2, textAlign: 'center' },
  cards: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 18 },
  missionCard: { width: '30%', minWidth: 300, maxWidth: 405, minHeight: 430, alignItems: 'center', borderWidth: 3, borderRadius: 28, backgroundColor: '#07113FEE', paddingHorizontal: 20, paddingVertical: 18 },
  pressed: { transform: [{ scale: 0.975 }] },
  planet: { width: 102, height: 102, borderRadius: 51, borderWidth: 3, alignItems: 'center', justifyContent: 'center', marginBottom: 9 },
  planetCore: { width: 72, height: 72, borderRadius: 36, opacity: 0.7 },
  orbit: { position: 'absolute', width: 128, height: 42, borderRadius: 64, borderWidth: 3, transform: [{ rotate: '-18deg' }], opacity: 0.7 },
  mode: { fontSize: 11, fontWeight: '900', letterSpacing: 1.8 },
  missionTitle: { color: '#FFFFFF', fontSize: 22, lineHeight: 26, fontWeight: '900', textAlign: 'center', marginTop: 3 },
  planetName: { color: '#9FBAF3', fontSize: 12, fontWeight: '800', marginTop: 2 },
  subtitle: { color: '#D3DFFF', fontSize: 14, lineHeight: 20, textAlign: 'center', marginTop: 10, minHeight: 60 },
  detailRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 9, flexWrap: 'wrap' },
  detail: { color: '#AFC8FF', fontSize: 10, fontWeight: '900' },
  dot: { color: '#6579B2', marginHorizontal: 6 },
  reward: { color: '#FFE778', fontSize: 11, fontWeight: '800', textAlign: 'center', marginTop: 12 },
  launchButton: { minWidth: 170, borderRadius: 24, alignItems: 'center', paddingVertical: 12, marginTop: 15 },
  launchText: { color: '#06102E', fontSize: 15, fontWeight: '900', letterSpacing: 1.2 },
  footer: { alignItems: 'center', minHeight: 42 },
  footerStrong: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
  footerText: { color: '#8299CD', fontSize: 11, fontWeight: '700', marginTop: 2 },
});
