import React from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import type { GameSnapshot } from '../domain/types';

interface Props {
  readonly snapshot: GameSnapshot;
  readonly onPause: () => void;
  readonly onShield: () => void;
  readonly onMagnet: () => void;
  readonly onFire: () => void;
}

const Heart = ({ filled }: { readonly filled: boolean }) => (
  <Text style={[styles.heart, !filled && styles.emptyHeart]}>{filled ? '♥' : '♡'}</Text>
);

const PowerButton = ({
  icon,
  label,
  charges,
  active,
  onPress,
}: {
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
    style={({ pressed }: { pressed: boolean }) => [styles.powerButton, active && styles.powerActive, charges <= 0 && styles.disabled, pressed && styles.pressed]}
  >
    <View style={styles.powerCircle}>
      <Text style={styles.powerIcon}>{icon}</Text>
      <View style={styles.badge}><Text style={styles.badgeText}>{charges}</Text></View>
    </View>
    <Text style={styles.powerLabel}>{label}</Text>
  </Pressable>
);

const FireButton = ({ snapshot, onPress }: { readonly snapshot: GameSnapshot; readonly onPress: () => void }) => {
  const locked = snapshot.lockTargetId !== null && snapshot.lockProgress >= 0.18;
  const coolingDown = snapshot.laser !== null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Fire lasers"
      disabled={coolingDown}
      onPress={onPress}
      style={({ pressed }: { pressed: boolean }) => [
        styles.fire,
        locked && styles.fireLocked,
        coolingDown && styles.fireCooling,
        pressed && styles.firePressed,
      ]}
    >
      <View style={styles.fireCore}><Text style={styles.fireIcon}>{snapshot.ship.weapon === 'comet-missile' ? '🚀' : '✦'}</Text></View>
      <Text style={styles.fireText}>{locked ? 'BLAST' : 'FIRE'}</Text>
    </Pressable>
  );
};

const GameHudView = ({ snapshot, onPause, onShield, onMagnet, onFire }: Props) => {
  const { width } = useWindowDimensions();
  const compact = width < 900;
  const missionProgress = snapshot.phase === 'boss'
    ? ((snapshot.bossMaxHealth - snapshot.bossHealth) / snapshot.bossMaxHealth) * 100
    : ((snapshot.challengeNumber - 1 + snapshot.challenge.progress / snapshot.challenge.targetCount) / snapshot.totalChallenges) * 100;
  const missionWidth = `${Math.max(4, Math.min(100, missionProgress))}%` as `${number}%`;
  const weaponName = snapshot.ship.weapon === 'nova-blaster'
    ? 'NOVA BLASTER'
    : snapshot.ship.weapon.replace('-', ' ').toUpperCase();

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <View pointerEvents="none" style={styles.leftStatus}>
        <View style={styles.logo}>
          <Text style={styles.logoTop}>NUMBER</Text>
          <Text style={styles.logoBottom}>NOVA</Text>
        </View>
        <View style={styles.hearts}>{[0, 1, 2].map((index) => <Heart key={index} filled={index < snapshot.ship.hearts} />)}</View>
      </View>

      <View pointerEvents="none" style={[styles.prompt, compact && styles.promptCompact]}>
        <Text adjustsFontSizeToFit numberOfLines={1} style={[styles.promptText, compact && styles.promptTextCompact]}>
          {snapshot.challenge.prompt}
        </Text>
        <View style={styles.missionRow}>
          <View style={styles.track}><View style={[styles.fill, { width: missionWidth }]} /></View>
          <Text style={styles.missionText}>
            {snapshot.phase === 'boss'
              ? `BOSS STAGE ${snapshot.bossStage} • ${snapshot.bossHealth}/${snapshot.bossMaxHealth}`
              : `${snapshot.challengeNumber}/${snapshot.totalChallenges} • MATH LV ${snapshot.challenge.mathLevel + 1}`}
          </Text>
          {snapshot.challenge.targetCount > 1 ? (
            <Text style={styles.collectProgress}>{snapshot.challenge.progress}/{snapshot.challenge.targetCount}</Text>
          ) : null}
        </View>
        <Text numberOfLines={1} style={styles.waveText}>{snapshot.waveName}</Text>
      </View>

      <View pointerEvents="none" style={styles.scoreBlock}>
        <View style={styles.score}>
          <Text style={styles.scoreStar}>★</Text>
          <Text style={styles.scoreText}>{snapshot.score.toLocaleString()}</Text>
        </View>
        <View style={styles.microRow}>
          {snapshot.combo > 1 ? <Text style={styles.combo}>{snapshot.combo}x COMBO</Text> : null}
          <Text style={styles.accuracy}>{Math.round(snapshot.accuracy * 100)}%</Text>
        </View>
      </View>

      <Pressable accessibilityRole="button" accessibilityLabel="Pause" onPress={onPause} style={({ pressed }: { pressed: boolean }) => [styles.pause, pressed && styles.pressed]}>
        <Text style={styles.pauseText}>Ⅱ</Text>
      </Pressable>

      {snapshot.feedback ? (
        <View pointerEvents="none" style={styles.feedback}>
          <Text numberOfLines={1} style={styles.feedbackText}>{snapshot.feedback}</Text>
        </View>
      ) : null}

      {snapshot.ship.weapon !== 'nova-blaster' ? (
        <View pointerEvents="none" style={styles.weaponBanner}>
          <Text style={styles.weaponText}>{weaponName} • {Math.ceil(snapshot.ship.weaponSeconds)}s</Text>
        </View>
      ) : null}

      <View pointerEvents="box-none" style={styles.leftControl}>
        <PowerButton icon="◈" label="BUBBLE SHIELD" charges={snapshot.shieldCharges} active={snapshot.ship.shieldSeconds > 0} onPress={onShield} />
      </View>

      <View pointerEvents="box-none" style={styles.rightControls}>
        <FireButton snapshot={snapshot} onPress={onFire} />
        <PowerButton icon="▲" label="ROCKET BOOST" charges={snapshot.magnetCharges} active={snapshot.ship.magnetSeconds > 0} onPress={onMagnet} />
      </View>
    </View>
  );
};

const sameHudState = (previous: Readonly<Props>, next: Readonly<Props>): boolean => {
  const a = previous.snapshot;
  const b = next.snapshot;
  return previous.onPause === next.onPause
    && previous.onShield === next.onShield
    && previous.onMagnet === next.onMagnet
    && previous.onFire === next.onFire
    && a.phase === b.phase
    && a.challenge.id === b.challenge.id
    && a.challenge.prompt === b.challenge.prompt
    && a.challenge.progress === b.challenge.progress
    && a.challenge.mathLevel === b.challenge.mathLevel
    && a.score === b.score
    && a.combo === b.combo
    && Math.round(a.accuracy * 100) === Math.round(b.accuracy * 100)
    && a.ship.hearts === b.ship.hearts
    && a.ship.weapon === b.ship.weapon
    && Math.ceil(a.ship.weaponSeconds) === Math.ceil(b.ship.weaponSeconds)
    && (a.ship.shieldSeconds > 0) === (b.ship.shieldSeconds > 0)
    && (a.ship.magnetSeconds > 0) === (b.ship.magnetSeconds > 0)
    && a.shieldCharges === b.shieldCharges
    && a.magnetCharges === b.magnetCharges
    && a.challengeNumber === b.challengeNumber
    && a.totalChallenges === b.totalChallenges
    && a.bossHealth === b.bossHealth
    && a.bossStage === b.bossStage
    && a.feedback === b.feedback
    && a.waveName === b.waveName
    && a.lockTargetId === b.lockTargetId
    && Math.floor(a.lockProgress * 5) === Math.floor(b.lockProgress * 5)
    && (a.laser !== null) === (b.laser !== null);
};

export const GameHud = React.memo(GameHudView, sameHudState);

const styles = StyleSheet.create({
  leftStatus: { position: 'absolute', left: 12, top: 8, flexDirection: 'row', alignItems: 'center' },
  logo: { width: 82, height: 46, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-4deg' }] },
  logoTop: { color: '#FFE24A', fontSize: 12, lineHeight: 13, fontWeight: '900', letterSpacing: 1, textShadowColor: '#FF6A16', textShadowRadius: 2 },
  logoBottom: { color: '#77ECFF', fontSize: 24, lineHeight: 25, fontWeight: '900', letterSpacing: 0.8, textShadowColor: '#253CFF', textShadowRadius: 4 },
  hearts: { height: 34, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 7, marginLeft: 5, borderRadius: 17, borderWidth: 2, borderColor: '#6573A4', backgroundColor: '#080D2FC2' },
  heart: { color: '#FF4057', fontSize: 25, lineHeight: 27, fontWeight: '900', marginHorizontal: 1, textShadowColor: '#FFFFFF', textShadowRadius: 2 },
  emptyHeart: { color: '#5E688D', opacity: 0.45 },
  prompt: { position: 'absolute', top: 7, left: '27%', width: '46%', minHeight: 62, justifyContent: 'center', alignItems: 'center', borderRadius: 18, borderWidth: 2, borderColor: '#1DDBFF', backgroundColor: '#071348DE', paddingHorizontal: 18, paddingTop: 4, paddingBottom: 4 },
  promptCompact: { left: '24%', width: '50%', minHeight: 58 },
  promptText: { color: '#FFFFFF', fontSize: 25, lineHeight: 29, fontWeight: '900', letterSpacing: 0.3, textShadowColor: '#000000', textShadowRadius: 4 },
  promptTextCompact: { fontSize: 20, lineHeight: 24 },
  missionRow: { flexDirection: 'row', alignItems: 'center', marginTop: 1 },
  track: { width: 112, height: 4, borderRadius: 2, backgroundColor: '#1E2858', overflow: 'hidden' },
  fill: { height: 4, borderRadius: 2, backgroundColor: '#51E7FF' },
  missionText: { color: '#C7D5FF', fontSize: 9, fontWeight: '900', letterSpacing: 0.35, marginLeft: 7 },
  collectProgress: { color: '#FFE85A', fontSize: 9, fontWeight: '900', marginLeft: 7 },
  waveText: { color: '#83F1FF', fontSize: 9, fontWeight: '800', letterSpacing: 0.8, marginTop: 1 },
  scoreBlock: { position: 'absolute', right: 68, top: 8, alignItems: 'center' },
  score: { minWidth: 112, height: 43, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', borderRadius: 22, borderWidth: 2, borderColor: '#69739F', backgroundColor: '#090D2ED9', paddingHorizontal: 10 },
  scoreStar: { color: '#FFD43B', fontSize: 23, marginRight: 6, textShadowColor: '#FF9F1F', textShadowRadius: 3 },
  scoreText: { color: '#FFFFFF', fontSize: 18, fontWeight: '900' },
  microRow: { flexDirection: 'row', gap: 7, marginTop: 2 },
  combo: { color: '#FFEC69', fontSize: 10, fontWeight: '900', textShadowColor: '#FF5522', textShadowRadius: 4 },
  accuracy: { color: '#91E9FF', fontSize: 10, fontWeight: '900' },
  pause: { position: 'absolute', top: 8, right: 12, height: 43, width: 43, borderRadius: 13, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#64E4FF', backgroundColor: '#164BCBDD' },
  pauseText: { color: '#FFFFFF', fontSize: 22, lineHeight: 24, fontWeight: '900' },
  feedback: { position: 'absolute', top: 77, alignSelf: 'center', maxWidth: '43%', borderRadius: 13, borderWidth: 2, borderColor: '#E685FF', backgroundColor: '#742CDACF', paddingHorizontal: 14, paddingVertical: 4 },
  feedbackText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
  weaponBanner: { position: 'absolute', bottom: 12, alignSelf: 'center', borderRadius: 14, borderWidth: 2, borderColor: '#FFF47A', backgroundColor: '#501878D8', paddingHorizontal: 14, paddingVertical: 5 },
  weaponText: { color: '#FFFFFF', fontSize: 11, fontWeight: '900', letterSpacing: 0.8 },
  leftControl: { position: 'absolute', left: 13, bottom: 9 },
  rightControls: { position: 'absolute', right: 12, bottom: 8, flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  powerButton: { width: 92, height: 82, alignItems: 'center', justifyContent: 'flex-end' },
  powerActive: { transform: [{ scale: 1.03 }] },
  disabled: { opacity: 0.42 },
  pressed: { transform: [{ scale: 0.96 }] },
  powerCircle: { position: 'absolute', top: 0, width: 58, height: 58, borderRadius: 29, borderWidth: 3, borderColor: '#5DE8FF', backgroundColor: '#093485E8', alignItems: 'center', justifyContent: 'center', shadowColor: '#1BCBFF', shadowOpacity: 0.75, shadowRadius: 7 },
  powerIcon: { color: '#FFFFFF', fontSize: 28, fontWeight: '900' },
  badge: { position: 'absolute', top: -6, right: -7, height: 24, minWidth: 24, paddingHorizontal: 4, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#7734D5', borderWidth: 2, borderColor: '#FFFFFF' },
  badgeText: { color: '#FFFFFF', fontWeight: '900', fontSize: 12 },
  powerLabel: { color: '#FFFFFF', fontSize: 9, fontWeight: '900', borderRadius: 8, borderWidth: 1.5, borderColor: '#6676B2', backgroundColor: '#070B28E8', paddingHorizontal: 6, paddingVertical: 3, overflow: 'hidden' },
  fire: { width: 94, height: 94, borderRadius: 47, borderWidth: 4, borderColor: '#48E7FF', backgroundColor: '#123C9AEF', alignItems: 'center', justifyContent: 'center', shadowColor: '#32DFFF', shadowOpacity: 0.9, shadowRadius: 10 },
  fireLocked: { borderColor: '#FFF36A', backgroundColor: '#D93635F2', shadowColor: '#FF532B' },
  fireCooling: { opacity: 0.72 },
  firePressed: { transform: [{ scale: 0.93 }] },
  fireCore: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#031337B8', borderWidth: 2, borderColor: '#FFFFFFAA', alignItems: 'center', justifyContent: 'center' },
  fireIcon: { color: '#FFFFFF', fontSize: 29, lineHeight: 34, fontWeight: '900' },
  fireText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900', letterSpacing: 1.1, marginTop: 1 },
});
