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
  const starRating = won ? (snapshot.accuracy >= 0.8 && snapshot.collisions <= 2 ? '★★★' : '★★☆') : '★☆☆';
  return (
    <View style={styles.container}>
      <View style={styles.planetOne} />
      <View style={styles.planetTwo} />
      <View style={styles.card}>
        <Text style={styles.kicker}>{won ? 'GALAXY SAVED!' : 'SHIP NEEDS REPAIRS'}</Text>
        <Text style={styles.title}>{won ? 'Alien Asteroid Ambush complete' : 'Great try, pilot'}</Text>
        <Text style={styles.stars}>{starRating}</Text>
        <View style={styles.metrics}>
          <View style={styles.metric}><Text style={styles.value}>{snapshot.score.toLocaleString()}</Text><Text style={styles.label}>SCORE</Text></View>
          <View style={styles.metric}><Text style={styles.value}>{Math.round(snapshot.accuracy * 100)}%</Text><Text style={styles.label}>ACCURACY</Text></View>
          <View style={styles.metric}><Text style={styles.value}>{snapshot.bestCombo}x</Text><Text style={styles.label}>BEST COMBO</Text></View>
          <View style={styles.metric}><Text style={styles.value}>{snapshot.challenge.mathLevel + 1}</Text><Text style={styles.label}>MATH LEVEL</Text></View>
        </View>
        {snapshot.reward ? (
          <View style={styles.rewardCard}>
            <Text style={styles.rewardKicker}>NEW REWARD UNLOCKED</Text>
            <Text style={styles.rewardName}>✦ {snapshot.reward.name}</Text>
            <Text style={styles.rewardDescription}>{snapshot.reward.description}</Text>
          </View>
        ) : null}
        <Pressable onPress={onPlayAgain} style={styles.primaryButton}><Text style={styles.primaryText}>🚀 FLY AGAIN</Text></Pressable>
        <Pressable onPress={onMenu} style={styles.secondaryButton}><Text style={styles.secondaryText}>Back to hangar</Text></Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#030420', overflow: 'hidden' },
  planetOne: { position: 'absolute', width: 310, height: 310, borderRadius: 155, left: -90, top: -100, backgroundColor: '#5D2BBD', opacity: 0.65 },
  planetTwo: { position: 'absolute', width: 250, height: 250, borderRadius: 125, right: -70, bottom: -90, backgroundColor: '#D34F28', opacity: 0.5 },
  card: { minWidth: 640, maxWidth: 780, alignItems: 'center', borderWidth: 3, borderColor: '#39D6FF', borderRadius: 32, backgroundColor: '#071345F0', paddingHorizontal: 45, paddingVertical: 22 },
  kicker: { color: '#FFE34B', fontSize: 16, fontWeight: '900', letterSpacing: 2 },
  title: { color: '#FFFFFF', fontSize: 34, fontWeight: '900', marginTop: 4, textAlign: 'center' },
  stars: { color: '#FFD43B', fontSize: 43, letterSpacing: 7, marginVertical: 3 },
  metrics: { flexDirection: 'row', gap: 30, marginBottom: 13 },
  metric: { alignItems: 'center', minWidth: 100 },
  value: { color: '#FFFFFF', fontSize: 23, fontWeight: '900' },
  label: { color: '#9EB5EC', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  rewardCard: { width: '100%', alignItems: 'center', borderRadius: 18, borderWidth: 2, borderColor: '#FFEF73', backgroundColor: '#5A2378CC', padding: 10, marginBottom: 12 },
  rewardKicker: { color: '#FFE66C', fontSize: 10, fontWeight: '900', letterSpacing: 1.4 },
  rewardName: { color: '#FFFFFF', fontSize: 21, fontWeight: '900', marginTop: 2 },
  rewardDescription: { color: '#D7E1FF', fontSize: 13, fontWeight: '600', marginTop: 2 },
  primaryButton: { minWidth: 260, alignItems: 'center', borderRadius: 24, borderWidth: 2, borderColor: '#FFF2A3', backgroundColor: '#F05B20', padding: 13 },
  primaryText: { color: '#FFFFFF', fontSize: 19, fontWeight: '900' },
  secondaryButton: { marginTop: 7, padding: 7 },
  secondaryText: { color: '#9FDFFF', fontSize: 15, fontWeight: '800' },
});
