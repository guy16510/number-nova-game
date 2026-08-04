import React from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import type { GameSnapshot } from '../domain/types';

interface Props {
  readonly snapshot: GameSnapshot;
  readonly onPause: () => void;
  readonly onShield: () => void;
  readonly onMagnet: () => void;
}

const Logo = () => (
  <View pointerEvents="none" style={s.logo}>
    <Text style={s.logoTop}>NUMBER</Text>
    <Text style={s.logoBottom}>NOVA</Text>
    <View style={s.orbit} />
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
      {type === 'shield' ? (
        <View style={s.shield}><View style={s.shieldShine} /></View>
      ) : (
        <View style={s.rocket}><View style={s.window} /><View style={s.flame} /></View>
      )}
      <View style={s.badge}><Text style={s.badgeText}>{charges}</Text></View>
    </View>
    <View style={s.labelPlate}><Text style={s.powerLabel}>{label}</Text></View>
  </Pressable>
);

export const GameHud = ({ snapshot, onPause, onShield, onMagnet }: Props) => {
  const { width } = useWindowDimensions();
  const compact = width < 900;
  const missionWidth = `${Math.max(6, Math.min(100, (snapshot.challengeNumber / snapshot.totalChallenges) * 100))}%` as `${number}%`;

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <Logo />

      <View pointerEvents="none" style={[s.hearts, compact && s.heartsCompact]}>
        {[0, 1, 2].map((i) => <Heart key={i} filled={i < snapshot.ship.hearts} />)}
      </View>

      <View pointerEvents="none" style={[s.prompt, compact && s.promptCompact]}>
        <Text adjustsFontSizeToFit numberOfLines={1} style={[s.promptText, compact && s.promptTextCompact]}>
          {snapshot.challenge.prompt}
        </Text>
        {snapshot.challenge.kind === 'collect' ? (
          <Text style={s.progress}>{snapshot.challenge.progress} / {snapshot.challenge.targetCount}</Text>
        ) : null}
      </View>

      <View pointerEvents="none" style={[s.score, compact && s.scoreCompact]}>
        <Text style={s.scoreStar}>★</Text>
        <Text style={s.scoreText}>{snapshot.score.toLocaleString()}</Text>
      </View>

      <Pressable accessibilityRole="button" accessibilityLabel="Pause" onPress={onPause} style={({ pressed }) => [s.pause, pressed && s.pressed]}>
        <Text style={s.pauseText}>Ⅱ</Text>
      </Pressable>

      {snapshot.feedback ? (
        <View pointerEvents="none" style={s.feedback}>
          <Text numberOfLines={1} style={s.feedbackText}>{snapshot.feedback}</Text>
        </View>
      ) : null}

      <View pointerEvents="box-none" style={s.bottom}>
        <Power type="shield" label="BUBBLE SHIELD" charges={snapshot.shieldCharges} active={snapshot.ship.shieldSeconds > 0} onPress={onShield} />
        <View pointerEvents="none" style={s.mission}>
          <View style={s.track}><View style={[s.fill, { width: missionWidth }]} /></View>
          <Text style={s.missionText}>
            {snapshot.phase === 'boss'
              ? `BOSS CORE ${snapshot.bossHealth}/${snapshot.bossMaxHealth}`
              : `MISSION ${snapshot.challengeNumber} OF ${snapshot.totalChallenges}`}
          </Text>
        </View>
        <Power type="boost" label="ROCKET BOOST" charges={snapshot.magnetCharges} active={snapshot.ship.magnetSeconds > 0} onPress={onMagnet} />
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  logo: {
    position: 'absolute',
    left: 15,
    top: 8,
    width: 112,
    height: 66,
    alignItems: 'center',
    transform: [{ rotate: '-4deg' }],
  },
  logoTop: {
    color: '#FFE24A',
    fontSize: 18,
    lineHeight: 20,
    fontWeight: '900',
    letterSpacing: 1.2,
    textShadowColor: '#FF6A16',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 3,
    zIndex: 3,
  },
  logoBottom: {
    color: '#77ECFF',
    fontSize: 33,
    lineHeight: 34,
    fontWeight: '900',
    letterSpacing: 1,
    textShadowColor: '#253CFF',
    textShadowOffset: { width: 1, height: 3 },
    textShadowRadius: 5,
    zIndex: 3,
  },
  orbit: {
    position: 'absolute',
    left: 3,
    right: 3,
    bottom: 2,
    height: 20,
    borderWidth: 3,
    borderColor: '#C852FF',
    borderRadius: 60,
    transform: [{ rotate: '-8deg' }],
    opacity: 0.8,
  },
  hearts: {
    position: 'absolute',
    top: 76,
    left: 17,
    minWidth: 120,
    height: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    borderRadius: 19,
    borderWidth: 2,
    borderColor: '#6E75A8',
    backgroundColor: '#080D2FCF',
  },
  heartsCompact: { top: 66, minWidth: 108, height: 34 },
  heart: {
    color: '#FF4057',
    fontSize: 29,
    lineHeight: 31,
    fontWeight: '900',
    marginHorizontal: 1,
    textShadowColor: '#FFFFFF',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  emptyHeart: { color: '#5E688D', opacity: 0.45 },
  prompt: {
    position: 'absolute',
    top: 9,
    left: '28%',
    width: '44%',
    minHeight: 62,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
    borderWidth: 3,
    borderColor: '#1DDBFF',
    backgroundColor: '#071348DB',
    paddingHorizontal: 22,
    shadowColor: '#A326FF',
    shadowOpacity: 0.7,
    shadowRadius: 10,
  },
  promptCompact: { left: '25%', width: '48%', minHeight: 54 },
  promptText: {
    color: '#FFFFFF',
    fontSize: 31,
    lineHeight: 36,
    fontWeight: '900',
    letterSpacing: 0.4,
    textShadowColor: '#000000',
    textShadowOffset: { width: 1, height: 2 },
    textShadowRadius: 4,
  },
  promptTextCompact: { fontSize: 25, lineHeight: 30 },
  progress: { color: '#FFE85A', fontSize: 13, fontWeight: '900' },
  score: {
    position: 'absolute',
    right: 68,
    top: 10,
    minWidth: 132,
    height: 51,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 26,
    borderWidth: 2,
    borderColor: '#69739F',
    backgroundColor: '#090D2ED9',
    paddingHorizontal: 12,
  },
  scoreCompact: { minWidth: 112 },
  scoreStar: { color: '#FFD43B', fontSize: 27, marginRight: 8, textShadowColor: '#FF9F1F', textShadowRadius: 3 },
  scoreText: { color: '#FFFFFF', fontSize: 21, fontWeight: '900' },
  pause: {
    position: 'absolute',
    top: 10,
    right: 12,
    height: 50,
    width: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#64E4FF',
    backgroundColor: '#164BCBDD',
    shadowColor: '#37D7FF',
    shadowOpacity: 0.7,
    shadowRadius: 6,
  },
  pauseText: { color: '#FFFFFF', fontSize: 25, lineHeight: 28, fontWeight: '900' },
  feedback: {
    position: 'absolute',
    top: 76,
    alignSelf: 'center',
    maxWidth: '36%',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#E685FF',
    backgroundColor: '#742CDAD9',
    paddingHorizontal: 16,
    paddingVertical: 5,
  },
  feedbackText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
  bottom: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  power: { width: 112, height: 104, alignItems: 'center', justifyContent: 'flex-end' },
  powerActive: { transform: [{ scale: 1.04 }] },
  disabled: { opacity: 0.43 },
  pressed: { transform: [{ scale: 0.96 }] },
  powerCircle: {
    position: 'absolute',
    top: 0,
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    borderColor: '#5DE8FF',
    backgroundColor: '#093485E8',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1BCBFF',
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },
  shield: {
    width: 37,
    height: 43,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderBottomLeftRadius: 19,
    borderBottomRightRadius: 19,
    borderWidth: 4,
    borderColor: '#D9FCFF',
    backgroundColor: '#1BB8FF',
    transform: [{ scaleX: 0.86 }],
    overflow: 'hidden',
  },
  shieldShine: { position: 'absolute', left: 5, top: 4, width: 9, height: 30, borderRadius: 7, backgroundColor: '#FFFFFF77' },
  rocket: {
    width: 27,
    height: 46,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    borderBottomLeftRadius: 7,
    borderBottomRightRadius: 7,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    backgroundColor: '#EC3E3A',
    transform: [{ rotate: '42deg' }],
    alignItems: 'center',
  },
  window: { marginTop: 8, width: 11, height: 11, borderRadius: 6, backgroundColor: '#57E9FF', borderWidth: 2, borderColor: '#FFFFFF' },
  flame: { position: 'absolute', bottom: -13, width: 13, height: 17, borderBottomLeftRadius: 7, borderBottomRightRadius: 7, backgroundColor: '#FFE348', borderWidth: 2, borderColor: '#FF8F21' },
  badge: {
    position: 'absolute',
    top: -7,
    right: -8,
    height: 27,
    minWidth: 27,
    paddingHorizontal: 4,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7734D5',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  badgeText: { color: '#FFFFFF', fontWeight: '900', fontSize: 14 },
  labelPlate: {
    minWidth: 104,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#6676B2',
    backgroundColor: '#070B28E8',
    paddingHorizontal: 6,
    paddingVertical: 4,
    alignItems: 'center',
  },
  powerLabel: { color: '#FFFFFF', fontSize: 10, fontWeight: '900' },
  mission: {
    minWidth: 160,
    marginBottom: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#060B31C7',
    borderColor: '#536FC0',
    borderWidth: 2,
    alignItems: 'center',
  },
  track: { width: 136, height: 6, borderRadius: 3, backgroundColor: '#1E2858', overflow: 'hidden', marginBottom: 4 },
  fill: { height: 6, borderRadius: 3, backgroundColor: '#51E7FF' },
  missionText: { color: '#C7D5FF', fontSize: 10, fontWeight: '900', letterSpacing: 0.6 },
});
