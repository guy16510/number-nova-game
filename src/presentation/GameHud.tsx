import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { GameSnapshot } from '../domain/types';

interface GameHudProps {
  readonly snapshot: GameSnapshot;
  readonly onPause: () => void;
  readonly onShield: () => void;
  readonly onMagnet: () => void;
}

const Heart = ({ filled }: { readonly filled: boolean }) => (
  <Text style={[styles.heart, !filled && styles.heartEmpty]}>{filled ? '♥' : '♡'}</Text>
);

const PowerButton = ({ icon, label, charges, active, onPress }: {
  readonly icon: string;
  readonly label: string;
  readonly charges: number;
  readonly active: boolean;
  readonly onPress: () => void;
}) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={`${label}, ${charges} remaining`}
    disabled={charges <= 0 || active}
    onPress={onPress}
    style={({ pressed }) => [
      styles.powerButton,
      active && styles.powerActive,
      charges <= 0 && styles.powerDisabled,
      pressed && styles.pressed,
    ]}
  >
    <Text style={styles.powerIcon}>{icon}</Text>
    <Text style={styles.powerLabel}>{label}</Text>
    <View style={styles.chargeBadge}><Text style={styles.chargeText}>{charges}</Text></View>
  </Pressable>
);

export const GameHud = ({ snapshot, onPause, onShield, onMagnet }: GameHudProps) => (
  <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
    <View pointerEvents="box-none" style={styles.topRow}>
      <View style={styles.heartsPanel}>
        {[0, 1, 2].map((index) => <Heart key={index} filled={index < snapshot.ship.hearts} />)}
      </View>
      <View style={styles.promptPanel}>
        <Text adjustsFontSizeToFit numberOfLines={1} style={styles.prompt}>{snapshot.challenge.prompt}</Text>
        {snapshot.challenge.kind === 'collect' ? (
          <Text style={styles.progress}>{snapshot.challenge.progress} / {snapshot.challenge.targetCount}</Text>
        ) : null}
      </View>
      <View style={styles.scorePanel}>
        <Text style={styles.star}>★</Text>
        <Text style={styles.score}>{snapshot.score.toLocaleString()}</Text>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Pause" onPress={onPause} style={styles.pauseButton}>
        <Text style={styles.pauseText}>Ⅱ</Text>
      </Pressable>
    </View>

    {snapshot.feedback ? (
      <View style={styles.feedbackPanel}>
        <Text style={styles.feedback}>{snapshot.feedback}</Text>
      </View>
    ) : null}

    <View pointerEvents="box-none" style={styles.bottomRow}>
      <PowerButton
        icon="🛡️"
        label="SHIELD"
        charges={snapshot.shieldCharges}
        active={snapshot.ship.shieldSeconds > 0}
        onPress={onShield}
      />
      <View style={styles.missionChip}>
        <Text style={styles.missionText}>
          {snapshot.phase === 'boss'
            ? `BOSS ${snapshot.bossHealth}/${snapshot.bossMaxHealth}`
            : `MISSION ${snapshot.challengeNumber}/${snapshot.totalChallenges}`}
        </Text>
      </View>
      <PowerButton
        icon="🧲"
        label="MAGNET"
        charges={snapshot.magnetCharges}
        active={snapshot.ship.magnetSeconds > 0}
        onPress={onMagnet}
      />
    </View>
  </View>
);

const styles = StyleSheet.create({
  topRow: {
    position: 'absolute',
    top: 12,
    left: 18,
    right: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  heartsPanel: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#4C74C9',
    backgroundColor: '#07143DDD',
  },
  heart: {
    color: '#FF4D62',
    fontSize: 31,
    marginHorizontal: 2,
    textShadowColor: '#FFFFFF',
    textShadowRadius: 2,
  },
  heartEmpty: { color: '#6F7899' },
  promptPanel: {
    flex: 1,
    minHeight: 66,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 25,
    borderWidth: 3,
    borderColor: '#25D8FF',
    backgroundColor: '#07164DEA',
    paddingHorizontal: 20,
    shadowColor: '#A326FF',
    shadowOpacity: 0.8,
    shadowRadius: 10,
  },
  prompt: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  progress: { color: '#FFE85A', fontSize: 16, fontWeight: '800' },
  scorePanel: {
    minWidth: 135,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#6379B6',
    backgroundColor: '#07143DDD',
    paddingHorizontal: 15,
    paddingVertical: 9,
  },
  star: { color: '#FFD43B', fontSize: 28, marginRight: 7 },
  score: { color: '#FFFFFF', fontSize: 23, fontWeight: '900' },
  pauseButton: {
    height: 53,
    width: 53,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#5DDCFF',
    backgroundColor: '#1546B8EE',
  },
  pauseText: { color: '#FFFFFF', fontSize: 26, fontWeight: '900' },
  feedbackPanel: {
    position: 'absolute',
    top: 88,
    alignSelf: 'center',
    paddingHorizontal: 22,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: '#742CDAEE',
    borderWidth: 2,
    borderColor: '#E685FF',
  },
  feedback: { color: '#FFFFFF', fontSize: 20, fontWeight: '900' },
  bottomRow: {
    position: 'absolute',
    left: 22,
    right: 22,
    bottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  powerButton: {
    width: 105,
    minHeight: 78,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 25,
    borderWidth: 3,
    borderColor: '#4FE1FF',
    backgroundColor: '#082A6EEA',
  },
  powerActive: { borderColor: '#B7FF63', backgroundColor: '#176752EE' },
  powerDisabled: { opacity: 0.42 },
  pressed: { transform: [{ scale: 0.96 }] },
  powerIcon: { fontSize: 32 },
  powerLabel: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
  chargeBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    height: 30,
    minWidth: 30,
    paddingHorizontal: 6,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7B35D8',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  chargeText: { color: '#FFFFFF', fontWeight: '900', fontSize: 16 },
  missionChip: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: '#060B31C8',
    borderColor: '#536FC0',
    borderWidth: 1,
  },
  missionText: { color: '#B8CCFF', fontSize: 13, fontWeight: '800' },
});
