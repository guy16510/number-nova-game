import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { confidenceLabel, SKILL_METADATA, type MissionPlan } from '../domain/LearningModel';
import type { GameSnapshot } from '../domain/types';
import type { PlayerProgress } from '../infrastructure/ProgressRepository';

interface ResultsScreenProps {
  readonly snapshot: GameSnapshot;
  readonly mission: MissionPlan;
  readonly hintsUsed: number;
  readonly progress: PlayerProgress;
  readonly onPlayAgain: () => void;
  readonly onNextMission: () => void;
  readonly onMenu: () => void;
}

export const ResultsScreen = ({ snapshot, mission, hintsUsed, progress, onPlayAgain, onNextMission, onMenu }: ResultsScreenProps) => {
  const won = snapshot.phase === 'complete';
  const starRating = won ? (snapshot.accuracy >= 0.8 && snapshot.collisions <= 2 ? '★★★' : '★★☆') : '★☆☆';
  const mastery = progress.mastery[mission.focusSkill];
  return (
    <View style={styles.container}>
      <View style={styles.planetOne} /><View style={styles.planetTwo} />
      <View style={styles.card}>
        <Text style={styles.kicker}>{won ? `${mission.planet.toUpperCase()} RESTORED` : 'SHIP NEEDS REPAIRS'}</Text>
        <Text style={styles.title}>{won ? mission.title : 'Good effort, pilot'}</Text>
        <Text style={styles.stars}>{starRating}</Text>
        <View style={styles.metrics}>
          <View style={styles.metric}><Text style={styles.value}>{snapshot.score.toLocaleString()}</Text><Text style={styles.label}>SCORE</Text></View>
          <View style={styles.metric}><Text style={styles.value}>{Math.round(snapshot.accuracy * 100)}%</Text><Text style={styles.label}>ACCURACY</Text></View>
          <View style={styles.metric}><Text style={styles.value}>{snapshot.bestCombo}x</Text><Text style={styles.label}>BEST COMBO</Text></View>
          <View style={styles.metric}><Text style={styles.value}>{hintsUsed}</Text><Text style={styles.label}>HINTS</Text></View>
        </View>
        <View style={styles.learningCard}>
          <Text style={styles.learningKicker}>LEARNING PROGRESS</Text>
          <Text style={styles.learningTitle}>{SKILL_METADATA[mission.focusSkill].name}: {confidenceLabel(mastery.confidence)}</Text>
          <View style={styles.track}><View style={[styles.fill, { width: `${Math.max(5, Math.round(mastery.confidence * 100))}%` }]} /></View>
          <Text style={styles.learningBody}>This mission also reviewed {SKILL_METADATA[mission.reviewSkill].name.toLowerCase()} and included a small {SKILL_METADATA[mission.stretchSkill].name.toLowerCase()} stretch.</Text>
        </View>
        {snapshot.reward ? (
          <View style={styles.rewardCard}><Text style={styles.rewardKicker}>NEW REWARD UNLOCKED</Text><Text style={styles.rewardName}>✦ {snapshot.reward.name}</Text><Text style={styles.rewardDescription}>{snapshot.reward.description}</Text></View>
        ) : null}
        <View style={styles.actions}>
          <Pressable onPress={onNextMission} style={styles.primaryButton}><Text style={styles.primaryText}>CHOOSE NEXT PLANET</Text></Pressable>
          <Pressable onPress={onPlayAgain} style={styles.replayButton}><Text style={styles.replayText}>FLY THIS AGAIN</Text></Pressable>
        </View>
        <Pressable onPress={onMenu} style={styles.secondaryButton}><Text style={styles.secondaryText}>Stop here and return to hangar</Text></Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#030420', overflow: 'hidden' },
  planetOne: { position: 'absolute', width: 310, height: 310, borderRadius: 155, left: -90, top: -100, backgroundColor: '#5D2BBD', opacity: 0.65 }, planetTwo: { position: 'absolute', width: 250, height: 250, borderRadius: 125, right: -70, bottom: -90, backgroundColor: '#D34F28', opacity: 0.5 },
  card: { minWidth: 690, maxWidth: 850, alignItems: 'center', borderWidth: 3, borderColor: '#39D6FF', borderRadius: 32, backgroundColor: '#071345F0', paddingHorizontal: 42, paddingVertical: 18 },
  kicker: { color: '#FFE34B', fontSize: 14, fontWeight: '900', letterSpacing: 2 }, title: { color: '#FFFFFF', fontSize: 31, fontWeight: '900', marginTop: 3, textAlign: 'center' }, stars: { color: '#FFD43B', fontSize: 38, letterSpacing: 7, marginVertical: 1 },
  metrics: { flexDirection: 'row', gap: 24, marginBottom: 10 }, metric: { alignItems: 'center', minWidth: 100 }, value: { color: '#FFFFFF', fontSize: 21, fontWeight: '900' }, label: { color: '#9EB5EC', fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  learningCard: { width: '100%', alignItems: 'center', borderRadius: 18, borderWidth: 2, borderColor: '#4F74C8', backgroundColor: '#0C1B55CC', padding: 10, marginBottom: 9 }, learningKicker: { color: '#72E9FF', fontSize: 9, fontWeight: '900', letterSpacing: 1.4 }, learningTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '900', marginTop: 2 }, learningBody: { color: '#C4D4F8', fontSize: 12, textAlign: 'center', marginTop: 5 },
  track: { width: '78%', height: 7, borderRadius: 4, backgroundColor: '#1E2858', overflow: 'hidden', marginTop: 7 }, fill: { height: 7, borderRadius: 4, backgroundColor: '#62E8FF' },
  rewardCard: { width: '100%', alignItems: 'center', borderRadius: 18, borderWidth: 2, borderColor: '#FFEF73', backgroundColor: '#5A2378CC', padding: 8, marginBottom: 9 }, rewardKicker: { color: '#FFE66C', fontSize: 9, fontWeight: '900', letterSpacing: 1.4 }, rewardName: { color: '#FFFFFF', fontSize: 18, fontWeight: '900', marginTop: 1 }, rewardDescription: { color: '#D7E1FF', fontSize: 12, fontWeight: '600', marginTop: 1 },
  actions: { flexDirection: 'row', gap: 12 }, primaryButton: { minWidth: 245, alignItems: 'center', borderRadius: 23, borderWidth: 2, borderColor: '#FFF2A3', backgroundColor: '#F05B20', padding: 12 }, primaryText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' }, replayButton: { minWidth: 205, alignItems: 'center', borderRadius: 23, borderWidth: 2, borderColor: '#5DDFFF', backgroundColor: '#144B9E', padding: 12 }, replayText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' }, secondaryButton: { marginTop: 5, padding: 6 }, secondaryText: { color: '#9FDFFF', fontSize: 13, fontWeight: '800' },
});
