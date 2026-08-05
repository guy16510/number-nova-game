import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { confidenceLabel, SKILLS, SKILL_METADATA } from '../domain/LearningModel';
import type { PlayerProgress } from '../infrastructure/ProgressRepository';

interface ParentScreenProps {
  readonly progress: PlayerProgress;
  readonly onReset: () => void;
  readonly onClose: () => void;
}

export const ParentScreen = ({ progress, onReset, onClose }: ParentScreenProps) => (
  <View style={styles.container}>
    <View style={styles.card}>
      <Text style={styles.title}>Parent dashboard</Text>
      <Text numberOfLines={2} style={styles.body}>Number Nova remembers skill mastery across sessions, schedules spaced review, and keeps math difficulty separate from combat intensity. Everything remains local to this device.</Text>
      <View style={styles.stats}>
        <View style={styles.stat}><Text style={styles.value}>{progress.missionsCompleted}</Text><Text style={styles.label}>Missions completed</Text></View>
        <View style={styles.stat}><Text style={styles.value}>{Math.round(progress.engagement.averageAccuracy * 100)}%</Text><Text style={styles.label}>Average accuracy</Text></View>
        <View style={styles.stat}><Text style={styles.value}>{progress.engagement.totalHintsUsed}</Text><Text style={styles.label}>Hints used</Text></View>
        <View style={styles.stat}><Text style={styles.value}>{progress.engagement.naturalStops}</Text><Text style={styles.label}>Healthy stop points</Text></View>
      </View>
      <Text style={styles.sectionTitle}>Skill mastery</Text>
      <View style={styles.skills}>
        {SKILLS.map((skill) => {
          const mastery = progress.mastery[skill];
          return (
            <View key={skill} style={styles.skillCard}>
              <View style={styles.skillHeading}><Text style={styles.skillName}>{SKILL_METADATA[skill].shortName}</Text><Text style={styles.skillState}>{confidenceLabel(mastery.confidence)}</Text></View>
              <View style={styles.track}><View style={[styles.fill, { width: `${Math.max(3, Math.round(mastery.confidence * 100))}%` }]} /></View>
              <Text style={styles.skillMeta}>{mastery.attempts} sessions • {mastery.streak} streak</Text>
            </View>
          );
        })}
      </View>
      <Text numberOfLines={2} style={styles.note}>Missions use roughly 60% current focus, 30% review, and 10% stretch content. Hints escalate only after repeated misses.</Text>
      <View style={styles.actions}>
        <Pressable accessibilityRole="button" accessibilityLabel="Done" onPress={onClose} style={styles.primary}><Text style={styles.primaryText}>DONE</Text></Pressable>
        <Pressable onPress={onReset} style={styles.reset}><Text style={styles.resetText}>Reset local progress</Text></Pressable>
      </View>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#02031A', padding: 12 },
  card: { width: '94%', height: '100%', maxWidth: 1120, minWidth: 720, borderRadius: 24, borderWidth: 2, borderColor: '#39D6FF', backgroundColor: '#071345', paddingHorizontal: 22, paddingVertical: 12, alignItems: 'center' },
  title: { color: '#FFFFFF', fontSize: 24, lineHeight: 28, fontWeight: '900' },
  body: { color: '#C6D6FF', fontSize: 11, lineHeight: 15, textAlign: 'center', marginTop: 2, maxWidth: 900 },
  stats: { flexDirection: 'row', gap: 16, marginVertical: 6 },
  stat: { minWidth: 135, alignItems: 'center' },
  value: { color: '#FFE34B', fontSize: 19, lineHeight: 22, fontWeight: '900' },
  label: { color: '#9EB5EC', fontSize: 9, lineHeight: 12, fontWeight: '800' },
  sectionTitle: { color: '#FFFFFF', fontSize: 15, lineHeight: 18, fontWeight: '900', alignSelf: 'flex-start', marginLeft: '2%', marginBottom: 4 },
  skills: { width: '97%', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6 },
  skillCard: { width: '23.5%', minWidth: 190, borderRadius: 12, borderWidth: 1, borderColor: '#405D9D', backgroundColor: '#0A1850', paddingHorizontal: 8, paddingVertical: 5 },
  skillHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  skillName: { color: '#FFFFFF', fontSize: 10, lineHeight: 13, fontWeight: '900' },
  skillState: { color: '#7DE7FF', fontSize: 8, lineHeight: 11, fontWeight: '900' },
  track: { height: 4, borderRadius: 2, backgroundColor: '#202B5D', overflow: 'hidden', marginTop: 3 },
  fill: { height: 4, borderRadius: 2, backgroundColor: '#55DFFF' },
  skillMeta: { color: '#8FA8DD', fontSize: 8, lineHeight: 11, fontWeight: '700', marginTop: 2 },
  note: { color: '#A9C5FF', fontSize: 9, lineHeight: 12, textAlign: 'center', marginTop: 5, maxWidth: 900 },
  actions: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  primary: { minWidth: 160, alignItems: 'center', borderRadius: 18, backgroundColor: '#1468DF', paddingVertical: 8, paddingHorizontal: 18 },
  primaryText: { color: '#FFFFFF', fontSize: 14, lineHeight: 17, fontWeight: '900' },
  reset: { marginLeft: 12, padding: 6 },
  resetText: { color: '#FF98A8', fontSize: 11, lineHeight: 14, fontWeight: '800' },
});
