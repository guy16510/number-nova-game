import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { GameSnapshot } from '../domain/types';

interface ResultsScreenProps {
  readonly snapshot: GameSnapshot;
  readonly onPlayAgain: () => void;
  readonly onMenu: () => void;
}

export const ResultsScreen = ({ snapshot, onPlayAgain, onMenu }: ResultsScreenProps) => {
  const won = snapshot.phase === 'complete';
  return (
    <View style={styles.container}>
      <View style={styles.planetOne} />
      <View style={styles.planetTwo} />
      <View style={styles.card}>
        <Text style={styles.kicker}>{won ? 'GALAXY SAVED!' : 'SHIP NEEDS REPAIRS'}</Text>
        <Text style={styles.title}>{won ? 'Mission complete' : 'Great try, pilot'}</Text>
        <Text style={styles.stars}>{won ? '★★★' : '★☆☆'}</Text>
        <View style={styles.metrics}>
          <View style={styles.metric}><Text style={styles.value}>{snapshot.score.toLocaleString()}</Text><Text style={styles.label}>SCORE</Text></View>
          <View style={styles.metric}><Text style={styles.value}>{snapshot.stars}</Text><Text style={styles.label}>STARS</Text></View>
          <View style={styles.metric}><Text style={styles.value}>{Math.round(snapshot.elapsedSeconds)}s</Text><Text style={styles.label}>TIME</Text></View>
        </View>
        <Pressable onPress={onPlayAgain} style={styles.primaryButton}>
          <Text style={styles.primaryText}>🚀 FLY AGAIN</Text>
        </Pressable>
        <Pressable onPress={onMenu} style={styles.secondaryButton}>
          <Text style={styles.secondaryText}>Back to hangar</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#030420', overflow: 'hidden' },
  planetOne: { position: 'absolute', width: 310, height: 310, borderRadius: 155, left: -90, top: -100, backgroundColor: '#5D2BBD', opacity: 0.65 },
  planetTwo: { position: 'absolute', width: 250, height: 250, borderRadius: 125, right: -70, bottom: -90, backgroundColor: '#D34F28', opacity: 0.5 },
  card: { minWidth: 520, alignItems: 'center', borderWidth: 3, borderColor: '#39D6FF', borderRadius: 32, backgroundColor: '#071345F0', paddingHorizontal: 45, paddingVertical: 28 },
  kicker: { color: '#FFE34B', fontSize: 17, fontWeight: '900', letterSpacing: 2 },
  title: { color: '#FFFFFF', fontSize: 38, fontWeight: '900', marginTop: 4 },
  stars: { color: '#FFD43B', fontSize: 51, letterSpacing: 7, marginVertical: 5 },
  metrics: { flexDirection: 'row', gap: 50, marginBottom: 20 },
  metric: { alignItems: 'center', minWidth: 85 },
  value: { color: '#FFFFFF', fontSize: 24, fontWeight: '900' },
  label: { color: '#9EB5EC', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  primaryButton: { minWidth: 260, alignItems: 'center', borderRadius: 24, borderWidth: 2, borderColor: '#FFF2A3', backgroundColor: '#F05B20', padding: 14 },
  primaryText: { color: '#FFFFFF', fontSize: 19, fontWeight: '900' },
  secondaryButton: { marginTop: 10, padding: 9 },
  secondaryText: { color: '#9FDFFF', fontSize: 15, fontWeight: '800' },
});
