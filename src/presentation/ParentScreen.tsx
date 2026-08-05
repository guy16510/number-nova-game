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
      <Text style={styles.body}>Number Nova now remembers skill mastery across sessions, schedules spaced review, and keeps math difficulty separate from combat intensity. Everything remains local to this device.</Text>
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
      <Text style={styles.note}>The mission planner uses roughly 60% current focus, 30% review, and 10% stretch content. Hints escalate only after repeated misses, instead of explaining every answer immediately.</Text>
      <View style={styles.actions}>
        <Pressable onPress={onClose} style={styles.primary}><Text style={styles.primaryText}>DONE</Text></Pressable>
        <Pressable onPress={onReset} style={styles.reset}><Text style={styles.resetText}>Reset local progress</Text></Pressable>
      </View>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#02031A', padding: 20 },
  card: { width: '88%', maxWidth: 1050, minWidth: 720, borderRadius: 28, borderWidth: 2, borderColor: '#39D6FF', backgroundColor: '#071345', paddingHorizontal: 28, paddingVertical: 20, alignItems: 'center' },
  title: { color: '#FFFFFF', fontSize: 30, fontWeight: '900' }, body: { color: '#C6D6FF', fontSize: 14, lineHeight: 20, textAlign: 'center', marginTop: 5, maxWidth: 850 },
  stats: { flexDirection: 'row', gap: 20, marginVertical: 14 }, stat: { minWidth: 145, alignItems: 'center' }, value: { color: '#FFE34B', fontSize: 23, fontWeight: '900' }, label: { color: '#9EB5EC', fontSize: 10, fontWeight: '800' },
  sectionTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '900', alignSelf: 'flex-start', marginLeft: '3%', marginBottom: 7 },
  skills: { width: '94%', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  skillCard: { width: '31%', minWidth: 235, borderRadius: 15, borderWidth: 1, borderColor: '#405D9D', backgroundColor: '#0A1850', paddingHorizontal: 11, paddingVertical: 8 },
  skillHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, skillName: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' }, skillState: { color: '#7DE7FF', fontSize: 9, fontWeight: '900' },
  track: { height: 5, borderRadius: 3, backgroundColor: '#202B5D', overflow: 'hidden', marginTop: 6 }, fill: { height: 5, borderRadius: 3, backgroundColor: '#55DFFF' }, skillMeta: { color: '#8FA8DD', fontSize: 9, fontWeight: '700', marginTop: 4 },
  note: { color: '#A9C5FF', fontSize: 11, lineHeight: 16, textAlign: 'center', marginTop: 11, maxWidth: 850 }, actions: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  primary: { minWidth: 190, alignItems: 'center', borderRadius: 21, backgroundColor: '#1468DF', padding: 11 }, primaryText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' }, reset: { marginLeft: 16, padding: 8 }, resetText: { color: '#FF98A8', fontSize: 13, fontWeight: '800' },
});
