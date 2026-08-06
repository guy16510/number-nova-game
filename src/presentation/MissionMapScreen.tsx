import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SKILL_METADATA, type MissionPlan } from '../domain/LearningModel';
import type { PlayerProgress } from '../infrastructure/ProgressRepository';
import { useResponsiveLandscape } from './useResponsiveLandscape';

interface MissionMapScreenProps {
  readonly missions: readonly MissionPlan[];
  readonly progress: PlayerProgress;
  readonly onSelect: (mission: MissionPlan) => void;
  readonly onBack: () => void;
  readonly onHangar: () => void;
  readonly onParents: () => void;
}

const MissionCard = ({
  mission,
  onSelect,
  scale,
  compact,
}: {
  readonly mission: MissionPlan;
  readonly onSelect: () => void;
  readonly scale: number;
  readonly compact: boolean;
}) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={`${mission.title}, ${mission.difficultyLabel}`}
    onPress={onSelect}
    style={({ pressed }: { pressed: boolean }) => [
      styles.missionCard,
      compact && styles.missionCardCompact,
      {
        borderColor: mission.accent,
        width: compact ? 250 : 330 * scale,
        minHeight: compact ? 320 : 410 * scale,
        paddingHorizontal: 18 * scale,
        paddingVertical: 15 * scale,
      },
      pressed && styles.pressed,
    ]}
  >
    <View
      style={[
        styles.planet,
        {
          borderColor: mission.accent,
          width: 96 * scale,
          height: 96 * scale,
          borderRadius: 48 * scale,
          marginBottom: 8 * scale,
        },
      ]}
    >
      <View style={[styles.planetCore, { backgroundColor: mission.accent, width: 68 * scale, height: 68 * scale, borderRadius: 34 * scale }]} />
      <View style={[styles.orbit, { borderColor: mission.accent, width: 120 * scale, height: 40 * scale, borderRadius: 60 * scale }]} />
    </View>
    <Text style={[styles.mode, { color: mission.accent, fontSize: 11 * scale }]}>{mission.mode.toUpperCase()}</Text>
    <Text style={[styles.missionTitle, { fontSize: 21 * scale, lineHeight: 25 * scale }]} numberOfLines={2}>{mission.title}</Text>
    <Text style={[styles.planetName, { fontSize: 12 * scale }]}>{mission.planet}</Text>
    <Text style={[styles.subtitle, { fontSize: 14 * scale, lineHeight: 19 * scale, marginTop: 8 * scale }]} numberOfLines={3}>{mission.subtitle}</Text>
    <View style={[styles.detailRow, { marginTop: 8 * scale }]}>
      <Text style={[styles.detail, { fontSize: 10 * scale }]}>{SKILL_METADATA[mission.focusSkill].shortName}</Text>
      <Text style={[styles.dot, { marginHorizontal: 5 * scale }]}>•</Text>
      <Text style={[styles.detail, { fontSize: 10 * scale }]}>Level {mission.mathLevel + 1}</Text>
      <Text style={[styles.dot, { marginHorizontal: 5 * scale }]}>•</Text>
      <Text style={[styles.detail, { fontSize: 10 * scale }]}>{mission.challengeCount} encounters</Text>
    </View>
    <Text style={[styles.reward, { fontSize: 11 * scale, marginTop: 10 * scale }]} numberOfLines={2}>{mission.rewardPreview}</Text>
    <View style={[styles.launchButton, { backgroundColor: mission.accent, minWidth: 160 * scale, paddingVertical: 11 * scale, marginTop: 12 * scale }]}>
      <Text style={[styles.launchText, { fontSize: 15 * scale }]}>LAUNCH</Text>
    </View>
  </Pressable>
);

export const MissionMapScreen = ({ missions, progress, onSelect, onBack, onHangar, onParents }: MissionMapScreenProps) => {
  const metrics = useResponsiveLandscape();
  const compact = metrics.isCompact || metrics.isShort;
  const scale = compact ? Math.min(metrics.scale, 0.84) : metrics.scale;

  return (
    <View style={[styles.container, { paddingHorizontal: 18 * metrics.spacingScale, paddingVertical: 12 * metrics.spacingScale }]}>
      <View style={styles.nebulaOne} />
      <View style={styles.nebulaTwo} />
      <View style={[styles.header, compact && styles.headerCompact]}>
        <Pressable onPress={onBack} style={[styles.headerButton, compact && styles.headerButtonCompact]}><Text style={styles.headerButtonText}>‹ HANGAR</Text></Pressable>
        <View style={[styles.headerCenter, compact && styles.headerCenterCompact]}>
          <Text style={[styles.kicker, { fontSize: 11 * scale }]}>GALAXY MAP</Text>
          <Text style={[styles.title, { fontSize: 28 * scale }]} numberOfLines={1}>Choose the next mission</Text>
          {!compact ? <Text style={[styles.body, { fontSize: 13 * scale }]} numberOfLines={2}>Every route mixes focused practice, spaced review, and one small stretch challenge.</Text> : null}
        </View>
        <View style={styles.headerActions}>
          <Pressable onPress={onHangar} style={[styles.headerButton, compact && styles.headerButtonCompact]}><Text style={styles.headerButtonText}>CUSTOMIZE</Text></Pressable>
          <Pressable onPress={onParents} style={[styles.headerButton, compact && styles.headerButtonCompact]}><Text style={styles.headerButtonText}>PARENTS</Text></Pressable>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.cards, compact && styles.cardsCompact]}
      >
        {missions.map((mission) => (
          <MissionCard key={mission.id} mission={mission} onSelect={() => onSelect(mission)} scale={scale} compact={compact} />
        ))}
      </ScrollView>

      <View style={[styles.footer, compact && styles.footerCompact]}>
        <Text style={[styles.footerStrong, { fontSize: 13 * scale }]}>{progress.missionsCompleted} planets restored</Text>
        <Text style={[styles.footerText, { fontSize: 11 * scale }]}>Math level {Math.max(1, progress.highestMathLevel)}  •  {progress.unlockedRewards.length} rewards unlocked</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#02031A', overflow: 'hidden' },
  nebulaOne: { position: 'absolute', width: 520, height: 520, borderRadius: 260, left: -210, top: -230, backgroundColor: '#5E2BC0', opacity: 0.28 },
  nebulaTwo: { position: 'absolute', width: 430, height: 430, borderRadius: 215, right: -170, bottom: -230, backgroundColor: '#0B8FB8', opacity: 0.25 },
  header: { minHeight: 82, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerCompact: { minHeight: 54 },
  headerCenter: { flex: 1, alignItems: 'center', paddingHorizontal: 16 },
  headerCenterCompact: { paddingHorizontal: 8 },
  headerActions: { flexDirection: 'row', gap: 8 },
  headerButton: { borderWidth: 1, borderColor: '#5369A3', borderRadius: 15, backgroundColor: '#07143DDD', paddingHorizontal: 14, paddingVertical: 9 },
  headerButtonCompact: { paddingHorizontal: 10, paddingVertical: 7 },
  headerButtonText: { color: '#BFE9FF', fontSize: 11, fontWeight: '900', letterSpacing: 0.7 },
  kicker: { color: '#FFE154', fontWeight: '900', letterSpacing: 2 },
  title: { color: '#FFFFFF', fontWeight: '900', marginTop: 1 },
  body: { color: '#AFC5F4', fontWeight: '600', marginTop: 2, textAlign: 'center' },
  cards: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', gap: 16, paddingHorizontal: 4, paddingVertical: 8 },
  cardsCompact: { justifyContent: 'flex-start', paddingVertical: 4 },
  missionCard: { alignItems: 'center', borderWidth: 3, borderRadius: 28, backgroundColor: '#07113FEE', marginHorizontal: 2 },
  missionCardCompact: { borderRadius: 22 },
  pressed: { transform: [{ scale: 0.975 }] },
  planet: { borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  planetCore: { opacity: 0.7 },
  orbit: { position: 'absolute', borderWidth: 3, transform: [{ rotate: '-18deg' }], opacity: 0.7 },
  mode: { fontWeight: '900', letterSpacing: 1.8 },
  missionTitle: { color: '#FFFFFF', fontWeight: '900', textAlign: 'center', marginTop: 3 },
  planetName: { color: '#9FBAF3', fontWeight: '800', marginTop: 2 },
  subtitle: { color: '#D3DFFF', textAlign: 'center' },
  detailRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' },
  detail: { color: '#AFC8FF', fontWeight: '900' },
  dot: { color: '#6579B2' },
  reward: { color: '#FFE778', fontWeight: '800', textAlign: 'center' },
  launchButton: { borderRadius: 24, alignItems: 'center' },
  launchText: { color: '#06102E', fontWeight: '900', letterSpacing: 1.2 },
  footer: { alignItems: 'center', minHeight: 34, justifyContent: 'center' },
  footerCompact: { minHeight: 24 },
  footerStrong: { color: '#FFFFFF', fontWeight: '900' },
  footerText: { color: '#8299CD', fontWeight: '700', marginTop: 2 },
});
