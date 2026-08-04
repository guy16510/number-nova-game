import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
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
      <Text style={styles.body}>Number Nova stores progress only on this device. The MVP has no account, ads, chat, or child-facing purchases.</Text>
      <View style={styles.stats}>
        <View style={styles.stat}><Text style={styles.value}>{progress.highScore.toLocaleString()}</Text><Text style={styles.label}>High score</Text></View>
        <View style={styles.stat}><Text style={styles.value}>{progress.gamesPlayed}</Text><Text style={styles.label}>Flights</Text></View>
        <View style={styles.stat}><Text style={styles.value}>{progress.missionsCompleted}</Text><Text style={styles.label}>Bosses defeated</Text></View>
      </View>
      <Text style={styles.note}>Skills in this MVP: number recognition, counting, and addition with answers up to 10.</Text>
      <Pressable onPress={onClose} style={styles.primary}><Text style={styles.primaryText}>DONE</Text></Pressable>
      <Pressable onPress={onReset} style={styles.reset}><Text style={styles.resetText}>Reset local progress</Text></Pressable>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#02031A', padding: 30 },
  card: { width: '70%', maxWidth: 700, minWidth: 500, borderRadius: 28, borderWidth: 2, borderColor: '#39D6FF', backgroundColor: '#071345', padding: 30, alignItems: 'center' },
  title: { color: '#FFFFFF', fontSize: 32, fontWeight: '900' },
  body: { color: '#C6D6FF', fontSize: 16, lineHeight: 23, textAlign: 'center', marginTop: 8 },
  stats: { flexDirection: 'row', gap: 45, marginVertical: 24 },
  stat: { minWidth: 105, alignItems: 'center' },
  value: { color: '#FFE34B', fontSize: 26, fontWeight: '900' },
  label: { color: '#9EB5EC', fontSize: 12, fontWeight: '800' },
  note: { color: '#A9C5FF', fontSize: 14, textAlign: 'center', marginBottom: 20 },
  primary: { minWidth: 220, alignItems: 'center', borderRadius: 22, backgroundColor: '#1468DF', padding: 13 },
  primaryText: { color: '#FFFFFF', fontSize: 18, fontWeight: '900' },
  reset: { marginTop: 12, padding: 8 },
  resetText: { color: '#FF98A8', fontSize: 14, fontWeight: '800' },
});
