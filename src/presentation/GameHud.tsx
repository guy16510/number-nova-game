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

const Logo = () => (
  <View pointerEvents="none" style={s.logo}>
    <Text style={s.logoTop}>NUMBER</Text>
    <Text style={s.logoBottom}>NOVA</Text>
  </View>
);

const Heart = ({ filled }: { readonly filled: boolean }) => (
  <Text style={[s.heart, !filled && s.emptyHeart]}>{filled ? '♥' : '♡'}</Text>
);

const Power = ({
  type,
  label,
  charges,
  active,
  onPress,
}: {
  readonly type: 'shield' | 'boost';
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
    style={({ pressed }) => [s.power, active && s.powerActive, charges <= 0 && s.disabled, pressed && s.pressed]}
  >
    <View style={s.powerCircle}>
      <Text style={s.powerIcon}>{type === 'shield' ? '◈' : '▲'}</Text>
      <View style={s.badge}><Text style={s.badgeText}>{charges}</Text></View>
    </View>
    <Text style={s.powerLabel}>{label}</Text>
  </Pressable>
);

const FireControl = ({
  locked,
  coolingDown,
  onPress,
}: {
  readonly locked: boolean;
  readonly coolingDown: boolean;
  readonly onPress: () => void;
}) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel="Fire lasers"
    disabled={coolingDown}
    onPress={onPress}
    style={({ pressed }) => [
      s.fire,
      locked && s.fireLocked,
      coolingDown && s.fireCooling,
      pressed && s.firePressed,
    ]}
  >
    <View style={s.fireCore}>
      <Text style={s.fireIcon}>✦</Text>
    </View>
    <Text style={s.fireText}>{locked ? 'BLAST' : 'FIRE'}</Text>
  </Pressable>
);

const GameHudView = ({ snapshot, onPause, onShield, onMagnet, onFire }: Props) => {
  const { width } = useWindowDimensions();
  const compact = width < 900;
  const missionWidth = `${Math.max(6, Math.min(100, (snapshot.challengeNumber / snapshot.totalChallenges) * 100))}%` as `${number}%`;
  const locked = snapshot.lockTargetId !== null && snapshot.lockProgress >= 0.2;

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <View pointerEvents="none" style={s.leftStatus}>
        <Logo />
        <View style={s.hearts}>
          {[0, 1, 2].map((i) => <Heart key={i} filled={i < snapshot.ship.hearts} />)}
        </View>
      </View>

      <View pointerEvents="none" style={[s.prompt, compact && s.promptCompact]}>
        <Text adjustsFontSizeToFit numberOfLines={1} style={[s.promptText, compact && s.promptTextCompact]}>
          {snapshot.challenge.prompt}
        </Text>
        <View style={s.missionRow}>
          <View style={s.track}><View style={[s.fill, { width: missionWidth }]} /></View>
          <Text style={s.missionText}>
            {snapshot.phase === 'boss'
              ? `BOSS ${snapshot.bossHealth}/${snapshot.bossMaxHealth}`
              : `${snapshot.challengeNumber}/${snapshot.totalChallenges}`}
          </Text>
          {snapshot.challenge.kind === 'collect' ? (
            <Text style={s.collectProgress}>{snapshot.challenge.progress}/{snapshot.challenge.targetCount}</Text>
          ) : null}
        </View>
      </View>

      <View pointerEvents="none" style={s.scoreBlock}>
        <View style={s.score}>
          <Text style={s.scoreStar}>★</Text>
          <Text style={s.scoreText}>{snapshot.score.toLocaleString()}</Text>
        </View>
        {snapshot.combo > 1 ? <Text style={s.combo}>{snapshot.combo}x COMBO</Text> : null}
      </View>

      <Pressable accessibilityRole="button" accessibilityLabel="Pause" onPress={onPause} style={({ pressed }) => [s.pause, pressed && s.pressed]}>
        <Text style={s.pauseText}>Ⅱ</Text>
      </Pressable>

      {snapshot.feedback ? (
        <View pointerEvents="none" style={s.feedback}>
          <Text numberOfLines={1} style={s.feedbackText}>{snapshot.feedback}</Text>
        </View>
      ) : null}

      <View pointerEvents="box-none" style={s.leftControl}>
        <Power
          type="shield"
          label="BUBBLE SHIELD"
          charges={snapshot.shieldCharges}
          active={snapshot.ship.shieldSeconds > 0}
          onPress={onShield}
        />
      </View>

      <View pointerEvents="box-none" style={s.rightControls}>
        <FireControl locked={locked} coolingDown={snapshot.laser !== null} onPress={onFire} />
        <Power
          type="boost"
          label="ROCKET BOOST"
          charges={snapshot.magnetCharges}
          active={snapshot.ship.magnetSeconds > 0}
          onPress={onMagnet}
        />
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
    && a.score === b.score
    && a.combo === b.combo
    && a.ship.hearts === b.ship.hearts
    && (a.ship.shieldSeconds > 0) === (b.ship.shieldSeconds > 0)
    && (a.ship.magnetSeconds > 0) === (b.ship.magnetSeconds > 0)
    && a.shieldCharges === b.shieldCharges
    && a.magnetCharges === b.magnetCharges
    && a.challengeNumber === b.challengeNumber
    && a.totalChallenges === b.totalChallenges
    && a.bossHealth === b.bossHealth
    && a.feedback === b.feedback
    && a.lockTargetId === b.lockTargetId
    && Math.floor(a.lockProgress * 5) === Math.floor(b.lockProgress * 5)
    && (a.laser !== null) === (b.laser !== null);
};

export const GameHud = React.memo(GameHudView, sameHudState);

const s = StyleSheet.create({
  leftStatus: {
    position: 'absolute',
    left: 12,
    top: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 82,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-4deg' }],
  },
  logoTop: {
    color: '#FFE24A',
    fontSize: 12,
    lineHeight: 13,
    fontWeight: '900',
    letterSpacing: 1,
    textShadowColor: '#FF6A16',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  logoBottom: {
    color: '#77ECFF',
    fontSize: 24,
    lineHeight: 25,
    fontWeight: '900',
    letterSpacing: 0.8,
    textShadowColor: '#253CFF',
    textShadowOffset: { width: 1, height: 2 },
    textShadowRadius: 4,
  },
  hearts: {
    height: 34,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    marginLeft: 5,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: '#6573A4',
    backgroundColor: '#080D2FC2',
  },
  heart: {
    color: '#FF4057',
    fontSize: 25,
    lineHeight: 27,
    fontWeight: '900',
    marginHorizontal: 1,
    textShadowColor: '#FFFFFF',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  emptyHeart: { color: '#5E688D', opacity: 0.45 },
  prompt: {
    position: 'absolute',
    top: 7,
    left: '29%',
    width: '42%',
    minHeight: 52,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#1DDBFF',
    backgroundColor: '#071348D9',
    paddingHorizontal: 18,
    paddingTop: 4,
    paddingBottom: 5,
  },
  promptCompact: { left: '26%', width: '46%', minHeight: 48 },
  promptText: {
    color: '#FFFFFF',
    fontSize: 25,
    lineHeight: 29,
    fontWeight: '900',
    letterSpacing: 0.3,
    textShadowColor: '#000000',
    textShadowOffset: { width: 1, height: 2 },
    textShadowRadius: 4,
  },
  promptTextCompact: { fontSize: 21, lineHeight: 25 },
  missionRow: { flexDirection: 'row', alignItems: 'center', marginTop: 1 },
  track: { width: 118, height: 4, borderRadius: 2, backgroundColor: '#1E2858', overflow: 'hidden' },
  fill: { height: 4, borderRadius: 2, backgroundColor: '#51E7FF' },
  missionText: { color: '#C7D5FF', fontSize: 9, fontWeight: '900', letterSpacing: 0.5, marginLeft: 7 },
  collectProgress: { color: '#FFE85A', fontSize: 9, fontWeight: '900', marginLeft: 7 },
  scoreBlock: { position: 'absolute', right: 68, top: 8, alignItems: 'center' },
  score: {
    minWidth: 112,
    height: 43,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#69739F',
    backgroundColor: '#090D2ED9',
    paddingHorizontal: 10,
  },
  scoreStar: { color: '#FFD43B', fontSize: 23, marginRight: 6, textShadowColor: '#FF9F1F', textShadowRadius: 3 },
  scoreText: { color: '#FFFFFF', fontSize: 18, fontWeight: '900' },
  combo: {
    color: '#FFEC69',
    fontSize: 11,
    fontWeight: '900',
    marginTop: 2,
    textShadowColor: '#FF5522',
    textShadowRadius: 4,
  },
  pause: {
    position: 'absolute',
    top: 8,
    right: 12,
    height: 43,
    width: 43,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#64E4FF',
    backgroundColor: '#164BCBDD',
  },
  pauseText: { color: '#FFFFFF', fontSize: 22, lineHeight: 24, fontWeight: '900' },
  feedback: {
    position: 'absolute',
    top: 65,
    alignSelf: 'center',
    maxWidth: '38%',
    borderRadius: 13,
    borderWidth: 2,
    borderColor: '#E685FF',
    backgroundColor: '#742CDACF',
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  feedbackText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
  leftControl: { position: 'absolute', left: 13, bottom: 9 },
  rightControls: {
    position: 'absolute',
    right: 12,
    bottom: 8,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  power: { width: 92, height: 82, alignItems: 'center', justifyContent: 'flex-end' },
  powerActive: { transform: [{ scale: 1.03 }] },
  disabled: { opacity: 0.42 },
  pressed: { transform: [{ scale: 0.96 }] },
  powerCircle: {
    position: 'absolute',
    top: 0,
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 3,
    borderColor: '#5DE8FF',
    backgroundColor: '#093485E8',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1BCBFF',
    shadowOpacity: 0.75,
    shadowRadius: 7,
  },
  powerIcon: { color: '#FFFFFF', fontSize: 28, fontWeight: '900' },
  badge: {
    position: 'absolute',
    top: -6,
    right: -7,
    height: 24,
    minWidth: 24,
    paddingHorizontal: 4,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7734D5',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  badgeText: { color: '#FFFFFF', fontWeight: '900', fontSize: 12 },
  powerLabel: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#6676B2',
    backgroundColor: '#070B28E8',
    paddingHorizontal: 6,
    paddingVertical: 3,
    overflow: 'hidden',
  },
  fire: {
    width: 94,
    height: 94,
    borderRadius: 47,
    borderWidth: 4,
    borderColor: '#48E7FF',
    backgroundColor: '#123C9AEF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#32DFFF',
    shadowOpacity: 0.9,
    shadowRadius: 10,
  },
  fireLocked: { borderColor: '#FFF36A', backgroundColor: '#D93635F2', shadowColor: '#FF532B' },
  fireCooling: { opacity: 0.72 },
  firePressed: { transform: [{ scale: 0.93 }] },
  fireCore: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#031337B8',
    borderWidth: 2,
    borderColor: '#FFFFFFAA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fireIcon: { color: '#FFFFFF', fontSize: 31, lineHeight: 34, fontWeight: '900' },
  fireText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900', letterSpacing: 1.1, marginTop: 1 },
});
